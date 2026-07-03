import { z } from "zod";
import { getChatModel } from "../lib/models/provider";
import { ABUSE_AI_SYSTEM_PROMPT } from "../lib/prompts/abuseAI";

/**
 * Structured output schema for abuse moderation.
 * Uses LangChain's `.withStructuredOutput()` for reliable JSON responses.
 */
const FlaggedPhraseSchema = z.object({
  original: z.string().describe("The original abusive word or phrase"),
  masked: z.string().describe("The masked version (always '******')"),
  language: z.string().describe("Language of the phrase: 'en', 'hi', or 'hinglish'"),
  category: z
    .enum(["abuse", "threat", "obscenity", "hate_speech", "personal_attack"])
    .describe("Type of abuse"),
  severity: z.enum(["low", "medium", "high"]).describe("Severity of this specific phrase"),
});

const ModerationOutputSchema = z.object({
  has_abuse: z.boolean().describe("Whether any abusive content was detected"),
  clean_text: z
    .string()
    .describe("The text with abusive words replaced by '******'. If no abuse, same as input text."),
  severity: z
    .enum(["none", "low", "medium", "high"])
    .describe("Overall severity: 'none' if no abuse, otherwise the highest severity found"),
  flagged_phrases: z
    .array(FlaggedPhraseSchema)
    .describe("List of all flagged abusive phrases. Empty array if no abuse."),
  explanation_en: z
    .string()
    .describe(
      "English explanation of moderation result, e.g. 'This complaint contained 2 abusive phrases that were automatically masked.'"
    ),
  explanation_hi: z
    .string()
    .describe(
      "Hindi explanation of moderation result, e.g. 'इस शिकायत में 2 अपमानजनक शब्द थे जो स्वचालित रूप से छुपाए गए हैं।'"
    ),
});

export type ModerationOutput = z.infer<typeof ModerationOutputSchema>;

export interface AbuseAIInput {
  text: string;
  complaintId?: string;
  userId?: string;
}

export function createAbuseAI() {
  const model = getChatModel("fast");
  const structuredModel = model.withStructuredOutput(ModerationOutputSchema);

  return async function invokeAbuseAI(input: AbuseAIInput): Promise<ModerationOutput> {
    const { text } = input;

    try {
      const result = await structuredModel.invoke([
        { role: "system", content: ABUSE_AI_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Moderate the following text for a government grievance platform. Detect any abusive language, mask it, and provide structured moderation results.\n\nText to moderate:\n"""${text}"""`,
        },
      ]) as unknown as ModerationOutput;

      return result;
    } catch (error) {
      console.error("[AbuseAI] Error during moderation:", error);

      // On failure, return safe default -don't block the complaint
      return {
        has_abuse: false,
        clean_text: text,
        severity: "none",
        flagged_phrases: [],
        explanation_en: "Moderation check could not be completed. Content was not modified.",
        explanation_hi:
          "संयम जांच पूरी नहीं हो सकी। सामग्री में कोई बदलाव नहीं किया गया।",
      };
    }
  };
}
