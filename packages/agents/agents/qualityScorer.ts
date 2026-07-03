import { z } from "zod";
import { getChatModel } from "../lib/models/provider";

/**
 * Structured output schema for quality score breakdown.
 */
const QualityBreakdownSchema = z.object({
  clarity: z
    .number()
    .min(0)
    .max(25)
    .describe("Clarity score (0-25): Is the description clear, specific, and well-written?"),
  evidence: z
    .number()
    .min(0)
    .max(25)
    .describe("Evidence score (0-25): Does it have a photo? Is attachment mentioned?"),
  location: z
    .number()
    .min(0)
    .max(25)
    .describe("Location score (0-25): Is the location precise? Exact coords > PIN code > district only"),
  completeness: z
    .number()
    .min(0)
    .max(25)
    .describe("Completeness score (0-25): Are all fields filled? Sub-category, urgency, description length?"),
});

const QualityOutputSchema = z.object({
  score: z.number().min(0).max(100).describe("Total quality score (sum of all dimensions, 0-100)"),
  breakdown: QualityBreakdownSchema,
  suggestions: z
    .array(z.string())
    .describe("List of actionable suggestions to improve the complaint quality, in the same language as the description"),
  rating: z
    .enum(["poor", "fair", "good", "excellent"])
    .describe("Overall rating: 0-25 poor, 26-50 fair, 51-75 good, 76-100 excellent"),
});

export type QualityOutput = z.infer<typeof QualityOutputSchema>;

export interface QualityScoreInput {
  description: string;
  category?: string;
  subCategory?: string;
  urgency?: string;
  hasAttachment: boolean;
  locationDetails?: {
    district?: string;
    city?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    locality?: string;
    street?: string;
  };
}

const QUALITY_SYSTEM_PROMPT = `You are a complaint quality evaluator for SwarajDesk, India's citizen grievance platform.

Score the complaint across 4 dimensions (0-25 each, total 0-100):

1. **Clarity (0-25)**: How clear and specific is the description?
   - 0-5: Vague, single sentence, no details
   - 6-12: Some details but missing key context (what, where, when, impact)
   - 13-18: Good description with most relevant details
   - 19-25: Excellent -specific, structured, includes timeline and impact

2. **Evidence (0-25)**: Does the complaint have supporting evidence?
   - 0: No attachment
   - 5-10: Has attachment but unknown relevance
   - 11-18: Has a photo attachment
   - 19-25: Has a relevant photo/document attachment (mentioned in description)

3. **Location (0-25)**: How precise is the location?
   - 0-5: No location or just a district
   - 6-12: District + city
   - 13-18: District + city + pincode or locality
   - 19-25: Exact coordinates (latitude/longitude) with street/locality

4. **Completeness (0-25)**: Are all fields properly filled?
   - +5: Has a category
   - +5: Has a sub-category that's specific
   - +5: Has urgency set (not default)
   - +5: Description is longer than 50 characters
   - +5: Description is longer than 150 characters

Provide suggestions in the SAME language as the complaint description (Hindi or English).
Be encouraging -highlight what's good and suggest specific improvements.`;

export function createQualityScorer() {
  const model = getChatModel("fast");
  const structuredModel = model.withStructuredOutput(QualityOutputSchema);

  return async function scoreQuality(input: QualityScoreInput): Promise<QualityOutput> {
    const { description, category, subCategory, urgency, hasAttachment, locationDetails } = input;

    const locationSummary = locationDetails
      ? [
          locationDetails.latitude && locationDetails.longitude
            ? `GPS: ${locationDetails.latitude}, ${locationDetails.longitude}`
            : null,
          locationDetails.street ? `Street: ${locationDetails.street}` : null,
          locationDetails.locality ? `Locality: ${locationDetails.locality}` : null,
          locationDetails.city ? `City: ${locationDetails.city}` : null,
          locationDetails.district ? `District: ${locationDetails.district}` : null,
          locationDetails.pincode ? `Pincode: ${locationDetails.pincode}` : null,
        ]
          .filter(Boolean)
          .join(", ") || "No location details"
      : "No location provided";

    const prompt = `Score this complaint:

**Description**: ${description}
**Category**: ${category || "Not specified"}
**Sub-category**: ${subCategory || "Not specified"}
**Urgency**: ${urgency || "Not specified (default)"}
**Has attachment/photo**: ${hasAttachment ? "Yes" : "No"}
**Location details**: ${locationSummary}
**Description length**: ${description.length} characters`;

    try {
      const result = await structuredModel.invoke([
        { role: "system", content: QUALITY_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ]);

      // Clamp the total score to match the sum of breakdown
      const parsed = result as unknown as QualityOutput;
      const computedTotal =
        parsed.breakdown.clarity +
        parsed.breakdown.evidence +
        parsed.breakdown.location +
        parsed.breakdown.completeness;

      return {
        score: Math.min(computedTotal, 100),
        breakdown: parsed.breakdown,
        suggestions: parsed.suggestions,
        rating: parsed.rating,
      };
    } catch (error) {
      console.error("[QualityScorer] Error:", error);

      // Fallback: compute a basic heuristic score
      const clarity = Math.min(Math.floor(description.length / 20), 25);
      const evidence = hasAttachment ? 15 : 0;
      const location = locationDetails?.latitude ? 22 : locationDetails?.pincode ? 12 : locationDetails?.district ? 6 : 0;
      const completeness =
        (category ? 5 : 0) +
        (subCategory ? 5 : 0) +
        (urgency && urgency !== "LOW" ? 5 : 0) +
        (description.length > 50 ? 5 : 0) +
        (description.length > 150 ? 5 : 0);

      const score = clarity + evidence + location + completeness;

      return {
        score: Math.min(score, 100),
        breakdown: { clarity, evidence, location, completeness },
        suggestions: ["Unable to generate AI suggestions. Please ensure your complaint is detailed."],
        rating: score >= 76 ? "excellent" : score >= 51 ? "good" : score >= 26 ? "fair" : "poor",
      };
    }
  };
}
