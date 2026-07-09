import { Router } from "express";
import { createAbuseAI } from "../agents/abuseAI";
import { detectLanguage } from "../lib/toxicity/languageDetector";

/**
 * POST /api/moderate/test
 *
 * A publicly accessible (no JWT / no internal-key) endpoint for quickly
 * testing the abuse moderation pipeline without filing a complaint.
 *
 * Body:   { text: string }
 * Returns: Full moderation result + _debug metadata
 *
 * Rate-limited to 30 req/min per IP (in-memory, no Redis).
 * Disable in production via DISABLE_MODERATE_TEST_ENDPOINT=true.
 */

/* ---------- simple in-memory rate limiter ---------- */

const ipCounters = new Map<string, { count: number; resetAt: number }>();

function rateLimitMiddleware(req: any, res: any, next: any) {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const now = Date.now();
  const entry = ipCounters.get(ip);

  if (!entry || now > entry.resetAt) {
    ipCounters.set(ip, { count: 1, resetAt: now + 60_000 });
    return next();
  }
  if (entry.count >= 30) {
    res.status(429).json({ error: "Rate limit exceeded. Max 30 requests/min." });
    return;
  }
  entry.count++;
  next();
}

/* ---------- router ---------- */

export function createModerateTestRouter(): Router {
  const router = Router();
  const abuseAI = createAbuseAI();

  router.post("/", rateLimitMiddleware, async (req, res) => {
    // Gate behind env flag
    if (process.env.DISABLE_MODERATE_TEST_ENDPOINT === "true") {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const { text } = req.body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      res.status(400).json({ error: "text field is required and must be non-empty" });
      return;
    }

    try {
      const trimmed = text.trim();
      const language = detectLanguage(trimmed);
      const start = Date.now();

      const result = await abuseAI({ text: trimmed });

      res.json({
        ...result,
        _debug: {
          detected_language: language,
          input_length: trimmed.length,
          latency_ms: Date.now() - start,
          endpoint: "test",
        },
      });
    } catch (error) {
      console.error("[ModerateTest] Error:", error);
      res.status(500).json({
        error: "Internal moderation error",
        has_abuse: false,
        clean_text: text,
      });
    }
  });

  return router;
}
