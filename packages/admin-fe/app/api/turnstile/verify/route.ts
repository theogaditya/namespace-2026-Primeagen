import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { token } = await req.json()
    const secret = process.env.TURNSTILE_SECRET
    if (!secret) {
      return NextResponse.json({ success: false, message: "TURNSTILE_SECRET not configured on server" }, { status: 500 })
    }

    const params = new URLSearchParams({ secret, response: token })

    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    })

    const data = await r.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ success: false, message: "Turnstile verification error" }, { status: 500 })
  }
}
