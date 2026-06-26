import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { sendEscalationEmail } from "../email/sender";
import type { PrismaClient } from "../../prisma/generated/client/client";

/**
 * Tool that sends an escalation email to human support.
 * Used by Help AI when it cannot resolve the user's issue after
 * multiple attempts, or when the user explicitly requests human help.
 */
export function createSendEscalationTool(db: PrismaClient) {
  return new DynamicStructuredTool({
    name: "sendEscalationEmail",
    description:
      "Send an escalation email to the human support team when you cannot resolve the user's issue. Include a summary of the conversation and the user's problem. Only use this after genuinely trying to help and failing, or when the user explicitly asks for human support.",
    schema: z.object({
      _userId: z.string().describe("The authenticated user's ID (from system context)"),
      issue: z.string().describe("Brief description of the user's unresolved issue"),
      conversationSummary: z.string().describe("Summary of the conversation so far, including what was tried"),
    }),
    func: async ({ _userId, issue, conversationSummary }) => {
      try {
        // Look up user info for the email
        const user = await db.user.findUnique({
          where: { id: _userId },
          select: { id: true, name: true, email: true },
        });

        if (!user) {
          return JSON.stringify({
            sent: false,
            message: "Could not find user information to send escalation.",
          });
        }

        const sent = await sendEscalationEmail({
          userId: user.id,
          userName: user.name || "Unknown",
          userEmail: user.email || "No email",
          issue,
          conversationSummary,
        });

        const supportEmail = process.env.SUPPORT_EMAIL || "support@swarajdesk.in";

        if (sent) {
          return JSON.stringify({
            sent: true,
            message: `Escalation email sent to ${supportEmail}. The support team will review the conversation and get back to the user.`,
            supportEmail,
          });
        } else {
          return JSON.stringify({
            sent: false,
            message: "Failed to send escalation email. Please ask the user to contact support directly.",
            supportEmail,
          });
        }
      } catch (error) {
        return JSON.stringify({
          sent: false,
          message: "An error occurred while attempting escalation.",
        });
      }
    },
  });
}
