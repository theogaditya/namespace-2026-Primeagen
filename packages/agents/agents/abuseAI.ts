import { z } from "zod";
import { getChatModel } from "../lib/models/provider";
import { ABUSE_AI_SYSTEM_PROMPT } from "../lib/prompts/abuseAI";
import { getToxicityDetector } from "../lib/toxicity/robertaToxicityDetector";
import { getHindiToxicityDetector } from "../lib/toxicity/hindiToxicityDetector";
import { detectLanguage } from "../lib/toxicity/languageDetector";
import type { ToxicityResult } from "../lib/toxicity/robertaToxicityDetector";
import hinglishLexicon from "../lib/toxicity/hinglish_lexicon.json";

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
 * Uses both hardcoded patterns AND the imported Hinglish lexicon for broad coverage.
 */
const PROFANITY_PATTERNS: RegExp[] = [
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

  // Hindi Devanagari patterns
  /हरामी/g,
  /कमीना/g,
  /कमीनी/g,
  /साला/g,
  /कुत्त[ेा]/g,
  /चूतिया/g,
  /मादरचोद/g,
  /भेंचोद/g,
  /गांडू/g,
  /रंडी/g,
  /भड़वा/g,
  /चमार/g,
  /दलाल/g,
  /गद्दार/g,
  /देशद्रोही/g,
  /कटुआ/g,
  /मुल्ले/g,
];

/**
 * Build a severity lookup from the Hinglish lexicon JSON.
 * Key = lowercase token, value = severity enum.
 */
interface LexiconEntry { token: string; meaning: string; severity: number; severityEnum: "low" | "medium" | "high"; }
const lexiconEntries = hinglishLexicon as LexiconEntry[];

const LEXICON_SEVERITY_MAP = new Map<string, "low" | "medium" | "high">();
for (const entry of lexiconEntries) {
  LEXICON_SEVERITY_MAP.set(entry.token.toLowerCase(), entry.severityEnum);
  // Generate a regex for each lexicon token and add to patterns
  const escaped = entry.token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  PROFANITY_PATTERNS.push(new RegExp(`\\b${escaped}\\b`, "gi"));
}

/**
 * Look up severity for a matched token from the Hinglish lexicon.
 * Falls back to "medium" if not found.
 */
function lookupSeverity(token: string): "low" | "medium" | "high" {
  return LEXICON_SEVERITY_MAP.get(token.toLowerCase()) ?? "medium";
}

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

  const lang = detectLanguage(text);
  const langCode = lang === "hindi" || lang === "mixed" ? "hi" : lang === "hinglish" ? "hinglish" : "en";

  for (const pattern of PROFANITY_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    const matches = text.match(pattern);
    if (matches) {
      hasAbuse = true;
      for (const match of matches) {
        if (!flaggedPhrases.some(p => p.original.toLowerCase() === match.toLowerCase())) {
          flaggedPhrases.push({
            original: match,
            masked: "******",
            language: langCode,
            category: "obscenity",
            severity: lookupSeverity(match),
          });
        }
        cleanText = cleanText.replace(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'gi'), '******');
      }
    }
  }

  return { hasAbuse, cleanText, flaggedPhrases };
}

