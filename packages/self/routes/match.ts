import { Router, Request, Response } from "express";
import OpenAI from "openai";
import multer from "multer";

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
		if (allowed.includes(file.mimetype)) cb(null, true);
		else cb(new Error("Invalid file type"));
	},
});

const router = Router();

const openai = new OpenAI({ apiKey: process.env.OPEN_API_KEY });

// POST /match
// Body: { imageUrl1: string, imageUrl2: string }
router.post("/match", upload.fields([
	{ name: "image1", maxCount: 1 },
	{ name: "image2", maxCount: 1 },
]), async (req: Request, res: Response) => {
	try {
		// Accept either uploaded files (form-data) or URLs in JSON/form body
		const body = req.body || {};

		const files = (req as any).files as Record<string, Express.Multer.File[]> | undefined;

		// Helper to convert buffer+mimetype to data URI
		const bufferToDataUri = (buf: Buffer, mime: string) => `data:${mime};base64,${buf.toString("base64")}`;

		let image1: string | undefined = undefined;
		let image2: string | undefined = undefined;

		if (files?.image1 && files.image1.length > 0) {
			const f = files.image1[0]!;
			image1 = bufferToDataUri(f.buffer, f.mimetype || "image/jpeg");
		} else if (typeof body.imageUrl1 === "string" && body.imageUrl1.trim()) {
			image1 = body.imageUrl1.trim();
		}

		if (files?.image2 && files.image2.length > 0) {
			const f = files.image2[0]!;
			image2 = bufferToDataUri(f.buffer, f.mimetype || "image/jpeg");
		} else if (typeof body.imageUrl2 === "string" && body.imageUrl2.trim()) {
			image2 = body.imageUrl2.trim();
		}

		if (!image1 || !image2) {
			return res.status(400).json({ success: false, error: "Provide image1 and image2 either as files (image1,image2) or as imageUrl1,imageUrl2 in body" });
		}

		// If both are data URIs and identical, short-circuit
		if (image1 === image2) {
			return res.status(200).json({ success: true, match: true, confidence: 1, reason: "Exact same content provided" });
		}

		// If both are URLs, try quick URL validity check for non-data URLs
		try {
			if (!image1.startsWith("data:")) new URL(image1);
			if (!image2.startsWith("data:")) new URL(image2);
		} catch (err) {
			return res.status(400).json({ success: false, error: "One or both image URLs are invalid" });
		}

		// Prepare content for OpenAI Vision-style comparison
		const content: any[] = [
			{
				type: "text",
				text: `
				You are an image comparison assistant for a complaint management system.

Your task is to determine whether two images show the same location, scene, subject, or incident.

Decide match=true if the images clearly refer to the same:
- exact photo, even if cropped, resized, compressed, or slightly edited
- physical location from a different angle or viewpoint
- specific object, structure, damage, or landmark
- complaint incident or problem documented from different perspectives or at different times

Decide match=false if the images show:
- different locations, even if they look similar
- different objects, structures, or damage
- generic scenes without enough shared identifying details
- unrelated content

How to judge:
- Prefer visible, specific evidence over guesswork.
- Look for distinctive shared features such as:
  - same cracks, stains, potholes, debris, graffiti, markings, layout, or damage pattern
  - same buildings, walls, poles, roads, signs, trees, or surrounding structures
  - same camera position differences that still clearly indicate the same scene
- Do not rely on vague similarity alone.
- If the evidence is weak or ambiguous, return match=false.
- Confidence must reflect certainty:
  - 0.90–1.00 = very strong visual match
  - 0.70–0.89 = likely match with some uncertainty
  - 0.50–0.69 = weak or borderline evidence
  - below 0.50 = probably not a match

Return only valid JSON in exactly this format:
{
  "match": true,
  "confidence": 0.0,
  "reason": "short, specific explanation based only on visible evidence"
}

Rules:
- Output JSON only.
- Do not add markdown, code fences, or extra text.
- Do not mention uncertainty unless it affects the decision.
- Do not invent details that are not visible in the images.
				`,
			},
			{
				type: "image_url",
				image_url: { url: image1 },
			},
			{
				type: "image_url",
				image_url: { url: image2 },
			},
		];

		const completion = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "user",
					content,
				},
			],
			max_tokens: 300,
			temperature: 0.0,
		});

		const raw = completion.choices?.[0]?.message?.content;
		// Attempt to parse JSON from the model
		let parsed: any = null;
		try {
			if (!raw) throw new Error("empty response");
			parsed = JSON.parse(raw);
		} catch (parseErr) {
			// Fallback: return that we couldn't parse and include raw model output
			return res.status(200).json({
				success: true,
				fallback: true,
				match: false,
				confidence: 0,
				reason: "Could not parse model response",
				raw: raw,
			});
		}

		// Normalize parsed fields
		const match = Boolean(parsed.match);
		const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;
		const reason = parsed.reason || parsed.explanation || "";

		return res.status(200).json({ success: true, match, confidence, reason, model: completion.model });
	} catch (error: any) {
		console.error("/match error:", error);
		return res.status(500).json({ success: false, error: error?.message || String(error) });
	}
});

export { router as matchRouter };

