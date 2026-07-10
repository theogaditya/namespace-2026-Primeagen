import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/backend";

/**
 * GET /api/surveys/[id] - Get single survey with questions
 * Optional auth
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get auth token (optional)
    const authToken =
      request.cookies.get("authToken")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    const response = await fetch(`${BACKEND_URL}/api/surveys/${id}`, {
      method: "GET",
      headers: {
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || "Failed to fetch survey",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Fetch survey error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch survey" },
      { status: 500 }
    );
  }
}
