import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { PrismaClient } from "../../prisma/generated/client/client";

/**
 * Get trending complaints (highest upvotes in last 7 days).
 */
export function createGetTrendingTool(db: PrismaClient) {
  return new DynamicStructuredTool({
    name: "getTrending",
    description:
      "Get trending complaints -the most upvoted public complaints from the last 7 days. Use when a user asks about trending issues, popular complaints, or what's happening in their area.",
    schema: z.object({
      district: z.string().optional().nullable().describe("Filter by district"),
      category: z.string().optional().nullable().describe("Filter by category"),
      limit: z.number().optional().nullable().default(10).describe("Max results (default 10)"),
    }),
    func: async ({ district, category, limit }) => {
      const take = Math.min(limit ?? 10, 20);

      // Try progressively wider time windows until we get results
      const windows = [7, 30, 90, 0]; // 0 = all-time
      let windowLabel = "the last 7 days";

      for (const days of windows) {
        const where: any = { isPublic: true };

        if (days > 0) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          where.submissionDate = { gte: cutoff };
        }

        if (category) {
          where.category = { name: { contains: category, mode: "insensitive" } };
        }
        if (district) {
          where.location = { district: { contains: district, mode: "insensitive" } };
        }

        const complaints = await db.complaint.findMany({
          where,
          take,
          orderBy: { upvoteCount: "desc" },
          select: {
            seq: true,
            description: true,
            subCategory: true,
            status: true,
            upvoteCount: true,
            assignedDepartment: true,
            category: { select: { name: true } },
            location: { select: { district: true, city: true } },
          },
        });

        if (complaints.length > 0) {
          if (days === 30) windowLabel = "the last 30 days";
          else if (days === 90) windowLabel = "the last 90 days";
          else if (days === 0) windowLabel = "all time";

          return JSON.stringify(
            {
              timeWindow: windowLabel,
              results: complaints.map((c, i) => ({
                rank: i + 1,
                complaintNumber: c.seq,
                description: c.description.substring(0, 150),
                category: c.category.name,
                subCategory: c.subCategory,
                status: c.status,
                upvotes: c.upvoteCount,
                department: c.assignedDepartment,
                location: c.location ? `${c.location.city}, ${c.location.district}` : "Not specified",
              })),
            },
            null,
            2
          );
        }
      }

      return "No trending complaints found for the specified filters.";
    },
  });
}
