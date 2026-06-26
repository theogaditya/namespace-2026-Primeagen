import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { PrismaClient } from "../../prisma/generated/client/client";

/**
 * List all complaint categories with their subcategories.
 */
export function createGetCategoriesTool(db: PrismaClient) {
  return new DynamicStructuredTool({
    name: "getCategories",
    description:
      "List all complaint categories and their subcategories. Use when a user wants to know what types of complaints can be filed, or needs help choosing a category.",
    schema: z.object({
      search: z.string().optional().nullable().describe("Optional keyword to filter categories"),
    }),
    func: async ({ search }) => {
      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { subCategories: { hasSome: [search] } },
            ],
          }
        : {};

      const categories = await db.category.findMany({
        where,
        select: {
          name: true,
          subCategories: true,
          learnedSubCategories: true,
          assignedDepartment: true,
        },
        orderBy: { name: "asc" },
      });

      if (categories.length === 0) {
        return "No categories found matching your search.";
      }

      return JSON.stringify(
        categories.map((c) => ({
          category: c.name,
          department: c.assignedDepartment,
          subCategories: c.subCategories,
          additionalSubCategories: c.learnedSubCategories,
        })),
        null,
        2
      );
    },
  });
}
