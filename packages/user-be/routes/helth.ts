import { Router, Request, Response } from "express";
import { PrismaClient } from "../prisma/generated/client/client";
import { userQueueService } from "../lib/redis/userQueueService";
import { complaintQueueService } from "../lib/redis/complaintQueueService";

export function helthPoint(db: PrismaClient) {
  const router = Router();

  router.get("/health", async (req: Request, res: Response) => {
    try{
      try {
      await db.$queryRaw`SELECT 1`;
      
      let userQueueLength = 0;
      let complaintQueueLength = 0;
      let userQueueStatus = "ok";
      let complaintQueueStatus = "ok";
      let processedQueueStatus = "ok";
      
      try {
        userQueueLength = await userQueueService.getQueueLength();
      } catch (redisError) {
        userQueueStatus = "error";
        console.error("User queue health check failed:", redisError);
      }

      try {
        complaintQueueLength = await complaintQueueService.getQueueLength();
      } catch (redisError) {
        complaintQueueStatus = "error";
        console.error("Complaint queue health check failed:", redisError);
      }

      const overallRedisStatus =
          userQueueStatus === "ok" && complaintQueueStatus === "ok" && processedQueueStatus === "ok"
            ? "ok"
            : "partial";

      return res.status(200).json({ 
        status: "ok",
        database: "ok",
        redis: overallRedisStatus,
        queues: {
          user: {
            status: userQueueStatus,
            length: userQueueLength,
          },
          complaint: {
            status: complaintQueueStatus,
            length: complaintQueueLength,
          },
        },
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