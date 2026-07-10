import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/backend";

/**
 * GET /api/surveys - List public published surveys
 * Optional auth for personalized experience
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token (optional for this endpoint)
    const authToken =
      request.cookies.get("authToken")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    // Get query params
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    // Forward the request to the backend
    const response = await fetch(
      `${BACKEND_URL}/api/surveys${queryString ? `?${queryString}` : ""}`,
      {
        method: "GET",
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || "Failed to fetch surveys",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Fetch surveys error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch surveys" },
      { status: 500 }
    );
  }
}
