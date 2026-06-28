import { NextRequest, NextResponse } from "next/server";

const BLOCKCHAIN_BACKEND_URL =
  process.env.BLOCKCHAIN_BE_URL ||
  process.env.NEXT_PUBLIC_BLOCKCHAIN_BE_URL ||
  "http://localhost:4100";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const response = await fetch(
      `${BLOCKCHAIN_BACKEND_URL}/api/complaints/${encodeURIComponent(id)}/blockchain/live`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data?.error || data?.message || "Failed to fetch blockchain status",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Blockchain live status proxy error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch blockchain status",
      },
      { status: 500 }
    );
  }
}
