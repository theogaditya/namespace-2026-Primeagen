import { z } from "zod";
import { getChatModel } from "../lib/models/provider";
import { ABUSE_AI_SYSTEM_PROMPT } from "../lib/prompts/abuseAI";
import { getToxicityDetector } from "../lib/toxicity/robertaToxicityDetector";

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

/**
 * Fallback regex-based profanity detection.
 * Used as a safety net when AI model fails to detect obvious profanity.
 */
const PROFANITY_PATTERNS = [
  // English profanity
  /\bf+u+c+k+(?:ing|ed|er|s)?\b/gi,
  /\bs+h+i+t+(?:ty|s)?\b/gi,
  /\ba+s+s+(?:hole|es)?\b/gi,
  /\bb+i+t+c+h+(?:es|y)?\b/gi,
  /\bb+a+s+t+a+r+d+(?:s)?\b/gi,
  /\bd+i+c+k+(?:head|s)?\b/gi,
  /\bc+o+c+k+(?:sucker|s)?\b/gi,
  /\bp+u+s+s+y+\b/gi,
  /\bc+u+n+t+(?:s)?\b/gi,
  /\bd+a+m+n+(?:ed)?\b/gi,
  /\bh+e+l+l+\b/gi,
  /\bc+r+a+p+(?:py)?\b/gi,
  
  // Hindi/Hinglish profanity (transliterated)
  /\bchutiya\b/gi,
  /\bmadarchod\b/gi,
  /\bbhenchod\b/gi,
  /\bgandu\b/gi,
  /\bharami\b/gi,
  /\bkamina\b/gi,
  /\bkutte?\b/gi,
  /\bsaala\b/gi,
  /\bbc\b/gi,
  /\bmc\b/gi,
];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

function fallbackProfanityCheck(text: string): { hasAbuse: boolean; cleanText: string; flaggedPhrases: Array<{ original: string; masked: string; language: string; category: string; severity: string }> } {
  let cleanText = text;
  const flaggedPhrases: Array<{ original: string; masked: string; language: string; category: string; severity: string }> = [];
  let hasAbuse = false;

  for (const pattern of PROFANITY_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      hasAbuse = true;
      for (const match of matches) {
        if (!flaggedPhrases.some(p => p.original.toLowerCase() === match.toLowerCase())) {
          flaggedPhrases.push({
            original: match,
            masked: "******",
            language: /[a-z]/i.test(match) ? "en" : "hi",
            category: "obscenity",
            severity: "medium",
          });
        }
        cleanText = cleanText.replace(new RegExp(match, 'gi'), '******');
      }
    }
  }

  return { hasAbuse, cleanText, flaggedPhrases };
}

