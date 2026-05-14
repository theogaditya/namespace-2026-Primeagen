import { Router } from 'express';
import { getPrisma } from '../lib/prisma';
import { processedComplaintQueueService } from '../lib/redis/processedComplaintQueueService';

const router = Router();

let isAutoAssignPolling = false;
let autoAssignPollingInterval: NodeJS.Timeout | null = null;

// Departments that get assigned to Agents (field-level)
const AGENT_DEPARTMENTS = [
  'INFRASTRUCTURE',
  'WATER_SUPPLY_SANITATION',
  'ELECTRICITY_POWER',
  'MUNICIPAL_SERVICES',
  'ENVIRONMENT',
  'POLICE_SERVICES',
] as const;

// Departments that get assigned to Municipal Admins (administrative-level)
const MUNICIPAL_ADMIN_DEPARTMENTS = [
  'EDUCATION',
  'REVENUE',
  'HEALTH',
  'TRANSPORTATION',
  'ENVIRONMENT',
  'HOUSING_URBAN_DEVELOPMENT',
  'SOCIAL_WELFARE',
  'PUBLIC_GRIEVANCES',
] as const;

type AgentDepartment = typeof AGENT_DEPARTMENTS[number];
type MunicipalDepartment = typeof MUNICIPAL_ADMIN_DEPARTMENTS[number];

/**
 * Helper: Pick a random element from an array
 */
function pickRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}

/**
 * Auto-assign a complaint from the processed queue
 * - If department is in AGENT_DEPARTMENTS → assign to a random agent in same district
 * - If department is in MUNICIPAL_ADMIN_DEPARTMENTS → assign to a municipal admin in same district
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

  const { id, assignedDepartment, district } = complaintData;

  console.log(`[AutoAssign] Processing complaint id=${id}, dept=${assignedDepartment}, district=${district}`);

  // 2. Fetch the full complaint to ensure it exists and is not already assigned
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: { location: true },
  });

  if (!complaint) {
    console.warn(`[AutoAssign] Complaint ${id} not found in database`);
    return { success: false, message: `Complaint ${id} not found`, complaintId: id };
  }

  // Use district from complaint location if available, fallback to queue data
  const complaintDistrict = complaint.location?.district || district;

  if (!complaintDistrict) {
    console.warn(`[AutoAssign] Complaint ${id} has no district information`);
    return { success: false, message: `Complaint ${id} has no district`, complaintId: id };
  }

  // 3. Determine assignment type based on department
  const isAgentDepartment = AGENT_DEPARTMENTS.includes(assignedDepartment as AgentDepartment);
  const isMunicipalDepartment = MUNICIPAL_ADMIN_DEPARTMENTS.includes(assignedDepartment as MunicipalDepartment);

  // --- AGENT ASSIGNMENT ---
  if (isAgentDepartment) {
    // Find agents in the same municipality (matching complaint's district) with available workload
    // Use case-insensitive matching for municipality
    const availableAgents = await prisma.agent.findMany({
      where: {
        municipality: {
          equals: complaintDistrict,
          mode: 'insensitive',
        },
        status: 'ACTIVE',
      },
    });

    console.log(`[AutoAssign] Found ${availableAgents.length} agents in municipality "${complaintDistrict}":`, 
      availableAgents.map(a => ({ id: a.id, name: a.fullName, municipality: a.municipality, workload: `${a.currentWorkload}/${a.workloadLimit}` })));

    // Filter agents who have capacity (currentWorkload < workloadLimit)
    const agentsWithCapacity = availableAgents.filter(
      (agent) => agent.currentWorkload < agent.workloadLimit
    );

    if (agentsWithCapacity.length === 0) {
      console.warn(`[AutoAssign] No available agents for complaint ${id} in municipality ${complaintDistrict}, dept ${assignedDepartment} - complaint removed from queue`);
      // Complaint already popped from queue at start, so it won't be retried
      return {
        success: false,
        message: `No available agents in municipality ${complaintDistrict} for department ${assignedDepartment}`,
        complaintId: id,
      };
    }

    // Pick a random agent
    const selectedAgent = pickRandom(agentsWithCapacity)!;

    // Update complaint and agent workload in a transaction
    await prisma.$transaction([
      prisma.complaint.update({
        where: { id },
        data: {
          assignedAgentId: selectedAgent.id,
          status: 'UNDER_PROCESSING',
        },
      }),
      prisma.agent.update({
        where: { id: selectedAgent.id },
        data: {
          currentWorkload: { increment: 1 },
        },
      }),
    ]);

    console.log(`[AutoAssign] Complaint ${id} assigned to agent ${selectedAgent.fullName} (${selectedAgent.id})`);

    return {
      success: true,
      message: `Complaint assigned to agent ${selectedAgent.fullName}`,
      complaintId: id,
      assignedTo: { type: 'agent', id: selectedAgent.id, name: selectedAgent.fullName },
    };
  }

  // --- MUNICIPAL ADMIN ASSIGNMENT ---
  if (isMunicipalDepartment) {
    // Find municipal admins in the same district/municipality (department doesn't need to match)
    // Use case-insensitive matching for municipality
    const availableAdmins = await prisma.departmentMunicipalAdmin.findMany({
      where: {
        municipality: {
          equals: complaintDistrict,
          mode: 'insensitive',
        },
        status: 'ACTIVE',
      },
    });

    console.log(`[AutoAssign] Found ${availableAdmins.length} municipal admins in district "${complaintDistrict}":`,
      availableAdmins.map(a => ({ id: a.id, name: a.fullName, municipality: a.municipality, workload: `${a.currentWorkload}/${a.workloadLimit}` })));

    // Filter admins who have capacity
    const adminsWithCapacity = availableAdmins.filter(
      (admin) => admin.currentWorkload < admin.workloadLimit
    );

    if (adminsWithCapacity.length === 0) {
      console.warn(`[AutoAssign] No available municipal admins for complaint ${id} in district ${complaintDistrict}, dept ${assignedDepartment} - complaint removed from queue`);
      return {
        success: false,
        message: `No available municipal admins in district ${complaintDistrict} for department ${assignedDepartment}`,
        complaintId: id,
      };
    }

    // Pick a random municipal admin
    const selectedAdmin = pickRandom(adminsWithCapacity)!;

    // Update complaint and admin workload in a transaction
    await prisma.$transaction([
      prisma.complaint.update({
        where: { id },
        data: {
          managedByMunicipalAdminId: selectedAdmin.id,
          status: 'UNDER_PROCESSING',
        },
      }),
      prisma.departmentMunicipalAdmin.update({
        where: { id: selectedAdmin.id },
        data: {
          currentWorkload: { increment: 1 },
        },
      }),
    ]);

    console.log(`[AutoAssign] Complaint ${id} assigned to municipal admin ${selectedAdmin.fullName} (${selectedAdmin.id})`);

    return {
      success: true,
      message: `Complaint assigned to municipal admin ${selectedAdmin.fullName}`,
      complaintId: id,
      assignedTo: { type: 'municipal_admin', id: selectedAdmin.id, name: selectedAdmin.fullName },
    };
  }

  // Department doesn't match any category
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
    const result = await autoAssignComplaint();
    if (result.success) {
      console.log('[AutoAssign] Complaint auto-assigned:', result);
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
