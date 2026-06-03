import { NextResponse } from 'next/server'

const MODERATION_URL = process.env.MODERATION_URL || process.env.IMAGE_VALIDATION_URL
const TIMEOUT_MS = 20000 // 20 second timeout

export async function POST(req: Request) {
  if (!MODERATION_URL) {
    return NextResponse.json(
      { error: 'MODERATION_URL is not configured', is_valid: false, service_unavailable: true },
      { status: 500 }
    )
  }

  try {
    const formData = await req.formData()
    const imageFile = formData.get('image') as File | null

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image provided', is_valid: false },
        { status: 400 }
      )
    }

    const externalFormData = new FormData()
    const arrayBuffer = await imageFile.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: imageFile.type })
    // Append under both common keys to maximize compatibility with the moderation service
    externalFormData.append('image', blob, imageFile.name)
    externalFormData.append('file', blob, imageFile.name)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    let proxied: Response
    try {
      console.log('[api/image/validate] Forwarding to moderation URL:', MODERATION_URL)
      proxied = await fetch(MODERATION_URL, {
        method: 'POST',
        body: externalFormData,
        signal: controller.signal,
      })
    } catch (err) {
      clearTimeout(timeoutId)
      console.error('[api/image/validate] fetch failed:', err)
      return NextResponse.json(
        { error: 'Moderation service unavailable', is_valid: false, service_unavailable: true },
        { status: 503 }
      )
    }

    clearTimeout(timeoutId)

    let data: any = null
    try {
      data = await proxied.json()
    } catch {
      /* ignore non-JSON */
    }

    console.log('[api/image/validate] Moderation response status:', proxied.status)

    if (!proxied.ok) {
      return NextResponse.json(
        {
          error: data?.error || `Moderation service error ${proxied.status}`,
          is_valid: false,
          service_unavailable: proxied.status >= 500,
        },
        { status: proxied.status }
      )
    }

    // Expect the moderation service to return an is_valid flag
    const isValid = Boolean(data?.is_valid)

    return NextResponse.json(
      {
        is_valid: isValid,
        sector: data?.sector ?? null,
        category: data?.category ?? null,
        confidence_vlm: data?.confidence_vlm ?? null,
        confidence_vit: data?.confidence_vit ?? null,
        service_unavailable: false,
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('[api/image/validate] proxy error:', errorMessage)
    return NextResponse.json(
      { error: errorMessage, is_valid: false, service_unavailable: true },
      { status: 500 }
    )
  }
}
