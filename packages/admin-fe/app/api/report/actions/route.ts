import { NextRequest, NextResponse } from "next/server";

const AGENTS_URL = process.env.AGENTS_URL || "http://localhost:3040";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization");

  try {
    const body = await req.json();

    const upstream = await fetch(`${AGENTS_URL}/api/report/actions`, {
      method: "POST",
      headers: {
        Authorization: token || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] report/actions proxy error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
