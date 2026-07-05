import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getChatModel } from "../lib/models/provider";
import { IMAGE_MATCH_SYSTEM_PROMPT } from "../lib/prompts/imageMatchAI";

/**
 * Structured output schema for image matching / comparison.
 */
const ImageMatchOutputSchema = z.object({
  match: z.boolean().describe("Whether the two images depict the same location, scene, subject, or incident"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence score from 0.0 to 1.0 — higher means more certain"),
  reason: z
    .string()
    .describe("Short, specific explanation based only on visible evidence in both images"),
});

export type ImageMatchOutput = z.infer<typeof ImageMatchOutputSchema>;

export interface ImageMatchInput {
  /** Base64 data URL or public URL for the first image */
  image1: string;
  /** Base64 data URL or public URL for the second image */
  image2: string;
}

/**
 * Creates the Image Match AI agent.
 * Uses LangChain multimodal messages with structured output for reliable JSON.
 * Provider-agnostic via getChatModel().
 */
export function createImageMatchAI() {
  const model = getChatModel("chat", { temperature: 0.0, maxTokens: 500 });
  const structuredModel = model.withStructuredOutput(ImageMatchOutputSchema);

  return async function invokeImageMatchAI(input: ImageMatchInput): Promise<ImageMatchOutput> {
    const { image1, image2 } = input;

    try {
      const result = (await structuredModel.invoke([
        new SystemMessage(IMAGE_MATCH_SYSTEM_PROMPT),
        new HumanMessage({
          content: [
            {
              type: "text",
              text: "Compare the following two images. Determine whether they depict the same location, scene, subject, or incident. Provide your match decision, confidence score, and a specific reason based on visible evidence.",
            },
            {
              type: "image_url",
              image_url: { url: image1 },
            },
            {
              type: "image_url",
              image_url: { url: image2 },
            },
          ],
        }),
      ])) as unknown as ImageMatchOutput;

      return {
        match: Boolean(result.match),
        confidence: typeof result.confidence === "number" ? result.confidence : 0,
        reason: result.reason || "",
      };
    } catch (error) {
      console.error("[ImageMatchAI] Error:", error);

      // Fallback — unable to compare, return no match
      return {
        match: false,
        confidence: 0,
        reason: "Image comparison could not be completed due to an internal error.",
      };
    }
  };
}
