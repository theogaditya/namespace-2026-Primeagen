import { Router, Request, Response } from "express";
import { PrismaClient } from "../prisma/generated/client/client";

const ADMIN_BE_URL = process.env.backend_admin || "http://localhost:3002";

/**
 * Derives an icon key from announcement title + content for display in user-fe.
 * The icon keys map to lucide-react icons in the AnnouncementsWidget.
 */
function deriveIcon(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();
  if (/construction|road|maintenance|infrastructure|repair|building|bridge|pothole/.test(text)) return "construction";
  if (/health|medical|hospital|clinic|medicine|doctor|vaccination|ambulance/.test(text)) return "health";
  if (/police|patrol|security|safety|crime|law|order|emergency/.test(text)) return "security";
  if (/water|supply|pipe|sewage|drainage|sanitation|leak/.test(text)) return "water";
  if (/electricity|power|light|outage|voltage|transformer/.test(text)) return "electricity";
  if (/community|volunteer|drive|event|park|restoration|clean/.test(text)) return "volunteer";
  if (/transport|bus|traffic|road closure|diversion/.test(text)) return "transport";
  return "campaign";
}

export function createAnnouncementsRouter(db: PrismaClient) {
  const router = Router();

  router.get("/", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as string | undefined;

      // Resolve the user's municipality from their stored location
      let municipality: string | null = null;
      if (userId) {
        const userLocation = await db.userLocation.findUnique({
          where: { userId },
          select: { municipal: true },
        });
        municipality = userLocation?.municipal ?? null;
      }

      if (!municipality) {
        return res.json({ success: true, data: [] });
      }

      // Query local DB for announcements for this municipality.
      const now = new Date();
      const rows = await db.announcement.findMany({
        where: {
          municipality: { equals: municipality, mode: "insensitive" },
          isActive: true,
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: [{ priority: "desc" }, { startsAt: "desc" }],
        select: { id: true, title: true, content: true, priority: true, startsAt: true, expiresAt: true },
      });

      const data = rows.map((a) => ({
        id: a.id,
        icon: deriveIcon(a.title, a.content),
        title: a.title,
        body: a.content,
        priority: a.priority,
        startsAt: a.startsAt?.toISOString(),
        expiresAt: a.expiresAt?.toISOString() ?? null,
      }));

      return res.json({ success: true, data });
    } catch (error) {
      console.error("Error fetching announcements:", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  return router;
}
