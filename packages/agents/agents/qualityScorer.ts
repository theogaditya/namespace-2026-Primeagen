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
  hasSimilarComplaints?: boolean;
  isDuplicate?: boolean;
  abuseDetected?: boolean;
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

Apply explicit penalties when:
- there is no picture or attachment
- the complaint looks like a duplicate
- the complaint contains abusive or insulting language
- the selected category does not match the complaint details

High-priority mismatch rule:
- If category is "Water Supply & Sanitation" but the complaint text is about electricity or power outage, reduce the score heavily.
- If category is "Electricity & Power" but the complaint text is about water shortage, leakage, sewage, or drainage, reduce the score heavily.

Provide suggestions in the SAME language as the complaint description (Hindi or English).
Be encouraging -highlight what's good and suggest specific improvements.`;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Infrastructure: ["road", "bridge", "pothole", "drain", "construction", "footpath"],
  Education: ["school", "teacher", "classroom", "college", "student", "library"],
  Revenue: ["tax", "land record", "property", "mutation", "registry", "revenue"],
  Health: ["hospital", "clinic", "doctor", "medicine", "ambulance", "health"],
  "Water Supply & Sanitation": [
    "water",
    "pipeline",
    "tap",
    "drainage",
    "sewage",
    "sanitation",
    "leakage",
    "waterlogging",
  ],
  "Electricity & Power": [
    "electricity",
    "power",
    "transformer",
    "voltage",
    "wire",
    "outage",
    "blackout",
    "meter",
    "street light",
  ],
  Transportation: ["bus", "traffic", "transport", "vehicle", "parking", "road safety"],
  "Municipal Services": ["garbage", "waste", "street light", "park", "cleaning", "sweeping"],
  "Police Services": ["police", "theft", "crime", "safety", "harassment", "fir"],
  Environment: ["pollution", "tree", "forest", "smoke", "noise", "environment"],
  "Housing & Urban Development": ["housing", "building", "permit", "layout", "urban planning"],
  "Social Welfare": ["pension", "ration", "benefit", "welfare", "scheme"],
  "Public Grievances": ["complaint", "issue", "service", "problem", "delay"],
};

const ABUSE_HINTS = [
  "idiot",
  "stupid",
  "bloody",
  "bastard",
  "haram",
  "bewakoof",
  "saala",
  "madarchod",
  "bhosdi",
  "chutiya",
];

