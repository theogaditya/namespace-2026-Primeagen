import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { PrismaClient } from "../../prisma/generated/client/client";

/**
 * Get operating districts with complaint stats.
 */
export function createGetDistrictInfoTool(db: PrismaClient) {
  return new DynamicStructuredTool({
    name: "getDistrictInfo",
    description:
      "Get information about operating districts and their complaint statistics. Use when a user asks about districts, areas, or regional complaint data.",
    schema: z.object({
      state: z.string().optional().nullable().describe("Filter by state name"),
      district: z.string().optional().nullable().describe("Search for a specific district"),
    }),
    func: async ({ state, district }) => {
      // Get districts
      const where: any = {};
      if (state) where.state = { contains: state, mode: "insensitive" };
      if (district) where.name = { contains: district, mode: "insensitive" };

      const districts = await db.operating_districts.findMany({
        where,
        take: 20,
        select: {
          name: true,
          state: true,
        },
      });

      if (districts.length === 0) {
        return "No districts found matching your query.";
      }

      // Get complaint counts per district
      const results = await Promise.all(
        districts.map(async (d) => {
          const total = await db.complaint.count({
            where: { location: { district: { equals: d.name, mode: "insensitive" } } },
          });
          const resolved = await db.complaint.count({
            where: {
              location: { district: { equals: d.name, mode: "insensitive" } },
              status: "COMPLETED",
            },
          });
          return {
            district: d.name,
            state: d.state,
            totalComplaints: total,
            resolvedComplaints: resolved,
            resolutionRate: total > 0 ? `${Math.round((resolved / total) * 100)}%` : "N/A",
          };
        })
      );

      return JSON.stringify(results, null, 2);
    },
  });
}