export function createAbuseAI() {
  const model = getChatModel("fast");
  const structuredModel = model.withStructuredOutput(ModerationOutputSchema);
  const toxicityDetector = getToxicityDetector();

  return async function invokeAbuseAI(input: AbuseAIInput): Promise<ModerationOutput> {
    const { text } = input;

    // Layer 1: RoBERTa Toxicity Detection (Primary - Most Reliable)
    if (toxicityDetector.available()) {
      try {
        console.log("[AbuseAI] Using RoBERTa toxicity detector (primary)");
        const toxicityResult = await toxicityDetector.detect(text);

        if (toxicityResult.isToxic) {
          // RoBERTa detected toxicity - now use regex to mask the specific words
          const fallback = fallbackProfanityCheck(text);
          
          // Ensure severity is not 'none' for flagged phrases
          const phraseSeverity = toxicityResult.severity === 'none' ? 'medium' : toxicityResult.severity;
          
          return {
            has_abuse: true,
            clean_text: fallback.cleanText || text,
            severity: toxicityResult.severity,
            flagged_phrases: fallback.flaggedPhrases.map(p => ({
              original: p.original,
              masked: p.masked,
              language: p.language as "en" | "hi" | "hinglish",
              category: mapToxicityCategory(toxicityResult.categories[0] || "obscenity"),
              severity: phraseSeverity,
            })),
            explanation_en: `This complaint contained inappropriate language (${toxicityResult.categories.join(", ")}) that was automatically masked. Toxicity score: ${(toxicityResult.maxScore * 100).toFixed(1)}%`,
            explanation_hi: `इस शिकायत में अनुचित भाषा थी जो स्वचालित रूप से छुपाई गई है। विषाक्तता स्कोर: ${(toxicityResult.maxScore * 100).toFixed(1)}%`,
          };
        }

        // RoBERTa says clean - trust it and return
        console.log("[AbuseAI] RoBERTa: No toxicity detected");
        return {
          has_abuse: false,
          clean_text: text,
          severity: "none",
          flagged_phrases: [],
          explanation_en: "No inappropriate language detected.",
          explanation_hi: "कोई अनुचित भाषा नहीं मिली।",
        };
      } catch (error) {
        console.warn(
          `[AbuseAI] RoBERTa detection failed, falling back to AI model: ${getErrorMessage(error)}`
        );
        // Fall through to Layer 2
      }
    } else {
      console.log("[AbuseAI] RoBERTa detector not available, using AI model");
    }

    // Layer 2: AI Model Analysis (Fallback when RoBERTa unavailable)
    try {
      const result = await structuredModel.invoke([
        { role: "system", content: ABUSE_AI_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Moderate the following text for a government grievance platform. Detect any abusive language, mask it, and provide structured moderation results.\n\nText to moderate:\n"""${text}"""`,
        },
      ]) as unknown as ModerationOutput;

      // If AI didn't detect abuse, run fallback regex check
      if (!result.has_abuse) {
        const fallback = fallbackProfanityCheck(text);
        if (fallback.hasAbuse) {
          console.log("[AbuseAI] Fallback regex detection triggered");
          return {
            has_abuse: true,
            clean_text: fallback.cleanText,
            severity: "medium",
            flagged_phrases: fallback.flaggedPhrases.map(p => ({
              original: p.original,
              masked: p.masked,
              language: p.language as "en" | "hi" | "hinglish",
              category: p.category as "abuse" | "threat" | "obscenity" | "hate_speech" | "personal_attack",
              severity: p.severity as "low" | "medium" | "high",
            })),
            explanation_en: `This complaint contained ${fallback.flaggedPhrases.length} inappropriate word(s) that were automatically masked.`,
            explanation_hi: `इस शिकायत में ${fallback.flaggedPhrases.length} अनुचित शब्द थे जो स्वचालित रूप से छुपाए गए हैं।`,
          };
        }
      }

      return result;
    } catch (error) {
      console.error("[AbuseAI] AI model error, trying regex fallback:", error);

      // Layer 3: Regex Fallback (Last Resort)
      const fallback = fallbackProfanityCheck(text);
      if (fallback.hasAbuse) {
        console.log("[AbuseAI] Using regex fallback after AI error");
        return {
          has_abuse: true,
          clean_text: fallback.cleanText,
          severity: "medium",
          flagged_phrases: fallback.flaggedPhrases.map(p => ({
            original: p.original,
            masked: p.masked,
            language: p.language as "en" | "hi" | "hinglish",
            category: p.category as "abuse" | "threat" | "obscenity" | "hate_speech" | "personal_attack",
            severity: p.severity as "low" | "medium" | "high",
          })),
          explanation_en: `This complaint contained ${fallback.flaggedPhrases.length} inappropriate word(s) that were automatically masked.`,
          explanation_hi: `इस शिकायत में ${fallback.flaggedPhrases.length} अनुचित शब्द थे जो स्वचालित रूप से छुपाए गए हैं।`,
        };
      }

      // On failure with no detected abuse, return safe default
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

/**
 * Map RoBERTa toxicity categories to our abuse categories
 */
function mapToxicityCategory(toxicCategory: string): "abuse" | "threat" | "obscenity" | "hate_speech" | "personal_attack" {
  const mapping: Record<string, "abuse" | "threat" | "obscenity" | "hate_speech" | "personal_attack"> = {
    'toxic': 'abuse',
    'severe_toxic': 'abuse',
    'obscene': 'obscenity',
    'threat': 'threat',
    'insult': 'personal_attack',
    'identity_hate': 'hate_speech',
  };
  
  return mapping[toxicCategory] || 'abuse';
}
