import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { PrismaClient } from "../../prisma/generated/client/client";

/**
 * Search public complaints by keyword, category, district, or date range.
 * Returns only public complaints with safe fields.
 */
export function createFindComplaintsTool(db: PrismaClient) {
  return new DynamicStructuredTool({
    name: "findComplaints",
    description:
      "Search public complaints on the SwarajDesk platform. Use this when a user asks about complaints in an area, about a topic, or general complaint search.",
    schema: z.object({
      keyword: z.string().optional().nullable().describe("Keyword to search in complaint descriptions"),
      category: z.string().optional().nullable().describe("Category name to filter by"),
      district: z.string().optional().nullable().describe("District name to filter by"),
      status: z.string().optional().nullable().describe("Complaint status to filter by"),
      limit: z.number().optional().nullable().default(10).describe("Max results to return (default 10, max 20)"),
    }),
    func: async ({ keyword, category, district, status, limit }) => {
      const take = Math.min(limit ?? 10, 20);

      const where: any = { isPublic: true };

      if (keyword) {
        where.description = { contains: keyword, mode: "insensitive" };
      }
      if (category) {
        where.category = { name: { contains: category, mode: "insensitive" } };
      }
      if (status) {
        where.status = status.toUpperCase();
      }

      const locationWhere = district
        ? { location: { district: { contains: district, mode: "insensitive" as const } } }
        : {};

      const complaints = await db.complaint.findMany({
        where: { ...where, ...locationWhere },
        take,
        orderBy: { submissionDate: "desc" },
        select: {
          seq: true,
          description: true,
          subCategory: true,
          status: true,
          urgency: true,
          upvoteCount: true,
          submissionDate: true,
          assignedDepartment: true,
          AIabusedFlag: true,
          isDuplicate: true,
          category: { select: { name: true } },
          location: { select: { district: true, city: true, locality: true } },
        },
      });

      if (complaints.length === 0) {
        return "No public complaints found matching your search criteria.";
      }

      return JSON.stringify(
        complaints.map((c) => ({
          complaintNumber: c.seq,
          description: c.description.substring(0, 200),
          category: c.category.name,
          subCategory: c.subCategory,
          status: c.status,
          urgency: c.urgency,
          upvotes: c.upvoteCount,
          date: c.submissionDate.toISOString().split("T")[0],
          department: c.assignedDepartment,
          location: c.location
            ? `${c.location.locality}, ${c.location.city}, ${c.location.district}`
            : "Not specified",
        })),
        null,
        2
      );
    },
  });
}
