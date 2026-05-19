import { NextResponse } from 'next/server'

// Use NEXT_PUBLIC_API_URL when provided, otherwise fallback to admin-be default port
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
    }

    const url = new URL(request.url)
    const page = url.searchParams.get('page') || '1'
    const limit = url.searchParams.get('limit') || '1000'

    // Call the backend endpoint for all complaints
    const backendRes = await fetch(`${API_URL}/api/complaints/all-complaints?page=${page}&limit=${limit}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    })

    const body = await backendRes.text()
    const headers = { 'content-type': 'application/json' }

    return new NextResponse(body, { status: backendRes.status, headers })
  } catch (err: any) {
    console.error('[API] Error fetching all complaints:', err)
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