export function createAbuseAI() {
  const model = getChatModel("fast");
  const structuredModel = model.withStructuredOutput(ModerationOutputSchema);
  const englishDetector = getToxicityDetector();
  const hindiDetector = getHindiToxicityDetector();

  /**
   * Pick the right HuggingFace toxicity detector based on the detected language.
   * Returns a ToxicityResult or null if no detector could run.
   */
  async function runModelDetection(text: string, language: ReturnType<typeof detectLanguage>): Promise<ToxicityResult | null> {
    // Hindi / mixed → prefer Hindi MuRIL detector
    if ((language === "hindi" || language === "mixed") && hindiDetector.available()) {
      try {
        console.log("[AbuseAI] Using Hindi MuRIL detector for", language, "text");
        return await hindiDetector.detect(text);
      } catch (err) {
        console.warn(`[AbuseAI] Hindi detector failed: ${getErrorMessage(err)}`);
      }
    }

    // Hinglish → try Hindi detector first, then English RoBERTa
    if (language === "hinglish") {
      if (hindiDetector.available()) {
        try {
          console.log("[AbuseAI] Trying Hindi detector for Hinglish text");
          return await hindiDetector.detect(text);
        } catch (err) {
          console.warn(`[AbuseAI] Hindi detector failed for Hinglish: ${getErrorMessage(err)}`);
        }
      }
      if (englishDetector.available()) {
        try {
          console.log("[AbuseAI] Falling back to RoBERTa for Hinglish text");
          return await englishDetector.detect(text);
        } catch (err) {
          console.warn(`[AbuseAI] RoBERTa failed for Hinglish: ${getErrorMessage(err)}`);
        }
      }
      return null;
    }

    // English → RoBERTa
    if (englishDetector.available()) {
      try {
        console.log("[AbuseAI] Using RoBERTa toxicity detector for English text");
        return await englishDetector.detect(text);
      } catch (err) {
        console.warn(`[AbuseAI] RoBERTa detection failed: ${getErrorMessage(err)}`);
      }
    }

    return null;
  }

  return async function invokeAbuseAI(input: AbuseAIInput): Promise<ModerationOutput> {
    const { text } = input;
    const language = detectLanguage(text);

    // Layer 1: Language-routed HuggingFace model detection
    const toxicityResult = await runModelDetection(text, language);

    if (toxicityResult) {
      if (toxicityResult.isToxic) {
        // Model detected toxicity — use regex to mask the specific words
        const fallback = fallbackProfanityCheck(text);
        const phraseSeverity = toxicityResult.severity === "none" ? "medium" : toxicityResult.severity;

        return {
          has_abuse: true,
          clean_text: fallback.cleanText || text,
          severity: toxicityResult.severity,
          flagged_phrases: fallback.flaggedPhrases.map((p) => ({
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

      // Model says clean — but still run regex as a safety net for Hindi/Hinglish
      if (language !== "english") {
        const fallback = fallbackProfanityCheck(text);
        if (fallback.hasAbuse) {
          console.log("[AbuseAI] Model said clean but regex caught abuse in", language, "text");
          return {
            has_abuse: true,
            clean_text: fallback.cleanText,
            severity: "medium",
            flagged_phrases: fallback.flaggedPhrases.map((p) => ({
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

      console.log("[AbuseAI] No toxicity detected (language:", language, ")");
      return {
        has_abuse: false,
        clean_text: text,
        severity: "none",
        flagged_phrases: [],
        explanation_en: "No inappropriate language detected.",
        explanation_hi: "कोई अनुचित भाषा नहीं मिली।",
      };
    }

    // Layer 2: AI Model Analysis (Fallback when HF models unavailable)
    console.log("[AbuseAI] No HF detector available, using LLM for", language, "text");
    try {
      const result = (await structuredModel.invoke([
        { role: "system", content: ABUSE_AI_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Moderate the following text for a government grievance platform. Detect any abusive language, mask it, and provide structured moderation results.\n\nText to moderate:\n"""${text}"""`,
        },
      ])) as unknown as ModerationOutput;

      // If AI didn't detect abuse, run fallback regex check
      if (!result.has_abuse) {
        const fallback = fallbackProfanityCheck(text);
        if (fallback.hasAbuse) {
          console.log("[AbuseAI] Fallback regex detection triggered after LLM miss");
          return {
            has_abuse: true,
            clean_text: fallback.cleanText,
            severity: "medium",
            flagged_phrases: fallback.flaggedPhrases.map((p) => ({
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
          flagged_phrases: fallback.flaggedPhrases.map((p) => ({
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
 * Map toxicity model categories to our abuse categories.
 * Works for both RoBERTa (English) and MuRIL (Hindi) label vocabularies.
 */
function mapToxicityCategory(toxicCategory: string): "abuse" | "threat" | "obscenity" | "hate_speech" | "personal_attack" {
  const mapping: Record<string, "abuse" | "threat" | "obscenity" | "hate_speech" | "personal_attack"> = {
    toxic: "abuse",
    severe_toxic: "abuse",
    obscene: "obscenity",
    threat: "threat",
    insult: "personal_attack",
    identity_hate: "hate_speech",
    // Hindi MuRIL labels
    abusive: "abuse",
    hate: "hate_speech",
    offensive: "personal_attack",
  };

  return mapping[toxicCategory] || "abuse";
}
