import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Analyzes an uploaded image via the self service (GPT-4o-mini Vision).
 * Returns detected category, description, urgency, and location suggestion.
 */
export function createAnalyzeImageTool() {
  return new DynamicStructuredTool({
    name: "analyzeImage",
    description:
      "Analyze an uploaded image to auto-detect complaint category, description, and urgency. Use when the user uploads a photo related to their complaint.",
    schema: z.object({
      imageBase64: z.string().describe("Base64-encoded image data from the user upload"),
    }),
    func: async ({ imageBase64 }) => {
      const selfUrl = process.env.SELF_SERVICE_URL || "http://localhost:3030";

      // Self service expects either multipart 'image' file or JSON 'imageUrl'.
      // Use data-URL approach for base64 input.
      const dataUrl = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;

      const res = await fetch(`${selfUrl}/api/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: dataUrl }),
      });

      if (!res.ok) {
        return JSON.stringify({ error: "Image analysis failed", status: res.status });
      }

      const data = await res.json();
      return JSON.stringify(data);
    },
  });
}
