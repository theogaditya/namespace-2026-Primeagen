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
  // Temporary bypass: always mark images as valid to avoid blocking uploads.
  // Revert this change to re-enable moderation.
  return NextResponse.json(
    {
      is_valid: true,
      sector: null,
      category: null,
      confidence_vlm: null,
      confidence_vit: null,
      service_unavailable: false,
      source: 'moderation-bypassed',
    },
    { status: 200 }
  )
}
