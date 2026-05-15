import { NextRequest, NextResponse } from "next/server";
import { 
  ChatRequest, 
  ChatAPIResponse, 
  Language, 
  validateMessage,
  MAX_WORD_COUNT 
} from "@/lib/types/chat";

const SWARAJ_AI_URL = process.env.NEXT_PUBLIC_CHATBOT_LINK || "http://44.192.24.50:8000/chat_swaraj";

const VALID_LANGUAGES: Language[] = ["english", "hindi", "hinglish"];

function isValidLanguage(lang: string): lang is Language {
  return VALID_LANGUAGES.includes(lang as Language);
}

export async function POST(request: NextRequest): Promise<NextResponse<ChatAPIResponse>> {
  try {
    const body = await request.json();
    
    // Validate request body
    const { user_query, language } = body as Partial<ChatRequest>;
    
    if (!user_query || typeof user_query !== "string") {
      return NextResponse.json(
        { success: false, error: "user_query is required and must be a string" },
        { status: 400 }
      );
    }
    
    if (!language || typeof language !== "string") {
      return NextResponse.json(
        { success: false, error: "language is required and must be a string" },
        { status: 400 }
      );
    }
    
    if (!isValidLanguage(language)) {
      return NextResponse.json(
        { success: false, error: `Invalid language. Must be one of: ${VALID_LANGUAGES.join(", ")}` },
        { status: 400 }
      );
    }
    
    // Validate message content
    const validation = validateMessage(user_query);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }
    
    // Make request to Swaraj AI backend
    const response = await fetch(SWARAJ_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_query: user_query.trim(),
        language,
      }),
    });
    
    if (!response.ok) {
      console.error("Swaraj AI API error:", response.status, response.statusText);
      return NextResponse.json(
        { success: false, error: "Failed to get response from AI service" },
        { status: 502 }
      );
    }
    
    const data = await response.json();
    
    if (!data.bot_response) {
      return NextResponse.json(
        { success: false, error: "Invalid response from AI service" },
        { status: 502 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        bot_response: data.bot_response,
      },
    });
    
  } catch (error) {
    console.error("Chat API error:", error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
