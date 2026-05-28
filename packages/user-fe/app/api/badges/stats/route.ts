import { NextRequest, NextResponse } from "next/server";

// Backend API URL
const BACKEND_URL = process.env.NEXT_PUBLIC_USER_BE_URL || "http://localhost:3000";

/**
 * GET /api/badges/stats - Get user's badge statistics
 */
export async function GET(request: NextRequest) {
  try {
    const authToken =
      request.cookies.get("authToken")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/badges/stats`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || "Failed to fetch badge stats" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Fetch badge stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch badge stats" },
      { status: 500 }
    );
  }
}
