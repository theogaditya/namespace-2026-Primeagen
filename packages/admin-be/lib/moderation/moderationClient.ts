import axios from 'axios'

/**
 * Types for moderation service response
 */
export interface FlaggedSpan {
  start: number
  end: number
  original: string
  masked: string
  lang: string
  category: string
  severity: string
  confidence: number
}

export interface ModerationResult {
  has_abuse: boolean
  original_text: string
  clean_text: string
  severity: string
  flagged_spans: FlaggedSpan[]
}

// Default moderation endpoint (fallback). Can be overridden with env `MODERATION_URL` or `DEFAULT_MODERATION_URL`.
// The service exposes OpenAPI at /openapi.json which lists the POST path `/api/v1/moderate`.
const DEFAULT_URL = process.env.DEFAULT_MODERATION_URL || 'http://34.204.187.187:8001/api/v1/moderate';

/**
 * Call remote moderation API to check text for abuse.
 * @param body Object containing `text` and optional `complaint_id` and `user_id` fields
 * @returns ModerationResult parsed from the moderation service
 * @throws Error on network / parsing failures
 */
export async function moderateText(body: { text: string; complaint_id?: string; user_id?: string }): Promise<ModerationResult> {
  const url = process.env.MODERATION_URL || DEFAULT_URL

  if (!url) {
    throw new Error('Moderation service URL not configured. Set MODERATION_URL or DEFAULT_MODERATION_URL')
  }

  try {
    const res = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 8_000, // 8s timeout
    })

    // Basic validation
    if (!res || !res.data) throw new Error('Empty response from moderation service')

    // Cast - caller should validate fields further if needed
    return res.data as ModerationResult
  } catch (err: any) {
    // Build a helpful error message including response body when available
    if (err?.response) {
      // Extract response body safely (don't shadow the request `body` param)
      let respBody: string
      try {
        respBody = typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)
      } catch (e) {
        respBody = String(err.response.data)
      }

      // If it's a 404, attempt a small set of candidate POST paths (fallback attempts)
      if (err.response.status === 404) {
        try {
          const tried = await tryPostFallbacks(url, body)
          if (tried.success) return tried.result as ModerationResult
        } catch (fallbackErr: any) {
          // fallback attempts failed; continue to probing below to collect diagnostics
        }

        try {
          const probes = await probeModerationEndpoints(url)
          const msg = `Moderation service error: 404 Not Found - ${respBody} ; probes: ${JSON.stringify(probes)}`
          throw new Error(msg)
        } catch (probeErr: any) {
          const msg = `Moderation service error: 404 Not Found - ${respBody} ; probe failed: ${probeErr?.message || String(probeErr)}`
          throw new Error(msg)
        }
      }

      const msg = `Moderation service error: ${err.response.status} ${err.response.statusText} - ${respBody}`
      throw new Error(msg)
    }

    const msg = `Moderation request failed: ${err?.message || String(err)}`
    throw new Error(msg)
  }
}

/**
 * Probe common endpoints on the moderation server to help debug 404s.
 * Returns an array of { path, status, snippet } for each probe.
 */
async function probeModerationEndpoints(fullUrl: string): Promise<Array<{ path: string; status: number | string; snippet: string }>> {
  const results: Array<{ path: string; status: number | string; snippet: string }> = []
  let origin = fullUrl
  try {
    const u = new URL(fullUrl)
    origin = u.origin
  } catch (e) {
    // leave origin as-is
  }

  const candidates = ['/', '/docs', '/openapi.json', '/redoc', '/moderation', '/moderation/']
  for (const p of candidates) {
    try {
      const r = await axios.get(origin + p, { timeout: 4_000, validateStatus: () => true })
      let snippet = ''
      try {
        const data = r.data
        snippet = typeof data === 'string' ? data.slice(0, 300) : JSON.stringify(data).slice(0, 300)
      } catch (e) {
        snippet = String(r.data).slice(0, 300)
      }
      results.push({ path: p, status: r.status, snippet })
    } catch (e: any) {
      results.push({ path: p, status: e?.message || 'error', snippet: '' })
    }
  }

  return results
}

/**
 * Try a list of candidate POST endpoints (on the same origin) when the configured URL returns 404.
 * Returns { success, result } where result is the ModerationResult when success=true.
 */
async function tryPostFallbacks(fullUrl: string, body: { text: string; complaint_id?: string; user_id?: string }): Promise<{ success: boolean; result?: ModerationResult }> {
  let origin = fullUrl
  try {
    const u = new URL(fullUrl)
    origin = u.origin
  } catch (e) {
    // ignore
  }

  const candidates = [
    '/api/v1/moderate',
    '/api/v1/moderate_text',
    '/moderation/moderate_text_api_v1_moderate_post',
    '/moderation/moderate',
    '/moderation',
  ]

  for (const p of candidates) {
    try {
      const r = await axios.post(origin + p, body, { headers: { 'Content-Type': 'application/json' }, timeout: 6_000, validateStatus: () => true })
      if (r.status >= 200 && r.status < 300 && r.data) {
        return { success: true, result: r.data as ModerationResult }
      }
      // if 404 continue trying next candidate
    } catch (e) {
      // ignore and try next
    }
  }

  return { success: false }
}

/**
 * Helper that calls `moderateText` and returns `null` on failure (non-throwing).
 */
export async function moderateTextSafe(body: { text: string; complaint_id?: string; user_id?: string }): Promise<ModerationResult | null> {
  try {
    return await moderateText(body)
  } catch (e) {
    console.warn('[moderationClient] moderateTextSafe error:', e)
    return null
  }
}

export default { moderateText, moderateTextSafe }
