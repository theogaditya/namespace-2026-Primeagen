import { NextResponse } from 'next/server'

// Use NEXT_PUBLIC_API_URL when provided, otherwise fallback to admin-be default port 4000
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
    }

    console.log('[api/complaints/locations] Fetching from backend:', `${API_URL}/api/complaints/locations`)

    const backendRes = await fetch(`${API_URL}/api/complaints/locations`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    })

    const body = await backendRes.text()
    console.log('[api/complaints/locations] Backend response status:', backendRes.status)

    const headers = { 'content-type': 'application/json' }

    return new NextResponse(body, { status: backendRes.status, headers })
  } catch (err: any) {
    console.error('[api/complaints/locations] Error:', err)
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
