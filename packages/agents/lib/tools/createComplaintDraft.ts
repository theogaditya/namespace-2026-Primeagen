import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Creates a complaint draft with info gathered from conversation.
 * Returns structured JSON that the frontend reads to pre-fill the complaint form.
 */
export function createComplaintDraftTool() {
  return new DynamicStructuredTool({
    name: "createComplaintDraft",
    description:
      "Create a complaint draft with the information gathered from the conversation. Use this ONLY after you have: description, category, location, and urgency. The frontend will use this to pre-fill the complaint registration form.",
    schema: z.object({
      description: z.string().describe("Full description of the complaint"),
      category: z.string().describe("Category name (from getCategories)"),
      subCategory: z.string().optional().nullable().describe("Sub-category if identified"),
      district: z.string().describe("District name"),
      city: z.string().optional().nullable().describe("City name"),
      pin: z.string().optional().nullable().describe("6-digit PIN code / postal code of the location"),
      locality: z.string().optional().nullable().describe("Specific locality/area"),
      urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).describe("Urgency level"),
    }),
    func: async (args) => {
      return JSON.stringify({
        action: "COMPLAINT_DRAFT_READY",
        draft: args,
      });
    },
  });
}
