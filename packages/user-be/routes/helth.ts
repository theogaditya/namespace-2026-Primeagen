import { Router, Request, Response } from "express";
import { PrismaClient } from "../prisma/generated/client/client";

export function helthPoint(db: PrismaClient) {
  const router = Router();

  router.get("/helth", async (req: Request, res: Response) => {
    try{
      try {
      await db.$queryRaw`SELECT 1`;
      return res.status(200).send("database ok and api ok");
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