import { Router, Request, Response } from "express";
import { PrismaClient } from "../prisma/generated/client/client";
import { userQueueService } from "../lib/userQueueService";

export function helthPoint(db: PrismaClient) {
  const router = Router();

  router.get("/helth", async (req: Request, res: Response) => {
    try{
      try {
      await db.$queryRaw`SELECT 1`;
      
      let queueLength = 0;
      let redisStatus = "ok";
      try {
        queueLength = await userQueueService.getQueueLength();
      } catch (redisError) {
        redisStatus = "error";
        console.error("Redis health check failed:", redisError);
      }

      return res.status(200).json({ 
        status: "ok",
        database: "ok",
        redis: redisStatus,
        queueLength: queueLength,
        message: "All systems operational"
      });
    } catch (err) {
      return res.status(503).json({ error: "database error", details: String(err) });
    }
     
    }
    catch{
      return res.status(500).json({ error: "internal server error -- db not ok and api not ok" });
    }
  });

  return router;
}