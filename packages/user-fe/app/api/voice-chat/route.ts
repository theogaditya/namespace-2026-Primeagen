import { NextRequest, NextResponse } from "next/server";
import { Language, VoiceChatAPIResponse } from "@/lib/types/chat";

const VOICE_CHAT_API_URL = process.env.NEXT_PUBLIC_VOICE_CHAT_URL || "http://3.236.79.101:8000/voice-chat";
const VOICE_CHAT_BASE_URL = process.env.NEXT_PUBLIC_VOICE_CHAT_BASE_URL || "http://3.236.79.101:8000";

const VALID_LANGUAGES: Language[] = ["english", "hindi", "hinglish"];

function isValidLanguage(lang: string): lang is Language {
  return VALID_LANGUAGES.includes(lang as Language);
}

export async function POST(request: NextRequest): Promise<NextResponse<VoiceChatAPIResponse>> {
  try {
    const formData = await request.formData();
    
    const file = formData.get("file") as File | null;
    const language = formData.get("language");

    // Validate file
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Audio file is required" },
        { status: 400 }
      );
    }

    // Validate language
    if (!language || typeof language !== "string") {
      return NextResponse.json(
        { success: false, error: "Language is required and must be a string" },
        { status: 400 }
      );
    }

    if (!isValidLanguage(language)) {
      return NextResponse.json(
        { success: false, error: `Invalid language. Must be one of: ${VALID_LANGUAGES.join(", ")}` },
        { status: 400 }
      );
    }

    // Convert File to proper Blob with arrayBuffer for forwarding
    const fileBuffer = await file.arrayBuffer();
    const fileBlob = new Blob([fileBuffer], { type: file.type || "audio/wav" });

    // Create FormData for the external API
    const externalFormData = new FormData();
    externalFormData.append("file", fileBlob, file.name || "recording.wav");
    externalFormData.append("language", language);

    // Make request to external voice chat API
    console.log("Sending request to:", VOICE_CHAT_API_URL);
    const response = await fetch(VOICE_CHAT_API_URL, {
      method: "POST",
      body: externalFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Voice chat API error:", response.status, errorText);
      return NextResponse.json(
        { success: false, error: `Voice chat service error: ${errorText}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    console.log("Voice chat API response:", data);

    // Check if API returned an error message
    if (data.error) {
      return NextResponse.json(
        { success: false, error: data.error },
        { status: 400 }
      );
    }

    if (!data.reply || !data.transcription) {
      console.error("Unexpected response structure:", data);
      return NextResponse.json(
        { success: false, error: "Invalid response from voice chat service" },
        { status: 502 }
      );
    }

    // Build proxied audio URL to avoid mixed content (HTTP audio on HTTPS site)
    let audioUrl = data.audio_url;
    if (audioUrl) {
      // Remove base URL if present, we'll use our proxy
      const audioPath = audioUrl.startsWith("http") 
        ? audioUrl.replace(/^https?:\/\/[^\/]+\//, "") 
        : audioUrl;
      // Use our proxy endpoint
      audioUrl = `/api/voice-chat/audio?path=${encodeURIComponent(audioPath)}`;
    }

    return NextResponse.json({
      success: true,
      data: {
        audio_url: audioUrl,
        reply: data.reply,
        transcription: data.transcription,
      },
    });

  } catch (error) {
    console.error("Voice chat API error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "Invalid request format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
