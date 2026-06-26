import { Router, Request, Response } from "express";

export function createHealthRoutes() {
  const router = Router();

  router.get("/", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "swarajdesk-agents",
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
