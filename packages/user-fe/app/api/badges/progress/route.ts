import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function GET() {
  try {
    const headersList = await headers();
    const cookieStore = await cookies();
    
    // Get auth token from cookies or headers
    const authToken = cookieStore.get("authToken")?.value ||
                      headersList.get("authorization")?.replace("Bearer ", "");
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/badges/progress`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Badge progress error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch badge progress" },
      { status: 500 }
    );
  }
}
