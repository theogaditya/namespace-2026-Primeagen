import { Router } from 'express';
import type { Request, Response } from 'express';
import { PrismaClient } from '../prisma/generated/client/client';
import { complaintQueueService } from '../lib/redis/complaintQueueService';
import { processedComplaintQueueService } from '../lib/redis/processedComplaintQueueService';
import { blockchainQueueService } from '../lib/redis/blockchainQueueService';

export function healthPoint(db: PrismaClient) {
  const router = Router();

  router.get('/health', async (req: Request, res: Response) => {
    try {
      // quick DB check
      try {
        await db.$queryRaw`SELECT 1`;
      } catch (err) {
        return res.status(503).json({ error: 'database error', details: String(err) });
      }

      let complaintQueueLength = 0;
      let processedQueueLength = 0;
      let blockchainQueueLength = 0;
      let complaintQueueStatus = 'ok';
      let processedQueueStatus = 'ok';
      let blockchainQueueStatus = 'ok';

      try {
        complaintQueueLength = await complaintQueueService.getQueueLength();
      } catch (redisError) {
        complaintQueueStatus = 'error';
        console.error('Complaint queue health check failed:', redisError);
      }

      try {
        processedQueueLength = await processedComplaintQueueService.getQueueLength();
      } catch (redisError) {
        processedQueueStatus = 'error';
        console.error('Processed complaint queue health check failed:', redisError);
      }

      try {
        blockchainQueueLength = await blockchainQueueService.getQueueLength();
      } catch (redisError) {
        blockchainQueueStatus = 'error';
        console.error('Blockchain queue health check failed:', redisError);
      }

      const overallRedisStatus = 
        complaintQueueStatus === 'ok' && 
        processedQueueStatus === 'ok' && 
        blockchainQueueStatus === 'ok' 
          ? 'ok' 
          : 'partial';

      return res.status(200).json({
        status: 'ok',
        database: 'ok',
        redis: overallRedisStatus,
        queues: {
          complaint: {
            status: complaintQueueStatus,
            length: complaintQueueLength,
          },
          processed: {
            status: processedQueueStatus,
            length: processedQueueLength,
          },
          blockchain: {
            status: blockchainQueueStatus,
            length: blockchainQueueLength,
          },
        },
        message: 'Health check complete',
      });
    } catch (err) {
      console.error('Health endpoint error:', err);
      return res.status(500).json({ error: 'internal server error' });
    }
  });

  return router;
}
