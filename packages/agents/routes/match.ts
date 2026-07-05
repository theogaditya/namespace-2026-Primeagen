import { Router } from "express";
import multer from "multer";
import { createImageMatchAI } from "../agents/imageMatchAI";

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type. Only image files (JPEG, PNG, GIF, WebP) are allowed."));
  },
});

/** Convert a buffer + MIME type into a data-URL string */
const bufferToDataUrl = (buf: Buffer, mime: string) =>
  `data:${mime};base64,${buf.toString("base64")}`;

/**
 * POST /api/match
 *
 * Compare two images to determine if they depict the same location/scene/incident.
 * Used for UAV verification and duplicate visual detection in admin-fe.
 *
 * Accepts:
 *   - multipart/form-data with fields "image1" and "image2" (file uploads)
 *   - JSON body with "imageUrl1" and "imageUrl2" (public URLs or data-URLs)
 *   - Mix of both (e.g., image1 as file + imageUrl2 as URL)
 *
 * Returns: { success, match, confidence, reason }
 */
export function createMatchRouter(): Router {
  const router = Router();
  const matchAI = createImageMatchAI();

  router.post(
    "/",
    upload.fields([
      { name: "image1", maxCount: 1 },
      { name: "image2", maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const body = req.body || {};
        const files = (req as any).files as Record<string, Express.Multer.File[]> | undefined;

        let image1: string | undefined;
        let image2: string | undefined;

        // Resolve image1: file upload takes priority over URL
        if (files?.image1 && files.image1.length > 0) {
          const f = files.image1[0]!;
          image1 = bufferToDataUrl(f.buffer, f.mimetype || "image/jpeg");
        } else if (typeof body.imageUrl1 === "string" && body.imageUrl1.trim()) {
          const trimmed = body.imageUrl1.trim();
          if (!trimmed.startsWith("data:")) {
            try { new URL(trimmed); } catch {
              res.status(400).json({ success: false, error: "imageUrl1 is not a valid URL" });
              return;
            }
          }
          image1 = trimmed;
        }

        // Resolve image2: file upload takes priority over URL
        if (files?.image2 && files.image2.length > 0) {
          const f = files.image2[0]!;
          image2 = bufferToDataUrl(f.buffer, f.mimetype || "image/jpeg");
        } else if (typeof body.imageUrl2 === "string" && body.imageUrl2.trim()) {
          const trimmed = body.imageUrl2.trim();
          if (!trimmed.startsWith("data:")) {
            try { new URL(trimmed); } catch {
              res.status(400).json({ success: false, error: "imageUrl2 is not a valid URL" });
              return;
            }
          }
          image2 = trimmed;
        }

        if (!image1 || !image2) {
          res.status(400).json({
            success: false,
            error: "Provide image1 and image2 either as files (image1, image2) or as imageUrl1, imageUrl2 in body",
          });
          return;
        }

        // Short-circuit: identical content
        if (image1 === image2) {
          res.json({
            success: true,
            match: true,
            confidence: 1,
            reason: "Exact same content provided",
          });
          return;
        }

        const result = await matchAI({ image1, image2 });

        res.json({
          success: true,
          match: result.match,
          confidence: result.confidence,
          reason: result.reason,
        });
      } catch (error: any) {
        console.error("[MatchRoute] Error:", error);
        res.status(500).json({
          success: false,
          error: error?.message || "Failed to compare images",
        });
      }
    }
  );

  return router;
}
