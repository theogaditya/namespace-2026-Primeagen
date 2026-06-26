import { Router } from "express";
import type { PrismaClient } from "../prisma/generated/client/client";
import { createDedupAI } from "../agents/dedupAI";

/**
 * POST /api/dedup
 *
 * Accepts a draft complaint and returns deduplication analysis.
 * This endpoint is called in the complaint preview step, before final submission.
 *
 * Body: { description: string, category?: string, district?: string }
 * Returns: { hasSimilar, isDuplicate, matches[], suggestion, confidence }
 */
export function createDedupRouter(db: PrismaClient): Router {
  const router = Router();
  const dedupAI = createDedupAI(db);

  router.post("/", async (req, res) => {
    try {
      const userId = (req as any).userId as string;
      const { description, category, district } = req.body;

      if (!description || typeof description !== "string" || description.trim().length < 10) {
        res.status(400).json({
          error: "Description is required and must be at least 10 characters.",
        });
        return;
      }

      const result = await dedupAI({
        description: description.trim(),
        category: category || undefined,
        district: district || undefined,
        userId,
      });

      res.json({
        hasSimilar: result.hasSimilar,
        isDuplicate: result.isDuplicate,
        matches: result.matches,
        suggestion: result.suggestion,
        confidence: result.confidence,
      });
    } catch (error) {
      console.error("[DedupRoute] Error:", error);
      // Dedup failure should not block complaint submission
      res.json({
        hasSimilar: false,
        isDuplicate: false,
        matches: [],
        suggestion: "Unable to check for duplicates. You can proceed with submission.",
        confidence: 0,
      });
    }
  });

  return router;
}
