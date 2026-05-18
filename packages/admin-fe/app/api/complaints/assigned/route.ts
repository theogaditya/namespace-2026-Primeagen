import { NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
    }

    const url = new URL(request.url)
    const page = url.searchParams.get('page') || '1'
    const limit = url.searchParams.get('limit') || '20'

    // Call the new agent endpoint for assigned complaints
    const backendRes = await fetch(`${API_URL}/api/agent/my-complaints?page=${page}&limit=${limit}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    })

    const body = await backendRes.text()
    const headers = { 'content-type': 'application/json' }

    return new NextResponse(body, { status: backendRes.status, headers })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
