import { Router, Request, Response } from "express";

export function createAnnouncementsRouter() {
  const router = Router();

  router.get("/", async (_req: Request, res: Response) => {
    try {
      const announcements = [
        {
          id: "a1",
          icon: "construction",
          title: "Scheduled maintenance in Sector 4",
          body: "Water supply may be affected this Thursday between 10 AM - 4 PM.",
          createdAt: new Date().toISOString(),
        },
        {
          id: "a2",
          icon: "volunteer",
          title: "New community drive this Saturday",
          body: "Join us for the local park restoration starting at 8 AM at Central Square.",
          createdAt: new Date().toISOString(),
        },
        {
          id: "a3",
          icon: "security",
          title: "Enhanced Patrolling Active",
          body: "Citizen patrollers are active tonight in the 5th Block area.",
          createdAt: new Date().toISOString(),
        },
      ];

      return res.json({ success: true, data: announcements });
    } catch (error) {
      console.error("Error fetching announcements:", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  return router;
}
