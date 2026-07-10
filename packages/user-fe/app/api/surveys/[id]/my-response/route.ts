import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/backend";

/**
 * GET /api/surveys/[id]/my-response - Check if user already responded
 * Auth required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const response = await fetch(`${BACKEND_URL}/api/surveys/${id}/my-response`, {
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
          error: data.error || "Failed to check response status",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Check response status error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check response status" },
      { status: 500 }
    );
  }
}
