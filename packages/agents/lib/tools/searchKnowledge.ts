import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { searchKnowledge } from "../knowledge/helpDocs";

/**
 * Tool to search the Help AI knowledge base for platform FAQs,
 * troubleshooting guides, and feature explanations.
 */
export function createSearchKnowledgeTool() {
  return new DynamicStructuredTool({
    name: "searchKnowledge",
    description:
      "Search the SwarajDesk help knowledge base for FAQs, troubleshooting guides, feature explanations, and platform policies. Use this when the user asks how something works, has a problem, or needs an explanation.",
    schema: z.object({
      query: z.string().describe("The user's question or search terms"),
    }),
    func: async ({ query }) => {
      const results = searchKnowledge(query, 3);

      if (results.length === 0) {
        return JSON.stringify({
          found: false,
          message: "No specific help article found for this query.",
        });
      }

      return JSON.stringify({
        found: true,
        articles: results.map((doc) => ({
          title: doc.title,
          content: doc.content,
          category: doc.category,
        })),
      });
    },
  });
}
