import { Router } from "express";
import multer from "multer";
import { createImageAnalysisAI } from "../agents/imageAnalysisAI";

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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
 * POST /api/image
 *
 * Analyze an uploaded image (or image URL) to auto-detect complaint category,
 * generate a first-person complaint description, and assess urgency.
 *
 * Accepts:
 *   - multipart/form-data with field "image" (file upload)
 *   - JSON body with "imageUrl" (public URL or data-URL)
 *
 * Returns: { success, category, subCategory, complaint, urgency }
 */
export function createImageRouter(): Router {
  const router = Router();
  const imageAI = createImageAnalysisAI();

  router.post("/", upload.single("image"), async (req, res) => {
    try {
      const file = req.file;
      const { imageUrl, language } = req.body || {};

      let imageContent: string | null = null;

      // Priority 1: file upload
      if (file) {
        imageContent = bufferToDataUrl(file.buffer, file.mimetype);
      }
      // Priority 2: URL / data-URL in body
      else if (imageUrl && typeof imageUrl === "string") {
        const trimmed = imageUrl.trim();
        // Accept data URLs directly
        if (trimmed.startsWith("data:")) {
          imageContent = trimmed;
        } else {
          // Validate URL format
          try {
            new URL(trimmed);
            imageContent = trimmed;
          } catch {
            res.status(400).json({ success: false, error: "Invalid URL format" });
            return;
          }
        }
      }

      if (!imageContent) {
        res.status(400).json({
          success: false,
          error: "Either an image file or imageUrl must be provided",
        });
        return;
      }

      const result = await imageAI({ imageContent, language });

      res.json({
        success: true,
        category: result.category,
        subCategory: result.subCategory,
        complaint: result.complaint,
        urgency: result.urgency,
      });
    } catch (error: any) {
      console.error("[ImageRoute] Error:", error);
      res.status(500).json({
        success: false,
        error: error?.message || "Failed to analyze image",
      });
    }
  });

  return router;
}
