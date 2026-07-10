import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/backend";

/**
 * POST /api/surveys/[id]/respond - Submit a survey response
 * Auth required
 */
export async function POST(
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

    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/surveys/${id}/respond`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || "Failed to submit response",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Submit response error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit response" },
      { status: 500 }
    );
  }
}
