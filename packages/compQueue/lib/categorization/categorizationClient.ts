/**
 * Categorization client — calls the agents service /api/categorize endpoint
 * to standardize complaint sub-categories.
 *
 * This replaces the direct Vertex AI call. The agents service runs the
 * CategorizationAI agent (LLM-based, using the same 200 labels that were
 * used to fine-tune the Vertex AI model).
 *
 * Falls back to the original subCategory text on failure.
 */

import axios from 'axios';

const AGENTS_URL = process.env.AGENTS_SERVICE_URL || 'http://localhost:3040';
const CATEGORIZE_ENDPOINT = `${AGENTS_URL}/api/categorize`;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

export interface CategorizeResult {
  label: string;
  fromCache: boolean;
}

/**
 * Standardize a complaint sub-category via the agents service.
 * @param text  The raw sub-category / complaint description
 * @returns     The standardized label string
 * @throws      Error on network / service failures
 */
export async function categorizeViaAgents(text: string): Promise<string> {
  if (!text || text.trim().length === 0) {
    return 'uncategorized description';
  }

  if (!INTERNAL_API_KEY) {
    console.warn('[categorizeViaAgents] INTERNAL_API_KEY not configured');
    return text;
  }

  try {
    const res = await axios.post<{ success: boolean; label: string; fromCache: boolean }>(
      CATEGORIZE_ENDPOINT,
      { text: text.trim() },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Api-Key': INTERNAL_API_KEY,
        },
        timeout: 15_000, // 15s timeout (LLM calls can be slow)
      }
    );

    if (res.data?.success && res.data?.label) {
      const source = res.data.fromCache ? 'cache' : 'LLM';
      console.log(`[categorizeViaAgents] "${text}" → "${res.data.label}" (${source})`);
      return res.data.label;
    }

    console.warn('[categorizeViaAgents] Unexpected response:', res.data);
    return text;
  } catch (err: any) {
    const msg = err?.response
      ? `${err.response.status} ${err.response.statusText}`
      : err?.message || String(err);
    console.warn(`[categorizeViaAgents] Failed: ${msg}, falling back to original`);
    return text;
  }
}

/**
 * Safe wrapper — never throws, always returns a string.
 */
export async function categorizeViaAgentsSafe(text: string): Promise<string> {
  try {
    return await categorizeViaAgents(text);
  } catch {
    return text || 'uncategorized description';
  }
}
