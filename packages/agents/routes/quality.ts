import { Router } from "express";
import { createQualityScorer } from "../agents/qualityScorer";

/**
 * POST /api/quality-score
 *
 * Calculate quality score for a complaint draft.
 * Called at the preview step before submission to show users
 * how well-documented their complaint is and how to improve it.
 *
 * Body: {
 *   description: string,
 *   category?: string,
 *   subCategory?: string,
 *   urgency?: string,
 *   hasAttachment: boolean,
 *   locationDetails?: { district?, city?, pincode?, latitude?, longitude?, locality?, street? },
 *   hasSimilarComplaints?: boolean,
 *   isDuplicate?: boolean,
 *   abuseDetected?: boolean
 * }
 *
 * Returns: { score, breakdown: { clarity, evidence, location, completeness }, suggestions[], rating }
 */
export function createQualityRouter(): Router {
  const router = Router();
  const scorer = createQualityScorer();

  router.post("/", async (req, res) => {
    try {
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
      } = req.body;

      if (!description || typeof description !== "string" || description.trim().length < 5) {
        res.status(400).json({
          error: "description is required and must be at least 5 characters.",
        });
        return;
      }

      const result = await scorer({
        description: description.trim(),
        category: category || undefined,
        subCategory: subCategory || undefined,
        urgency: urgency || undefined,
        hasAttachment: Boolean(hasAttachment),
        locationDetails: locationDetails || undefined,
        hasSimilarComplaints: hasSimilarComplaints === true,
        isDuplicate: isDuplicate === true,
        abuseDetected: abuseDetected === true,
      });

      res.json(result);
    } catch (error) {
      console.error("[QualityRoute] Error:", error);
      // Quality score failure should not block submission
      res.json({
        score: 0,
        breakdown: { clarity: 0, evidence: 0, location: 0, completeness: 0 },
        suggestions: ["Quality score calculation is temporarily unavailable."],
        rating: "poor",
      });
    }
  });

  return router;
}
