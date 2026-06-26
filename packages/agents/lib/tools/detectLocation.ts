import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Triggers browser-side geolocation detection on the frontend.
 * Returns a structured action that the frontend intercepts.
 */
export function createDetectLocationTool() {
  return new DynamicStructuredTool({
    name: "detectLocation",
    description:
      "Detect the user's current location using their device GPS. Use when the user agrees to share their location or when you offer to detect it during complaint registration. The frontend will prompt for permission and return city/district.",
    schema: z.object({
      reason: z
        .string()
        .optional()
        .nullable()
        .describe("Brief reason for requesting location, e.g. 'to fill complaint location'"),
    }),
    func: async ({ reason }) => {
      return JSON.stringify({
        action: "DETECT_LOCATION",
        reason: reason || "to help with your complaint location",
      });
    },
  });
}
