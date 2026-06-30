import { Router } from 'express';
import { getPrisma } from '../lib/prisma';
import { processedComplaintQueueService } from '../lib/redis/processedComplaintQueueService';
import { blockchainQueueService } from '../lib/redis/blockchainQueueService';
import type { BlockchainQueueData } from '../lib/redis/blockchainQueueService';
import { dispatchNewComplaint } from '../lib/assignmentDispatcher';

const router = Router();

let isAutoAssignPolling = false;
let autoAssignPollingInterval: NodeJS.Timeout | null = null;

/**
 * Auto-assign a complaint from the processed queue.
 *
 * Uses the centralised dispatcher (lib/assignmentDispatcher) which:
 *   - Agent departments  → sets SLA, leaves in claimable pool (agents claim manually).
 *   - Municipal admin departments → assigns directly to least-loaded matching admin.
 *
 * After dispatching, pushes an entry to the blockchain queue for the immutable
 * record when the complaint was actually assigned to someone.
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

  // 2. Fetch the complaint (to verify it exists)
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: { location: true },
  });

  if (!complaint) {
    console.warn(`[AutoAssign] Complaint ${id} not found in database`);
    return { success: false, message: `Complaint ${id} not found`, complaintId: id };
  }

  // 3. Dispatch via central routing logic
  const result = await dispatchNewComplaint(prisma, id);

  if (!result.routed && result.routeTo === 'unknown') {
    console.warn(`[AutoAssign] Dispatcher could not route complaint ${id}: ${result.message}`);
    return { success: false, message: result.message, complaintId: id };
  }

  // 4. Push to blockchain queue for the record
  const complaintDistrict = complaint.location?.district || district;

  if (result.routeTo === 'municipal_admin' && result.municipalAdminId) {
    // Fetch the assigned admin's name for blockchain data
    const admin = await prisma.departmentMunicipalAdmin.findUnique({
      where: { id: result.municipalAdminId },
      select: { id: true, fullName: true },
    });

    if (admin) {
      const blockchainData: BlockchainQueueData = {
        id,
        seq: complaint.seq,
        status: 'UNDER_PROCESSING',
        categoryId: complaint.categoryId,
        subCategory: complaint.subCategory,
        assignedDepartment,
        city: complaint.location?.city || '',
        district: complaintDistrict || '',
        assignedTo: {
          type: 'municipal_admin',
          id: admin.id,
          name: admin.fullName,
        },
        assignedAt: new Date().toISOString(),
      };
      await blockchainQueueService.pushToQueue(blockchainData);
    }

    console.log(`[AutoAssign] Complaint ${id} dispatched → municipal admin ${admin?.fullName}`);
    return {
      success: true,
      message: result.message,
      complaintId: id,
      assignedTo: admin
        ? { type: 'municipal_admin', id: admin.id, name: admin.fullName }
        : undefined,
    };
  }

  if (result.routeTo === 'agent_pool') {
    // Agent department — complaint enters the claimable pool. Blockchain record
    // will be pushed when an agent actually claims it (in agent.ts).
    console.log(`[AutoAssign] Complaint ${id} dispatched → agent claimable pool`);
    return {
      success: true,
      message: result.message,
      complaintId: id,
    };
  }

  // Fallback: SLA may have been set but routing failed (e.g. no admin found)
  console.warn(`[AutoAssign] Complaint ${id} partially dispatched: ${result.message}`);
  return { success: false, message: result.message, complaintId: id };
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
