import { Router } from 'express';
import { getPrisma } from '../lib/prisma';
import { processedComplaintQueueService } from '../lib/redis/processedComplaintQueueService';
import { blockchainQueueService } from '../lib/redis/blockchainQueueService';
import type { BlockchainQueueData } from '../lib/redis/blockchainQueueService';

const router = Router();

let isAutoAssignPolling = false;
let autoAssignPollingInterval: NodeJS.Timeout | null = null;

// ─── Department routing lists ────────────────────────────────────────────────

/** Departments routed to field agents */
const AGENT_DEPARTMENTS_AUTO = [
  'INFRASTRUCTURE',
  'WATER_SUPPLY_SANITATION',
  'ELECTRICITY_POWER',
  'MUNICIPAL_SERVICES',
  'ENVIRONMENT',
  'POLICE_SERVICES',
] as const;

/** Departments routed directly to municipal admins */
const MUNICIPAL_ADMIN_DEPARTMENTS_AUTO = [
  'EDUCATION',
  'REVENUE',
  'HEALTH',
  'TRANSPORTATION',
  'HOUSING_URBAN_DEVELOPMENT',
  'SOCIAL_WELFARE',
  'PUBLIC_GRIEVANCES',
] as const;

/**
 * Auto-assign a complaint from the processed queue.
 *
 * Pops the next complaint from the processed queue, determines its district,
 * and assigns it to an available agent (agent departments) or municipal admin
 * (municipal-admin departments). Pushes a blockchain record on success.
 */
export async function autoAssignComplaint(): Promise<{
  success: boolean;
  message: string;
  complaintId?: string;
  assignedTo?: { type: 'agent' | 'municipal_admin'; id: string; name: string };
}> {
  const prisma = getPrisma();

  // 1. Pop complaint from processed queue
  const complaintData = await processedComplaintQueueService.popFromQueue();

  if (!complaintData) {
    return { success: false, message: 'No complaints in processed queue' };
  }

  const { id, assignedDepartment, district: queueDistrict } = complaintData;

  console.log(`[AutoAssign] Processing complaint id=${id}, dept=${assignedDepartment}, district=${queueDistrict}`);

  // 2. Fetch the complaint from the database
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: { location: true },
  });

  if (!complaint) {
    console.warn(`[AutoAssign] Complaint ${id} not found in database`);
    return { success: false, message: `Complaint ${id} not found`, complaintId: id };
  }

  // 3. Determine the effective district (prefer complaint location, fall back to queue value)
  const district = complaint.location?.district || queueDistrict;

  if (!district) {
    console.warn(`[AutoAssign] Complaint ${id} has no district`);
    return { success: false, message: `Complaint ${id} has no district`, complaintId: id };
  }

  // 4a. Agent department → find and assign a random available agent
  if ((AGENT_DEPARTMENTS_AUTO as readonly string[]).includes(assignedDepartment)) {
    const agents = await prisma.agent.findMany({
      where: {
        municipality: { equals: district, mode: 'insensitive' },
        status: 'ACTIVE',
      },
    });

    const availableAgents = agents.filter((a: any) => a.currentWorkload < a.workloadLimit);

    if (availableAgents.length === 0) {
      return {
        success: false,
        message: `No available agents in ${district}`,
        complaintId: id,
      };
    }

    // Pick a random available agent
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const agent = availableAgents[Math.floor(Math.random() * availableAgents.length)]!;

    await prisma.$transaction([
      prisma.complaint.update({
        where: { id },
        data: { assignedAgentId: agent.id, status: 'UNDER_PROCESSING' },
      }),
      prisma.agent.update({
        where: { id: agent.id },
        data: { currentWorkload: { increment: 1 } },
      }),
    ]);

    const blockchainData: BlockchainQueueData = {
      id,
      seq: complaint.seq,
      status: 'UNDER_PROCESSING',
      categoryId: complaint.categoryId,
      subCategory: complaint.subCategory,
      assignedDepartment,
      city: complaint.location?.city || '',
      district,
      assignedTo: { type: 'agent', id: agent.id, name: agent.fullName },
      assignedAt: new Date().toISOString(),
    };
    await blockchainQueueService.pushToQueue(blockchainData);

    console.log(`[AutoAssign] Complaint ${id} → agent ${agent.fullName} (${district})`);
    return {
      success: true,
      message: `Assigned to agent ${agent.fullName}`,
      complaintId: id,
      assignedTo: { type: 'agent', id: agent.id, name: agent.fullName },
    };
  }

  // 4b. Municipal-admin department → find and assign the least-loaded available admin
  if ((MUNICIPAL_ADMIN_DEPARTMENTS_AUTO as readonly string[]).includes(assignedDepartment)) {
    const admins = await prisma.departmentMunicipalAdmin.findMany({
      where: {
        municipality: { equals: district, mode: 'insensitive' },
        status: 'ACTIVE',
      },
    });

    const availableAdmins = admins.filter((a: any) => a.currentWorkload < a.workloadLimit);

    if (availableAdmins.length === 0) {
      return {
        success: false,
        message: `No available municipal admins in ${district}`,
        complaintId: id,
      };
    }

    // Pick the least-loaded admin
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const admin = availableAdmins.reduce((a: any, b: any) =>
      a.currentWorkload <= b.currentWorkload ? a : b
    ) as NonNullable<typeof availableAdmins[0]>;

    await prisma.$transaction([
      prisma.complaint.update({
        where: { id },
        data: {
          managedByMunicipalAdminId: admin.id,
          escalationLevel: 'MUNICIPAL_ADMIN',
          status: 'UNDER_PROCESSING',
        },
      }),
      prisma.departmentMunicipalAdmin.update({
        where: { id: admin.id },
        data: { currentWorkload: { increment: 1 } },
      }),
    ]);

    const blockchainData: BlockchainQueueData = {
      id,
      seq: complaint.seq,
      status: 'UNDER_PROCESSING',
      categoryId: complaint.categoryId,
      subCategory: complaint.subCategory,
      assignedDepartment,
      city: complaint.location?.city || '',
      district,
      assignedTo: { type: 'municipal_admin', id: admin.id, name: admin.fullName },
      assignedAt: new Date().toISOString(),
    };
    await blockchainQueueService.pushToQueue(blockchainData);

    console.log(`[AutoAssign] Complaint ${id} → municipal admin ${admin.fullName} (${district})`);
    return {
      success: true,
      message: `Assigned to municipal admin ${admin.fullName}`,
      complaintId: id,
      assignedTo: { type: 'municipal_admin', id: admin.id, name: admin.fullName },
    };
  }

  // 4c. Unknown department
  console.warn(`[AutoAssign] Unknown department ${assignedDepartment} for complaint ${id}`);
  return {
    success: false,
    message: `Unknown department: ${assignedDepartment}`,
    complaintId: id,
  };
}

