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
        text: `Analyze this image and classify it into one of these complaint categories: ${categories.join(", ")}.

Based on what you see in the image, write a complaint description as if you are a citizen filing a complaint. Write it in first person, as if you are personally narrating the issue you are facing. Be specific about:
- What the problem is
- Where it is located (if visible)
- How it affects you or the community
- The urgency or severity of the issue

The description should sound natural and human, like someone is directly reporting their grievance. Use conversational language.

Also, identify which category this complaint belongs to from the list above. Respond in the following JSON format:
{
  "category": "the most appropriate category name",
  "complaint": "the complaint description written in first person as a citizen would narrate it"
}`,
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
      subCategory: parsedResponse.category || "Public Grievances",
      complaint: parsedResponse.complaint || response,
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
