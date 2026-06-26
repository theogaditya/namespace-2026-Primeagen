import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { PrismaClient } from "../../prisma/generated/client/client";

/**
 * Get detailed status and timeline for a specific complaint.
 */
export function createGetComplaintStatusTool(db: PrismaClient) {
  return new DynamicStructuredTool({
    name: "getComplaintStatus",
    description:
      "Get detailed status of a specific complaint by complaint number. User can see their own complaints or any public complaint.",
    schema: z.object({
      complaintNumber: z.number().describe("The complaint sequence number (e.g., 42)"),
      _userId: z.string().describe("The authenticated user's ID (injected automatically)"),
    }),
    func: async ({ complaintNumber, _userId }) => {
      const complaint = await db.complaint.findUnique({
        where: { seq: complaintNumber },
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
          isPublic: true,
          complainantId: true,
          AIabusedFlag: true,
          isDuplicate: true,
          category: { select: { name: true } },
          location: { select: { district: true, city: true, locality: true } },
          auditLogs: {
            select: { action: true, timestamp: true, details: true },
            orderBy: { timestamp: "desc" },
            take: 10,
          },
        },
      });

      if (!complaint) {
        return `Complaint #${complaintNumber} not found.`;
      }

      // Access control: user can see own complaints or public ones
      if (!complaint.isPublic && complaint.complainantId !== _userId) {
        return `Complaint #${complaintNumber} is private and doesn't belong to you.`;
      }

      return JSON.stringify(
        {
          complaintNumber: complaint.seq,
          description: complaint.description.substring(0, 300),
          category: complaint.category.name,
          subCategory: complaint.subCategory,
          status: complaint.status,
          urgency: complaint.urgency,
          upvotes: complaint.upvoteCount,
          submittedOn: complaint.submissionDate.toISOString().split("T")[0],
          resolvedOn: complaint.dateOfResolution?.toISOString().split("T")[0] ?? "Not yet resolved",
          department: complaint.assignedDepartment,
          sla: complaint.sla ?? "Not set",
          escalationLevel: complaint.escalationLevel ?? "None",
          location: complaint.location
            ? `${complaint.location.locality}, ${complaint.location.city}, ${complaint.location.district}`
            : "Not specified",
          isOwner: complaint.complainantId === _userId,
          timeline: complaint.auditLogs.map((log) => ({
            action: log.action,
            date: log.timestamp.toISOString().split("T")[0],
            details: log.details,
          })),
        },
        null,
        2
      );
    },
  });
}
