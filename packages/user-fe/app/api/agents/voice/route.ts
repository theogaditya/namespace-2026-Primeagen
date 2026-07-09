import { NextRequest, NextResponse } from "next/server";

const AGENTS_URL = process.env.AGENTS_SERVICE_URL || "http://localhost:3040";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Authorization required" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("audio") as File | null;
    const language = (formData.get("language") as string) || "english";
    const sessionId = formData.get("sessionId") as string | null;
    const imageFile = formData.get("image") as File | null;
    const mimeType =
      (formData.get("mimeType") as string | null) || file?.type || "audio/wav";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Audio file is required" },
        { status: 400 }
      );
    }

    // Convert audio blob to base64 for the agents backend (expects JSON)
    const arrayBuffer = await file.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    // Convert image to base64 if attached
    let imageBase64: string | undefined;
    if (imageFile) {
      const imgBuffer = await imageFile.arrayBuffer();
      imageBase64 = Buffer.from(imgBuffer).toString("base64");
    }

    const response = await fetch(`${AGENTS_URL}/api/voice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        audio: base64Audio,
        language,
        mimeType,
        ...(sessionId ? { sessionId } : {}),
        ...(imageBase64 ? { imageBase64 } : {}),
      }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Agents voice proxy error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reach AI voice service" },
      { status: 502 }
    );
  }
}
