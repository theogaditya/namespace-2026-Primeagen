import { NextResponse } from 'next/server'

// Use NEXT_PUBLIC_API_URL when provided, otherwise fallback to admin-be default port
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
    }

    // Call the backend endpoint for most-liked complaints
    const backendRes = await fetch(`${API_URL}/api/complaints/most-liked`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    })

    const body = await backendRes.text()
    const headers = { 'content-type': 'application/json' }

    return new NextResponse(body, { status: backendRes.status, headers })
  } catch (err: any) {
    console.error('[API] Error fetching most-liked complaints:', err)
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
