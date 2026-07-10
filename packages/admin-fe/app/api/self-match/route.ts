import { NextRequest, NextResponse } from "next/server"

/**
 * Server-side proxy for AI self-match endpoint.
 * Forwards POST requests (multipart or JSON) to the configured upstream
 * so the browser calls a same-origin route and avoids CORS issues.
 */
export async function POST(request: NextRequest) {
  // Upstream target - prefer server env, fallback to public var
  const target = process.env.SELF_MATCH_BACKEND || process.env.NEXT_PUBLIC_API_URL_SELF_MATCH || "http://localhost:3040/api/match"

  try {
    // Log incoming size hints for debugging deployment 413s
    const contentLength = request.headers.get("content-length") || "unknown"
    console.log("[self-match-proxy] incoming content-length:", contentLength)

    // Read the full body to measure actual received size, then forward that buffer.
    // Note: reading the body here can be heavy for very large uploads, but this
    // diagnostic will help determine if the request reaches the app route.
    const reqBuffer = await request.arrayBuffer()
    console.log("[self-match-proxy] actual body bytes:", reqBuffer.byteLength)

    // Forward the incoming request body and headers (except host/content-length)
    const headers: Record<string, string> = {}
    for (const [k, v] of request.headers) {
      if (k.toLowerCase() === "host") continue
      if (k.toLowerCase() === "content-length") continue
      headers[k] = v
    }

    const upstream = await fetch(target, {
      method: request.method,
      headers,
      // forward the buffered body
      body: reqBuffer,
      redirect: "follow",
    })

    const buffer = await upstream.arrayBuffer()
    const respHeaders: Record<string, string> = {}
    upstream.headers.forEach((v, k) => (respHeaders[k] = v))

    // Strip encoding/length headers that can cause browser decoding errors
    // when the platform or Next.js alters the response body. Let the
    // hosting layer set `Content-Encoding`/`Content-Length` appropriately.
    delete respHeaders["content-encoding"]
    delete respHeaders["content-length"]
    delete respHeaders["transfer-encoding"]

    return new NextResponse(buffer, {
      status: upstream.status,
      headers: {
        ...respHeaders,
        // Ensure browser accepts response from our origin
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (err: any) {
    console.error("[self-match-proxy] error:", err)
    return new NextResponse(JSON.stringify({ success: false, error: "Proxy error" }), { status: 502 })
  }
}
