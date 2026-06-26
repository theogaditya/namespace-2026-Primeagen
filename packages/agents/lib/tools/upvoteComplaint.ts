import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { PrismaClient } from "../../prisma/generated/client/client";

/**
 * Upvote a public complaint on behalf of the user.
 * Uses a unique constraint on (userId, complaintId) to prevent duplicates.
 */
export function createUpvoteComplaintTool(db: PrismaClient) {
  return new DynamicStructuredTool({
    name: "upvoteComplaint",
    description:
      "Upvote a public complaint. Use when a user wants to support or upvote a complaint they've seen. Requires the complaint number (seq).",
    schema: z.object({
      _userId: z.string().optional().nullable().describe("Auto-injected user ID"),
      complaintNumber: z.number().describe("The complaint number (seq) to upvote"),
    }),
    func: async ({ _userId, complaintNumber }) => {
      if (!_userId) {
        return JSON.stringify({ error: "You need to be logged in to upvote." });
      }

      const complaint = await db.complaint.findUnique({
        where: { seq: complaintNumber },
        select: { id: true, isPublic: true, seq: true, upvoteCount: true },
      });

      if (!complaint) {
        return JSON.stringify({ error: `Complaint #${complaintNumber} not found.` });
      }

      if (!complaint.isPublic) {
        return JSON.stringify({ error: "This complaint is not public and cannot be upvoted." });
      }

      // Check if already upvoted
      const existing = await db.upvote.findUnique({
        where: {
          userId_complaintId: {
            userId: _userId,
            complaintId: complaint.id,
          },
        },
      });

      if (existing) {
        return JSON.stringify({
          message: `You've already upvoted complaint #${complaintNumber}.`,
          currentUpvotes: complaint.upvoteCount,
        });
      }

      // Create upvote and increment count
      await db.$transaction([
        db.upvote.create({
          data: {
            userId: _userId,
            complaintId: complaint.id,
          },
        }),
        db.complaint.update({
          where: { id: complaint.id },
          data: { upvoteCount: { increment: 1 } },
        }),
      ]);

      return JSON.stringify({
        message: `Upvoted complaint #${complaintNumber} successfully!`,
        newUpvoteCount: complaint.upvoteCount + 1,
      });
    },
  });
}
