import { NextResponse } from 'next/server'

const EXTERNAL_URL = process.env.IMAGE_VALIDATION_URL || 'http://54.196.18.35:8000/predict'

export async function POST(req: Request) {
  try {
    // Read raw body as ArrayBuffer and forward content-type header
    const buffer = await req.arrayBuffer()
    const contentType = req.headers.get('content-type') || 'multipart/form-data'

    const proxied = await fetch(EXTERNAL_URL, {
      method: 'POST',
      body: Buffer.from(buffer),
      headers: {
        'Content-Type': contentType,
      },
    })

    const text = await proxied.text()

    // Try to parse JSON, otherwise return text
    try {
      const json = JSON.parse(text)
      return NextResponse.json(json, { status: proxied.status })
    } catch (e) {
      return new NextResponse(text, { status: proxied.status })
    }
  } catch (err: any) {
    console.error('[api/image/validate] proxy error:', err)
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
