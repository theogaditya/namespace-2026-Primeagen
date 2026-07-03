import { NextRequest, NextResponse } from "next/server"

/**
 * Server-side image proxy -fetches a remote image and re-serves it from our
 * origin so the browser never makes a cross-origin request and CORP/CORS
 * headers on the remote host don't block rendering.
 *
 * Usage: /api/img-proxy?url=https://remote.example.com/photo.jpg
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url")
  if (!raw) {
    return new NextResponse("Missing url param", { status: 400 })
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return new NextResponse("Invalid URL", { status: 400 })
  }

  // Only allow http(s) -block file:// etc.
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return new NextResponse("Only http/https allowed", { status: 400 })
  }

  try {
    const upstream = await fetch(url.toString(), {
      headers: {
        // Identify as a server fetch so the remote host treats it as same-origin
        "User-Agent": "SwarajDesk-Proxy/1.0",
      },
      // Node 18+ fetch doesn't follow CORP -this is a plain server fetch
    })

    if (!upstream.ok) {
      return new NextResponse(`Upstream error: ${upstream.status}`, {
        status: upstream.status,
      })
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream"
    const buffer = await upstream.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Allow the browser to display the image from our origin
        "Cross-Origin-Resource-Policy": "cross-origin",
        // Cache for 24 h on browser, 1 h revalidation on CDN
        "Cache-Control": "public, max-age=86400, s-maxage=3600",
      },
    })
  } catch (err: any) {
    console.error("[img-proxy] fetch failed", err)
    return new NextResponse("Failed to fetch image", { status: 502 })
  }
}
