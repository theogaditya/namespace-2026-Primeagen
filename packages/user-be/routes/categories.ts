import { Router } from "express";
import { PrismaClient } from "../prisma/generated/client/client";

export function categoriesRouter(db: PrismaClient) {
  const router = Router();

  // GET /api/categories - Get all categories
  router.get("/", async (req, res) => {
    try {
      const categories = await db.category.findMany({
        select: {
          id: true,
          name: true,
          assignedDepartment: true,
          subCategories: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch categories",
      });
    }
  });

  return router;
}
