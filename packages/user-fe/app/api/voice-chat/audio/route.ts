import { NextRequest, NextResponse } from "next/server";

const VOICE_CHAT_BASE_URL = process.env.NEXT_PUBLIC_VOICE_CHAT_BASE_URL || "http://3.236.79.101:8000";

/**
 * Proxy audio files from the voice chat server to avoid mixed content issues.
 * The voice chat server uses HTTP, but our site uses HTTPS.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { error: "Audio path is required" },
        { status: 400 }
      );
    }

    // Sanitize path to prevent directory traversal
    const sanitizedPath = path.replace(/\.\./g, "").replace(/^\/+/, "");
    
    // Build the full URL to the audio file
    const audioUrl = `${VOICE_CHAT_BASE_URL}/${sanitizedPath}`;
    console.log("[Audio Proxy] Fetching:", audioUrl);

    // Fetch the audio file from the voice chat server
    const response = await fetch(audioUrl);

    if (!response.ok) {
      console.error("[Audio Proxy] Failed to fetch audio:", response.status);
      return NextResponse.json(
        { error: "Failed to fetch audio file" },
        { status: response.status }
      );
    }

    // Get the audio content
    const audioBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "audio/mpeg";

    // Return the audio with proper headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    console.error("[Audio Proxy] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
