import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export async function GET(request: NextRequest) {
  try {
    // Accept either a cookie-based token (`token` cookie) or an Authorization header
    const cookieToken = request.cookies.get('token')?.value
    const authHeader = request.headers.get('authorization')

    if (!cookieToken && !authHeader) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (cookieToken) {
      headers['Cookie'] = `token=${cookieToken}`
    } else if (authHeader) {
      headers['Authorization'] = authHeader
    }

    const url = new URL(`${API_URL}/api/state-admin/my-complaints`)
    // forward any query params sent to this route
    request.nextUrl.searchParams.forEach((value, key) => url.searchParams.append(key, value))

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      credentials: 'include'
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('State admin my-complaints API error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
