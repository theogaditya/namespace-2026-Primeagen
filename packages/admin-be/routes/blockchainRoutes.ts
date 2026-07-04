import { Router } from 'express';
import type { PrismaClient } from '../prisma/generated/client/client';
import { blockchainAuditService } from '../services/blockchainAudit';

export default function (prisma: PrismaClient) {
  const router = Router();

  router.get('/proof/:id', async (req, res) => {
    console.log(`🔍 [BlockchainRoute] Received verification request for: ${req.params.id}`);
    try {
      const { id } = req.params;

      
      // 1. Get database logs (Prisma)
      const dbLogs = await prisma.auditLog.findMany({
        where: { complaintId: id },
        orderBy: { timestamp: 'desc' }
      });

      // 2. Get blockchain events (Ethereum Sepolia)
      const chainLogs = await blockchainAuditService.getOnChainLogs(id);

      return res.json({
        ok: true,
        complaintId: id,
        source: {
          database: "PostgreSQL (Prisma)",
          blockchain: "Ethereum Sepolia (On-Chain)"
        },
        databaseLogs: dbLogs,
        blockchainVerifiedLogs: chainLogs,
        synced: chainLogs.length > 0
      });

    } catch (error: any) {
      console.error('[BlockchainRoute] Critical Error:', error);
      return res.status(500).json({ 
        ok: false, 
        message: 'Failed to verify blockchain proof',
        error: error.message 
      });
    }

  });

  return router;
}