export function createQualityScorer() {
  const model = getChatModel("fast");
  const structuredModel = model.withStructuredOutput(QualityOutputSchema);

  return async function scoreQuality(input: QualityScoreInput): Promise<QualityOutput> {
    const {
      description,
      category,
      subCategory,
      urgency,
      hasAttachment,
      locationDetails,
      hasSimilarComplaints,
      isDuplicate,
      abuseDetected,
    } = input;

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
**Description length**: ${description.length} characters
**Has similar complaints**: ${hasSimilarComplaints ? "Yes" : "No"}
**Marked duplicate**: ${isDuplicate ? "Yes" : "No"}
**Abusive language already detected**: ${abuseDetected ? "Yes" : "No"}`;

    try {
      const result = await structuredModel.invoke([
        { role: "system", content: QUALITY_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ]);

      return applyDeterministicAdjustments(result as unknown as QualityOutput, input);
    } catch (error) {
      console.error("[QualityScorer] Error:", error);

      // Fallback: compute a basic heuristic score
      const clarity = Math.min(Math.max(Math.floor(description.length / 20), 2), 25);
      const evidence = hasAttachment ? 15 : 2;
      const location = locationDetails?.latitude ? 22 : locationDetails?.pincode ? 12 : locationDetails?.district ? 6 : 0;
      const completeness =
        (category ? 5 : 0) +
        (subCategory ? 5 : 0) +
        (urgency && urgency !== "LOW" ? 5 : 0) +
        (description.length > 50 ? 5 : 0) +
        (description.length > 150 ? 5 : 0);

      return applyDeterministicAdjustments(
        {
          score: Math.min(clarity + evidence + location + completeness, 100),
        breakdown: { clarity, evidence, location, completeness },
        suggestions: ["Unable to generate AI suggestions. Please ensure your complaint is detailed."],
          rating:
            clarity + evidence + location + completeness >= 76
              ? "excellent"
              : clarity + evidence + location + completeness >= 51
                ? "good"
                : clarity + evidence + location + completeness >= 26
                  ? "fair"
                  : "poor",
        },
        input
      );
    }
  };
}

function applyDeterministicAdjustments(
  base: QualityOutput,
  input: QualityScoreInput
): QualityOutput {
  const breakdown = {
    clarity: clampDimension(base.breakdown.clarity),
    evidence: clampDimension(base.breakdown.evidence),
    location: clampDimension(base.breakdown.location),
    completeness: clampDimension(base.breakdown.completeness),
  };
  const suggestions = [...base.suggestions];

  if (!input.hasAttachment) {
    breakdown.evidence = Math.min(breakdown.evidence, 5);
    suggestions.push("Add a photo or document so the department can verify the issue faster.");
  }

  if (input.hasSimilarComplaints) {
    breakdown.completeness = clampDimension(breakdown.completeness - 4);
    suggestions.push("Similar complaints already exist nearby. Link to the same issue only if this is genuinely new.");
  }

  if (input.isDuplicate) {
    breakdown.clarity = clampDimension(breakdown.clarity - 4);
    breakdown.completeness = clampDimension(breakdown.completeness - 8);
    suggestions.push("This looks like a duplicate report. Upvoting the existing complaint will usually work better.");
  }

  if (input.abuseDetected || detectLikelyAbuse(input.description)) {
    breakdown.clarity = clampDimension(breakdown.clarity - 8);
    breakdown.completeness = clampDimension(breakdown.completeness - 4);
    suggestions.push("Remove abusive language and keep the complaint factual so it can be processed smoothly.");
  }

  const mismatch = detectCategoryMismatch(input.category, input.description);
  if (mismatch.mismatch) {
    const penalty = mismatch.severe ? 9 : 5;
    breakdown.clarity = clampDimension(breakdown.clarity - penalty);
    breakdown.completeness = clampDimension(breakdown.completeness - penalty);
    suggestions.push(
      mismatch.reason ||
        "The selected category does not seem to match the issue described. Choose the closest category before submitting."
    );
  }

  const score =
    breakdown.clarity +
    breakdown.evidence +
    breakdown.location +
    breakdown.completeness;

  return {
    score: Math.min(score, 100),
    breakdown,
    suggestions: Array.from(new Set(suggestions)).slice(0, 5),
    rating: score >= 76 ? "excellent" : score >= 51 ? "good" : score >= 26 ? "fair" : "poor",
  };
}

function clampDimension(value: number) {
  return Math.max(0, Math.min(25, Math.round(value)));
}

function detectLikelyAbuse(description: string) {
  const text = description.toLowerCase();
  return ABUSE_HINTS.some((hint) => text.includes(hint));
}

function detectCategoryMismatch(category: string | undefined, description: string) {
  if (!category) {
    return { mismatch: false, severe: false, reason: undefined as string | undefined };
  }

  const normalizedDescription = description.toLowerCase();
  const keywordScores = Object.entries(CATEGORY_KEYWORDS).map(([name, keywords]) => ({
    name,
    score: keywords.reduce((total, keyword) => total + Number(normalizedDescription.includes(keyword)), 0),
  }));

  const selectedScore = keywordScores.find((entry) => entry.name === category)?.score ?? 0;
  const bestMatch = keywordScores.sort((a, b) => b.score - a.score)[0];
  const electricityKeywords = CATEGORY_KEYWORDS["Electricity & Power"] || [];
  const waterKeywords = CATEGORY_KEYWORDS["Water Supply & Sanitation"] || [];

  const waterVsElectricityConflict =
    (category === "Water Supply & Sanitation" &&
      electricityKeywords.some((keyword) => normalizedDescription.includes(keyword))) ||
    (category === "Electricity & Power" &&
      waterKeywords.some((keyword) => normalizedDescription.includes(keyword)));

  if (waterVsElectricityConflict) {
    return {
      mismatch: true,
      severe: true,
      reason:
        category === "Water Supply & Sanitation"
          ? 'The selected category is "Water Supply & Sanitation", but the description reads like an electricity issue.'
          : 'The selected category is "Electricity & Power", but the description reads like a water or sanitation issue.',
    };
  }

  if (bestMatch && bestMatch.name !== category && bestMatch.score >= 2 && selectedScore === 0) {
    return {
      mismatch: true,
      severe: false,
      reason: `The complaint details look closer to "${bestMatch.name}" than "${category}".`,
    };
  }

  return { mismatch: false, severe: false, reason: undefined as string | undefined };
}
