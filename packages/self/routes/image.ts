import { Router, Request, Response } from "express";
import OpenAI from "openai";
import multer from "multer";

const router = Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPEN_API_KEY,
});

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept image files only
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed.'));
    }
  },
});

// Helper function to convert image buffer to base64
const imageBufferToBase64 = (buffer: Buffer, mimeType: string): string => {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
};

// POST endpoint to analyze image
router.post("/image", upload.single('image'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { imageUrl } = req.body;

    let imageContent: string | null = null;
    let imageMimeType: string = 'image/jpeg';

    // Handle file upload
    if (file) {
      imageContent = imageBufferToBase64(file.buffer, file.mimetype);
      imageMimeType = file.mimetype;
    }
    // Handle CDN/URL input
    else if (imageUrl && typeof imageUrl === 'string') {
      // Validate URL format
      try {
        new URL(imageUrl);
        imageContent = imageUrl;
      } catch (urlError) {
        return res.status(400).json({
          success: false,
          error: "Invalid URL format",
        });
      }
    }
    // Neither file nor URL provided
    else {
      return res.status(400).json({
        success: false,
        error: "Either an image file or imageUrl must be provided",
      });
    }

    // Available complaint categories
    const categories = [
      "Infrastructure",
      "Education",
      "Revenue",
      "Health",
      "Water Supply & Sanitation",
      "Electricity & Power",
      "Transportation",
      "Municipal Services",
      "Police Services",
      "Environment",
      "Housing & Urban Development",
      "Social Welfare",
      "Public Grievances"
    ];

    // Prepare the content array for OpenAI
    const content: any[] = [
      {
        type: "text",
        text: `
        You are given an image and a fixed list of complaint categories : ${categories.join(", ")}

Your job is to:
- classify the image into the best matching category
- generate a first-person complaint statement based only on visible evidence
- output strict JSON only

Grounding rules:
- Treat the image as the only source of truth.
- Never claim you personally witnessed anything outside the image.
- Never add unsupported details such as exact street names, dates, authorities, or causes unless they are clearly visible.
- If the image does not clearly show a location, say “in my area” or similar generic wording.
- If multiple categories fit, choose the one that best matches the main issue in the image.
- If nothing clearly fits, choose the nearest category and keep the complaint cautious.

Urgency assessment:
- LOW: minor inconvenience, cosmetic issue, no safety risk
- MEDIUM: moderate issue affecting daily life, routine maintenance needed
- HIGH: serious issue posing safety risk, health hazard, or significant disruption

Complaint style:
- first person
- natural and conversational
- clear and direct
- realistic and human
- no exaggerated language
- no bullet points inside the complaint

Return only:
{
  "category": "...",
  "subCategory": "...",
  "complaint": "...",
  "urgency": "LOW" | "MEDIUM" | "HIGH"
}
        `,

      },
    ];

    // Add image content
    if (file) {
      // For file uploads, use base64
      content.push({
        type: "image_url",
        image_url: {
          url: imageContent,
        },
      });
    } else {
      // For URLs, use the URL directly
      content.push({
        type: "image_url",
        image_url: {
          url: imageContent,
        },
      });
    }

    // Send to OpenAI Vision API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: content,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0]?.message?.content;

    // Log the raw response for debugging
    console.log("OpenAI Response:", response);

    // Parse the JSON response
    let parsedResponse;
    try {
      if (!response) {
        throw new Error("Empty response from OpenAI");
      }
      parsedResponse = JSON.parse(response);
    } catch (parseError) {
      console.error("Parse Error:", parseError);
      // If parsing fails, return the raw response
      parsedResponse = {
        category: "Public Grievances",
        complaint: response || "Unable to generate complaint description",
      };
    }

    res.status(200).json({
      success: true,
      category: parsedResponse.category || "Public Grievances",
      subCategory: parsedResponse.subCategory || parsedResponse.category || "Public Grievances",
      complaint: parsedResponse.complaint || response,
      urgency: parsedResponse.urgency || "MEDIUM",
      model: completion.model,
    });
  } catch (error: any) {
    console.error("OpenAI Vision API Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to analyze image",
    });
  }
});

export { router as imageRouter };
