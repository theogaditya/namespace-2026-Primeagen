import express from 'express';
import { PrismaClient } from '../prisma/generated/client/client';

export default function (prisma: PrismaClient) {
  const router = express.Router();

  // GET /api/public/announcements?municipality=<name>
  router.get('/announcements', async (req, res: any) => {
    try {
      const municipality = req.query.municipality as string;
      if (!municipality) {
        return res.status(400).json({ success: false, message: 'municipality query parameter is required' });
      }

      const now = new Date();
      const data = await prisma.announcement.findMany({
        where: {
          municipality: { equals: municipality, mode: 'insensitive' },
          isActive: true,
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          content: true,
          priority: true,
          startsAt: true,
          expiresAt: true,
        },
      });

      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error fetching public announcements:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
    }
  });

  return router;
}
