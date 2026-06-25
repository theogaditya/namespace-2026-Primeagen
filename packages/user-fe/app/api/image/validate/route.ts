import { NextResponse } from 'next/server'

const MODERATION_URL = process.env.MODERATION_URL || process.env.IMAGE_VALIDATION_URL
const TIMEOUT_MS = 20000 // 20 second timeout

function unavailableFallback(reason: string, upstreamStatus?: number) {
  return NextResponse.json(
    {
      is_valid: false,
      sector: null,
      category: null,
      confidence_vlm: null,
      confidence_vit: null,
      service_unavailable: true,
      source: 'moderation-fallback',
      error: reason,
      upstream_status: upstreamStatus ?? null,
    },
    { status: 200 }
  )
}

export async function POST(req: Request) {
  if (!MODERATION_URL) {
    console.warn('[api/image/validate] MODERATION_URL is not configured, returning fallback response')
    return unavailableFallback('Moderation service unavailable (configuration missing)')
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
      const message = err instanceof Error ? err.message : String(err)
      console.warn('[api/image/validate] moderation fetch failed, returning fallback response:', message)
      return unavailableFallback('Moderation service unavailable')
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
      if (proxied.status >= 500) {
        console.warn(
          '[api/image/validate] moderation service returned 5xx, returning fallback response:',
          proxied.status
        )
        return unavailableFallback('Moderation service unavailable', proxied.status)
      }

      // For 4xx upstream responses, keep request flow non-blocking while marking invalid.
      return NextResponse.json(
        {
          is_valid: false,
          sector: null,
          category: null,
          confidence_vlm: null,
          confidence_vit: null,
          service_unavailable: false,
          source: 'moderation',
          error: data?.error || `Moderation rejected request (${proxied.status})`,
          upstream_status: proxied.status,
        },
        { status: 200 }
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
        source: data?.source ?? 'moderation',
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
