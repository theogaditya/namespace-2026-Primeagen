import { NextRequest, NextResponse } from "next/server";

const ADMIN_BE_URL = process.env.NEXT_PUBLIC_ADMIN_BE_URL || "http://localhost:3002";

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
    }

    // Forward the request to the new verified service in Admin Backend
    const response = await fetch(`${ADMIN_BE_URL}/api/blockchain/proof/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 0 }
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Blockchain recovery proxy error:", error);
    return NextResponse.json({ success: false, error: "Service unavailable" }, { status: 500 });
  }
}
