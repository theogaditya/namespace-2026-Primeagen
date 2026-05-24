import { NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 })
    }

    const backendRes = await fetch(`${API_URL}/api/auth/verify`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    })

    const body = await backendRes.text()
    const headers = { 'content-type': 'application/json' }

    return new NextResponse(body, { status: backendRes.status, headers })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 })
  }
}
