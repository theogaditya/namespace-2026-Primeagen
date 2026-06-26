import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { PrismaClient } from "../../prisma/generated/client/client";

/**
 * Get the authenticated user's own complaints with statuses.
 * Requires userId context.
 */
export function createFindMyComplaintsTool(db: PrismaClient) {
  return new DynamicStructuredTool({
    name: "findMyComplaints",
    description:
      "Get the current user's own complaints and their statuses. Use when a user asks about their complaints, tracking, or status updates.",
    schema: z.object({
      status: z.string().optional().nullable().describe("Filter by status (e.g., REGISTERED, UNDER_PROCESSING, COMPLETED)"),
      limit: z.number().optional().nullable().default(10).describe("Max results (default 10)"),
      _userId: z.string().describe("The authenticated user's ID (injected automatically)"),
    }),
    func: async ({ status, limit, _userId }) => {
      const where: any = { complainantId: _userId };
      if (status) {
        where.status = status.toUpperCase();
      }

      const complaints = await db.complaint.findMany({
        where,
        take: Math.min(limit ?? 10, 20),
        orderBy: { submissionDate: "desc" },
        select: {
          seq: true,
          description: true,
          subCategory: true,
          status: true,
          urgency: true,
          upvoteCount: true,
          submissionDate: true,
          dateOfResolution: true,
          assignedDepartment: true,
          sla: true,
          escalationLevel: true,
          AIabusedFlag: true,
          category: { select: { name: true } },
          location: { select: { district: true, city: true, locality: true } },
        },
      });

      if (complaints.length === 0) {
        return "You haven't filed any complaints yet. Would you like to register a new one?";
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
          submittedOn: c.submissionDate.toISOString().split("T")[0],
          resolvedOn: c.dateOfResolution?.toISOString().split("T")[0] ?? null,
          department: c.assignedDepartment,
          sla: c.sla,
          escalationLevel: c.escalationLevel,
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