/**
 * Process multiple complaints from the queue
 */
export async function processAutoAssignBatch(limit: number = 10): Promise<{
  processed: number;
  successful: number;
  failed: number;
  results: Array<ReturnType<typeof autoAssignComplaint> extends Promise<infer T> ? T : never>;
}> {
  const results: Array<Awaited<ReturnType<typeof autoAssignComplaint>>> = [];
  let processed = 0;
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < limit; i++) {
    const result = await autoAssignComplaint();

    if (result.message === 'No complaints in processed queue') {
      // Queue is empty, stop processing
      break;
    }

    results.push(result);
    processed++;

    if (result.success) {
      successful++;
    } else {
      failed++;
    }
  }

  return { processed, successful, failed, results };
}

// --- API ROUTES ---

/**
 * POST /auto-assign/single
 * Process and assign a single complaint from the queue
 */
router.post('/single', async (_req, res) => {
  try {
    const result = await autoAssignComplaint();

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('[AutoAssign] Error processing single complaint:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: String(error) });
  }
});

/**
 * POST /auto-assign/batch
 * Process and assign multiple complaints from the queue
 * Query param: limit (default 10)
 */
router.post('/batch', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await processAutoAssignBatch(limit);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[AutoAssign] Error processing batch:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: String(error) });
  }
});

/**
 * GET /auto-assign/queue-status
 * Get the current status of the processed complaint queue
 */
router.get('/queue-status', async (_req, res) => {
  try {
    const queueLength = await processedComplaintQueueService.getQueueLength();
    const nextComplaint = await processedComplaintQueueService.peekQueue();

    res.status(200).json({
      success: true,
      queueLength,
      nextComplaint,
    });
  } catch (error) {
    console.error('[AutoAssign] Error getting queue status:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: String(error) });
  }
});

/**
 * GET /auto-assign/blockchain-queue-status
 * Get the current status of the blockchain queue
 */
router.get('/blockchain-queue-status', async (_req, res) => {
  try {
    const queueLength = await blockchainQueueService.getQueueLength();
    const nextComplaint = await blockchainQueueService.peekQueue();

    res.status(200).json({
      success: true,
      queueLength,
      nextComplaint,
    });
  } catch (error) {
    console.error('[AutoAssign] Error getting blockchain queue status:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: String(error) });
  }
});

/**
 * POST /auto-assign/blockchain-queue-pop
 * Pop a complaint from the blockchain queue (for blockchain service consumption)
 */
router.post('/blockchain-queue-pop', async (_req, res) => {
  try {
    const complaint = await blockchainQueueService.popFromQueue();

    if (complaint) {
      res.status(200).json({
        success: true,
        complaint,
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No complaints in blockchain queue',
      });
    }
  } catch (error) {
    console.error('[AutoAssign] Error popping from blockchain queue:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: String(error) });
  }
});

// Polling status endpoint
router.get('/polling/status', (_req, res) => {
  return res.status(200).json({
    success: true,
    isPolling: isAutoAssignPolling,
  });
});

// Start polling endpoint
router.post('/polling/start', (_req, res) => {
  startAutoAssignPolling();
  return res.status(200).json({
    success: true,
    message: 'Auto-assign polling started',
  });
});

// Stop polling endpoint
router.post('/polling/stop', (_req, res) => {
  stopAutoAssignPolling();
  return res.status(200).json({
    success: true,
    message: 'Auto-assign polling stopped',
  });
});

/**
 * Start polling the processed complaint queue for auto-assignment
 */
export function startAutoAssignPolling() {
  if (isAutoAssignPolling) return;

  isAutoAssignPolling = true;
  console.log('[AutoAssign] Polling started (15s interval)');

  autoAssignPollingInterval = setInterval(async () => {
    try {
      // Log queue status before processing
      const queueLen = await processedComplaintQueueService.getQueueLength();
      // console.log(`[AutoAssign] Poll cycle - processed queue length: ${queueLen}`);

      const result = await autoAssignComplaint();
      if (result.success) {
        console.log('[AutoAssign] Complaint auto-assigned:', result);
      } else if (result.message !== 'No complaints in processed queue') {
        console.log('[AutoAssign] Assignment failed:', result.message);
      }
    } catch (err) {
      console.error('[AutoAssign] Poll cycle error:', err);
    }
  }, 15000); // 15 second interval
}

/**
 * Stop polling the processed complaint queue
 */
export function stopAutoAssignPolling() {
  if (autoAssignPollingInterval) {
    clearInterval(autoAssignPollingInterval);
    autoAssignPollingInterval = null;
  }
  isAutoAssignPolling = false;
  console.log('[AutoAssign] Polling stopped');
}

export default router;
