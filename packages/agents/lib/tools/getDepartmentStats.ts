import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { PrismaClient } from "../../prisma/generated/client/client";

/**
 * Get complaint resolution stats per department.
 */
export function createGetDepartmentStatsTool(db: PrismaClient) {
  return new DynamicStructuredTool({
    name: "getDepartmentStats",
    description:
      "Get complaint resolution statistics per department. Use when a user asks about department performance, resolution rates, or how departments are doing.",
    schema: z.object({
      department: z.string().optional().nullable().describe("Specific department to check (e.g., INFRASTRUCTURE, HEALTH)"),
    }),
    func: async ({ department }) => {
      const departments = department
        ? [department.toUpperCase()]
        : [
            "INFRASTRUCTURE",
            "EDUCATION",
            "REVENUE",
            "HEALTH",
            "WATER_SUPPLY_SANITATION",
            "ELECTRICITY_POWER",
            "TRANSPORTATION",
            "MUNICIPAL_SERVICES",
            "POLICE_SERVICES",
            "ENVIRONMENT",
            "HOUSING_URBAN_DEVELOPMENT",
            "SOCIAL_WELFARE",
            "PUBLIC_GRIEVANCES",
          ];

      const stats = await Promise.all(
        departments.map(async (dept) => {
          const total = await db.complaint.count({
            where: { assignedDepartment: dept },
          });
          const resolved = await db.complaint.count({
            where: { assignedDepartment: dept, status: "COMPLETED" },
          });
          const pending = await db.complaint.count({
            where: {
              assignedDepartment: dept,
              status: { in: ["REGISTERED", "UNDER_PROCESSING", "FORWARDED"] },
            },
          });

          return {
            department: dept.replace(/_/g, " "),
            totalComplaints: total,
            resolved,
            pending,
            resolutionRate: total > 0 ? `${Math.round((resolved / total) * 100)}%` : "N/A",
          };
        })
      );

      // Filter out departments with zero complaints for cleaner output
      const active = stats.filter((s) => s.totalComplaints > 0);

      if (active.length === 0) {
        return "No complaint data found for the specified department(s).";
      }

      return JSON.stringify(active, null, 2);
    },
  });
}
