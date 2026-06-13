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
				text: `You are an image comparison assistant for a complaint management system. Your task is to determine if two images show THE SAME LOCATION, SCENE, or SUBJECT — even if photographed from different angles, viewpoints, or at different times.

MATCHING CRITERIA (return match=true if ANY of these apply):
1. SAME EXACT IMAGE: Identical photo (possibly with compression/cropping differences)
2. SAME LOCATION/SCENE: Same physical place photographed from different angles (e.g., ground-level vs top-down/CCTV view, front vs side angle)
3. SAME SUBJECT: Same specific object, building, damage, or incident from different perspectives
4. SAME INCIDENT: Photos documenting the same problem/complaint (e.g., same pothole, same broken wall, same damaged infrastructure)

NOT A MATCH (return match=false):
- Two DIFFERENT locations that happen to look similar (e.g., two different brick walls, two different potholes)
- Generic similar-looking scenes without identifiable shared features
- Completely unrelated images

Look for distinctive identifying features: unique damage patterns, specific structural elements, identical objects/debris, same graffiti, same surroundings, timestamps suggesting same location, etc.

Return a JSON object exactly in this format (no extra text):
{
	"match": true|false,
	"confidence": number, // 0-1, higher if more certain
	"reason": "short explanation of why they match or don't match"
}`,
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

