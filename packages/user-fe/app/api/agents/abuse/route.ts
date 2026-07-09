import { NextRequest, NextResponse } from "next/server";

const AGENTS_URL = process.env.AGENTS_SERVICE_URL || "http://localhost:3040";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Authorization required" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${AGENTS_URL}/api/moderate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(INTERNAL_API_KEY
          ? { "X-Internal-Api-Key": INTERNAL_API_KEY }
          : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Agents abuse proxy error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reach abuse moderation service" },
      { status: 502 }
    );
  }
}
