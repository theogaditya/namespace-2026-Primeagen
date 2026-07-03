import axios from 'axios'

/**
 * Types for moderation service response (agents service /api/moderate)
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
  // New fields from agents service Abuse AI
  explanation_en?: string
  explanation_hi?: string
  flagged_phrases?: string[]
}

// Agents service moderation endpoint (replaces old Python abuse detector)
const AGENTS_URL = process.env.AGENTS_SERVICE_URL || 'http://localhost:3040'
const MODERATION_ENDPOINT = `${AGENTS_URL}/api/moderate`
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || ''

/**
 * Call agents service moderation endpoint (Abuse AI -Agent 4).
 * @param body Object containing `text` and optional `complaint_id` and `user_id` fields
 * @returns ModerationResult parsed from the agents service
 * @throws Error on network / parsing failures
 */
export async function moderateText(body: { text: string; complaint_id?: string; user_id?: string }): Promise<ModerationResult> {
  if (!INTERNAL_API_KEY) {
    throw new Error('INTERNAL_API_KEY not configured for agents service moderation')
  }

  try {
    const res = await axios.post(MODERATION_ENDPOINT, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Api-Key': INTERNAL_API_KEY,
      },
      timeout: 15_000, // 15s timeout (LLM-based moderation can be slower)
    })

    if (!res || !res.data) throw new Error('Empty response from agents moderation service')

    return res.data as ModerationResult
  } catch (err: any) {
    if (err?.response) {
      let respBody: string
      try {
        respBody = typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)
      } catch (e) {
        respBody = String(err.response.data)
      }
      const msg = `Agents moderation error: ${err.response.status} ${err.response.statusText} - ${respBody}`
      throw new Error(msg)
    }

    const msg = `Agents moderation request failed: ${err?.message || String(err)}`
    throw new Error(msg)
  }
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
