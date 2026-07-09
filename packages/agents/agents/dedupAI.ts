import type { PrismaClient } from "../prisma/generated/client/client";
import { createFindSimilarComplaintsTool } from "../lib/tools/findSimilar";

export interface DedupAIInput {
  description: string;
  category?: string;
  district?: string;
  pin?: string;
  userId: string;
}

export interface DedupMatch {
  id: string;
  seq: number;
  description: string;
  similarity: number;
  status: string;
  upvoteCount: number;
  pin?: string;
  district?: string;
}

export interface DedupAIOutput {
  hasSimilar: boolean;
  isDuplicate: boolean;
  matches: DedupMatch[];
  suggestion: string;
  confidence: number;
  rawResponse: string;
}

export function createDedupAI(db: PrismaClient) {
  const findSimilarComplaints = createFindSimilarComplaintsTool(db);

  return async function invokeDedupAI(input: DedupAIInput): Promise<DedupAIOutput> {
    const { description, category, district, pin } = input;

    try {
      const rawResponse = await findSimilarComplaints.invoke({
        description,
        category,
        district,
        pin,
        maxResults: 5,
      });
      const responseText =
        typeof rawResponse === "string" ? rawResponse : JSON.stringify(rawResponse);
      const parsed = JSON.parse(responseText);
      const matches: DedupMatch[] = Array.isArray(parsed.matches)
        ? parsed.matches
            .map((match: Record<string, unknown>) => ({
              id: String(match.id || ""),
              seq: Number(match.seq ?? 0),
              description: String(match.description || ""),
              similarity: typeof match.similarity === "number" ? match.similarity : 0,
              status: String(match.status || "REGISTERED"),
              upvoteCount: Number(match.upvoteCount ?? 0),
              pin: typeof match.pin === "string" ? match.pin : undefined,
              district: typeof match.district === "string" ? match.district : undefined,
            }))
            .filter((match: DedupMatch) => Boolean(match.id) && match.seq > 0)
        : [];

      const hasSimilar = Boolean(parsed.hasSimilar) && matches.length > 0;
      const isDuplicate = Boolean(parsed.isDuplicate) && matches.length > 0;
      const topMatch = matches[0];

      return {
        hasSimilar,
        isDuplicate,
        matches,
        suggestion: buildSuggestion({ description, hasSimilar, isDuplicate, topMatch }),
        confidence:
          typeof topMatch?.similarity === "number"
            ? topMatch.similarity
            : typeof parsed.confidence === "number"
              ? parsed.confidence
              : 0,
        rawResponse: responseText,
      };
    } catch {
      // If JSON parsing fails, return a safe default with the raw response
      return {
        hasSimilar: false,
        isDuplicate: false,
        matches: [],
        suggestion: "Unable to analyze for duplicates. You can proceed with submission.",
        confidence: 0,
        rawResponse: "",
      };
    }
  };
}

function buildSuggestion({
  description,
  hasSimilar,
  isDuplicate,
  topMatch,
}: {
  description: string;
  hasSimilar: boolean;
  isDuplicate: boolean;
  topMatch?: DedupMatch;
}) {
  const isHindi = /[\u0900-\u097F]/.test(description);

  if (isDuplicate && topMatch) {
    return isHindi
      ? `यह शिकायत शिकायत #${topMatch.seq} से बहुत मिलती-जुलती लग रही है। पहले उसे अपवोट करना बेहतर रहेगा, लेकिन चाहें तो आप नई शिकायत भी जमा कर सकते हैं।`
      : `This looks very close to complaint #${topMatch.seq} in the same area. Upvoting the existing complaint is recommended, but you can still submit yours if needed.`;
  }

  if (hasSimilar) {
    return isHindi
      ? "इसी इलाके में कुछ मिलती-जुलती शिकायतें मिली हैं। पहले उन्हें देख लें, फिर चाहें तो अपनी शिकायत जमा करें।"
      : "We found similar complaints in the same area. Review them first and consider upvoting the closest match before submitting a new one.";
  }

  return isHindi
    ? "मजबूत डुप्लिकेट नहीं मिला। आप अपनी शिकायत जमा कर सकते हैं।"
    : "No strong duplicate was found for this location. You can proceed with submission.";
}
