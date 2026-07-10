import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/backend";

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const resp = await fetch(`${BACKEND_URL}/api/users/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return NextResponse.json({ success: false, message: "Proxy error" }, { status: 502 });
  }
}
