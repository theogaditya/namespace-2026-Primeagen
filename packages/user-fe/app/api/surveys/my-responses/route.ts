import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/backend";

/**
 * GET /api/surveys/my-responses - Get user's past survey submissions
 * Auth required
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token (required)
    const authToken =
      request.cookies.get("authToken")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required. Please log in." },
        { status: 401 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/surveys/my-responses`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || "Failed to fetch responses",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Fetch my responses error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch responses" },
      { status: 500 }
    );
  }
}
