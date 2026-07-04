import { NextRequest, NextResponse } from "next/server";

// Admin Backend URL where we added the new blockchain routes
const ADMIN_BE_URL = process.env.NEXT_PUBLIC_ADMIN_BE_URL || "http://localhost:3002";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Forward the request to the Admin Backend
    const response = await fetch(`${ADMIN_BE_URL}/api/blockchain/proof/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 } // Don't cache blockchain data
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.message || "Failed to fetch blockchain proof",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Blockchain proxy error:", error);
    return NextResponse.json(
      { success: false, error: "Cloud not connect to blockchain verification service" },
      { status: 500 }
    );
  }
}
