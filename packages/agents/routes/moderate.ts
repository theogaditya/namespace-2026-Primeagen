import { Router } from "express";
import { createAbuseAI } from "../agents/abuseAI";

/**
 * Internal API key middleware for service-to-service auth.
 * The /api/moderate endpoint is called by compQueue, not end users.
 */
function internalAuth(req: any, res: any, next: any) {
  const apiKey = req.headers["x-internal-api-key"] || req.headers["authorization"]?.replace("Bearer ", "");
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) {
    // If no key configured, allow (dev mode) but warn
    console.warn("[ModerateRoute] INTERNAL_API_KEY not set -allowing request in dev mode");
    return next();
  }

  if (apiKey !== expectedKey) {
    res.status(403).json({ error: "Forbidden: invalid internal API key" });
    return;
  }

  next();
}

/**
 * POST /api/moderate
 *
 * Service-to-service endpoint for content moderation.
 * Called by compQueue when processing new complaints.
 *
 * Body: { text: string, complaint_id?: string, user_id?: string }
 * Returns: { has_abuse, clean_text, severity, flagged_phrases[], explanation_en, explanation_hi }
 *
 * Response shape is backward-compatible with the old Python abuse detector.
 */
export function createModerateRouter(): Router {
  const router = Router();
  const abuseAI = createAbuseAI();

  router.post("/", internalAuth, async (req, res) => {
    try {
      const { text, complaint_id, user_id } = req.body;

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        res.status(400).json({ error: "text field is required and must be non-empty" });
        return;
      }

      const result = await abuseAI({
        text: text.trim(),
        complaintId: complaint_id,
        userId: user_id,
      });

      // Return in a shape compatible with both old and new consumers
      res.json({
        // Old fields (backward-compatible with Python service shape)
        has_abuse: result.has_abuse,
        clean_text: result.clean_text,
        flagged_spans: result.flagged_phrases.map((p) => ({
          original: p.original,
          category: p.category,
        })),

        // New fields (richer metadata)
        severity: result.severity,
        flagged_phrases: result.flagged_phrases,
        explanation_en: result.explanation_en,
        explanation_hi: result.explanation_hi,
      });
    } catch (error) {
      console.error("[ModerateRoute] Error:", error);
      // Moderation failure should not block complaint processing
      res.json({
        has_abuse: false,
        clean_text: req.body?.text || "",
        flagged_spans: [],
        severity: "none",
        flagged_phrases: [],
        explanation_en: "Moderation check could not be completed.",
        explanation_hi: "संयम जांच पूरी नहीं हो सकी।",
      });
    }
  });

  return router;
}
