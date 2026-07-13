/**
 * /api/categorize — Complaint sub-category standardization route.
 *
 * Replaces the Vertex AI fine-tuned endpoint. Called by compQueue
 * (service-to-service) with an internal API key.
 *
 * POST /api/categorize
 * Body: { "text": "pothole on main road" }
 * Response: { "success": true, "label": "Road Maintenance", "fromCache": false }
 */

import { Router, type Request, type Response } from "express";
import { categorizeComplaint } from "../agents/categorizationAI";

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";

export function createCategorizeRouter(): Router {
  const router = Router();

  router.post("/", async (req: Request, res: Response) => {
    // Authenticate service-to-service calls
    const apiKey = req.headers["x-internal-api-key"] as string | undefined;
    if (!apiKey || apiKey !== INTERNAL_API_KEY) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const { text } = req.body as { text?: string };

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      res.status(400).json({ success: false, error: "Missing or empty 'text' field" });
      return;
    }

    try {
      const result = await categorizeComplaint(text.trim());
      res.json({
        success: true,
        label: result.label,
        fromCache: result.fromCache,
      });
    } catch (err: any) {
      console.error("[/api/categorize] Error:", err);
      res.status(500).json({
        success: false,
        error: "Categorization failed",
        fallbackLabel: text.trim(),
      });
    }
  });

  return router;
}
