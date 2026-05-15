import { Router, Request, Response } from "express";
import { PrismaClient } from "../prisma/generated/client/client";

export function districtsRouter(db: PrismaClient): Router {
  const router = Router();

  // GET /api/districts - Get all operating districts
  router.get("/", async (req: Request, res: Response) => {
    try {
      const districts = await db.opratingDistricts.findMany({
        select: {
          id: true,
          name: true,
          state: true,
          stateId: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return res.status(200).json({
        success: true,
        data: districts,
      });
    } catch (error) {
      console.error("Error fetching districts:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch districts",
      });
    }
  });

  // GET /api/districts/validate - Validate a district name (case-insensitive)
  router.get("/validate", async (req: Request, res: Response) => {
    try {
      const { name } = req.query;

      if (!name || typeof name !== "string") {
        return res.status(400).json({
          success: false,
          error: "District name is required",
        });
      }

      // Case-insensitive search using Prisma's mode: 'insensitive'
      const district = await db.opratingDistricts.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          name: true,
          state: true,
          stateId: true,
        },
      });

      if (district) {
        return res.status(200).json({
          success: true,
          valid: true,
          data: district,
        });
      } else {
        return res.status(200).json({
          success: true,
          valid: false,
          error: "District not found in operating districts",
        });
      }
    } catch (error) {
      console.error("Error validating district:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to validate district",
      });
    }
  });

  return router;
}
