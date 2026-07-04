import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'

type RouteContext = {
  params: Promise<{
    complaintId: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { complaintId } = await params
    if (!complaintId) {
      return NextResponse.json({ success: false, message: 'Missing complaint id' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    const tokenCookie = request.cookies.get('token')?.value
    const superAdminCookie = request.cookies.get('superAdminToken')?.value
    const agentCookie = request.cookies.get('agentToken')?.value

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (authHeader) {
      headers.Authorization = authHeader
    } else {
      const cookieParts: string[] = []
      if (tokenCookie) cookieParts.push(`token=${tokenCookie}`)
      if (superAdminCookie) cookieParts.push(`superAdminToken=${superAdminCookie}`)
      if (agentCookie) cookieParts.push(`agentToken=${agentCookie}`)

      if (cookieParts.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Not authenticated' },
          { status: 401 }
        )
      }

      headers.Cookie = cookieParts.join('; ')
    }

    const backendRes = await fetch(
      `${API_URL}/api/complaints/verify/${encodeURIComponent(complaintId)}`,
      {
        method: 'GET',
        headers,
        cache: 'no-store',
      }
    )

    const body = await backendRes.text()
    const contentType = backendRes.headers.get('content-type') || 'application/json'

    return new NextResponse(body, {
      status: backendRes.status,
      headers: { 'content-type': contentType },
    })
  } catch (error: any) {
    console.error('Verify complaint proxy error:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
