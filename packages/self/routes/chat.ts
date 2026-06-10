import { Router, Request, Response } from "express";
import OpenAI from "openai";

const router = Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPEN_API_KEY,
});

// POST endpoint to chat with OpenAI
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    // Validate that message is provided
    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Message is required and must be a string",
      });
    }

    // Send user's message to OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || "No response";

    res.status(200).json({
      success: true,
      message: response,
      model: completion.model,
    });
  } catch (error: any) {
    console.error("OpenAI API Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get response from OpenAI",
    });
  }
});

export { router as chatRouter };
