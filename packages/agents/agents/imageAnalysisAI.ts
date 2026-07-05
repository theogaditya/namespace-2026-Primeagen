import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getChatModel } from "../lib/models/provider";
import { IMAGE_ANALYSIS_SYSTEM_PROMPT } from "../lib/prompts/imageAnalysisAI";

/**
 * Structured output schema for image analysis.
 */
const ImageAnalysisOutputSchema = z.object({
  category: z
    .string()
    .describe(
      "The best matching complaint category from: Infrastructure, Education, Revenue, Health, Water Supply & Sanitation, Electricity & Power, Transportation, Municipal Services, Police Services, Environment, Housing & Urban Development, Social Welfare, Public Grievances"
    ),
  subCategory: z
    .string()
    .describe("A more specific sub-category within the chosen category (e.g., 'Pothole', 'Sewage Overflow', 'Broken Street Light')"),
  complaint: z
    .string()
    .describe("A natural first-person complaint statement (2-5 sentences) based only on visible evidence in the image"),
  urgency: z
    .enum(["LOW", "MEDIUM", "HIGH"])
    .describe("Urgency level: LOW (minor cosmetic), MEDIUM (affects daily life), HIGH (safety risk / health hazard)"),
});

export type ImageAnalysisOutput = z.infer<typeof ImageAnalysisOutputSchema>;

export interface ImageAnalysisInput {
  /** Base64 data URL (data:image/...;base64,...) or a public image URL */
  imageContent: string;
  /** Optional language preference for the complaint text */
  language?: string;
}

/**
 * Creates the Image Analysis AI agent.
 * Uses LangChain multimodal messages with structured output for reliable JSON.
 * Provider-agnostic via getChatModel().
 */
export function createImageAnalysisAI() {
  const model = getChatModel("chat");
  const structuredModel = model.withStructuredOutput(ImageAnalysisOutputSchema);

  return async function invokeImageAnalysisAI(input: ImageAnalysisInput): Promise<ImageAnalysisOutput> {
    const { imageContent, language } = input;

    const languageInstruction = language
      ? `\n\nIMPORTANT: Write the complaint text in ${language}. If the language is not specified or unclear, default to English.`
      : "";

    try {
      const result = (await structuredModel.invoke([
        new SystemMessage(IMAGE_ANALYSIS_SYSTEM_PROMPT + languageInstruction),
        new HumanMessage({
          content: [
            {
              type: "text",
              text: "Analyze the following image and classify it into the appropriate complaint category. Generate a first-person complaint statement based only on visible evidence.",
            },
            {
              type: "image_url",
              image_url: { url: imageContent },
            },
          ],
        }),
      ])) as unknown as ImageAnalysisOutput;

      return {
        category: result.category || "Public Grievances",
        subCategory: result.subCategory || result.category || "Public Grievances",
        complaint: result.complaint || "Unable to generate complaint description from the image.",
        urgency: result.urgency || "MEDIUM",
      };
    } catch (error) {
      console.error("[ImageAnalysisAI] Error:", error);

      // Fallback — don't block the user
      return {
        category: "Public Grievances",
        subCategory: "General",
        complaint: "Unable to analyze the uploaded image. Please describe the issue manually.",
        urgency: "MEDIUM",
      };
    }
  };
}
