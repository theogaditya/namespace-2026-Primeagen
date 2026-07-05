import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createImageAnalysisAI } from "../../agents/imageAnalysisAI";

/**
 * Analyzes an uploaded image via the local Image Analysis AI agent (LangChain).
 * Returns detected category, description, urgency, and sub-category.
 */
export function createAnalyzeImageTool() {
  const imageAI = createImageAnalysisAI();

  return new DynamicStructuredTool({
    name: "analyzeImage",
    description:
      "Analyze an uploaded image to auto-detect complaint category, description, and urgency. Use when the user uploads a photo related to their complaint.",
    schema: z.object({
      imageBase64: z.string().describe("Base64-encoded image data from the user upload"),
    }),
    func: async ({ imageBase64 }) => {
      const dataUrl = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;

      try {
        const result = await imageAI({ imageContent: dataUrl });
        return JSON.stringify({
          success: true,
          category: result.category,
          subCategory: result.subCategory,
          complaint: result.complaint,
          urgency: result.urgency,
        });
      } catch (error) {
        console.error("[AnalyzeImageTool] Error:", error);
        return JSON.stringify({ success: false, error: "Image analysis failed" });
      }
    },
  });
}
