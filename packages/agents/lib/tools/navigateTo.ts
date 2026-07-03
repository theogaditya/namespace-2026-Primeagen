import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const ROUTES: Record<string, string> = {
  dashboard: "/dashboard",
  regComplaint: "/regComplaint",
  myComplaints: "/dashboard/complaints",
  communityFeed: "/dashboard/feed",
  profile: "/dashboard/profile",
  settings: "/dashboard/settings",
  notifications: "/dashboard/notifications",
};

/**
 * Tells the frontend to navigate the user to a specific page.
 * Returns a structured NAVIGATE action that the router forwards to the frontend.
 */
export function createNavigateToTool() {
  return new DynamicStructuredTool({
    name: "navigateTo",
    description:
      "Navigate the user to a specific page on SwarajDesk. Use when the user wants to go somewhere or when you need them to use a feature that requires the UI. Don't tell users to go to a page -navigate them there.",
    schema: z.object({
      page: z
        .enum([
          "dashboard",
          "regComplaint",
          "myComplaints",
          "communityFeed",
          "profile",
          "settings",
          "notifications",
        ])
        .describe("The page to navigate to"),
      reason: z.string().describe("Brief explanation of why you're navigating"),
    }),
    func: async ({ page, reason }) => {
      return JSON.stringify({
        action: "NAVIGATE",
        path: ROUTES[page],
        reason,
      });
    },
  });
}
