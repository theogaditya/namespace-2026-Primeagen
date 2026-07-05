import { NextRequest, NextResponse } from "next/server";

const ADMIN_BE_URL = process.env.NEXT_PUBLIC_ADMIN_BE_URL || "http://localhost:3002";

export async function GET(request: NextRequest) {
  try {
    // Forward the request to the Admin Backend list endpoint
    const response = await fetch(`${ADMIN_BE_URL}/api/blockchain/proof`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 0 }
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ success: false, error: data.message || 'Failed to fetch blockchain proofs' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Blockchain recovery proxy error:", error);
    return NextResponse.json({ success: false, error: "Service unavailable" }, { status: 500 });
  }
}
