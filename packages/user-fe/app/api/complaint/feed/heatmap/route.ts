import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/backend";

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

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "500";

    const response = await fetch(
      `${BACKEND_URL}/api/complaints/get/feed/heatmap?limit=${limit}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.message || "Failed to fetch heatmap data" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Heatmap feed API error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch heatmap data" },
      { status: 500 }
    );
  }
}
