import { NextResponse } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get("cookie") || ""

    const backendRes = await fetch(`${API_URL}/api/civic-partner/auth/me`, {
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
    })

    const body = await backendRes.text()
    const headers = new Headers({ "content-type": "application/json" })

    // Forward Set-Cookie from backend if any
    const setCookie = backendRes.headers.get("set-cookie")
    if (setCookie) {
      headers.set("set-cookie", setCookie)
    }

    return new NextResponse(body, { status: backendRes.status, headers })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || String(err) },
      { status: 500 }
    )
  }
}
