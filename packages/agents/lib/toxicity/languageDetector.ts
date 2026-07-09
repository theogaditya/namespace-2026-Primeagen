/**
 * Language / script detection for multilingual abuse moderation.
 *
 * Detects whether a piece of text is primarily English, Hindi (Devanagari),
 * Hinglish (romanised Hindi), or a mix — so the pipeline can route to the
 * appropriate toxicity model.
 */

export type DetectedLanguage = "english" | "hindi" | "hinglish" | "mixed";

/**
 * Unicode range for Devanagari script (used by Hindi, Marathi, Sanskrit, etc.)
 */
const DEVANAGARI_RE = /[\u0900-\u097F]/;

/**
 * Common romanised Hindi / Hinglish tokens.
 * These appear frequently in Hinglish social-media text and are NOT normal
 * English vocabulary.  We keep the list intentionally conservative — the full
 * profanity lexicon lives in hinglish_lexicon.json.
 */
const HINGLISH_MARKERS =
  /\b(hai|hain|nahi|nahin|karo|kya|bhai|yaar|saala|sala|harami|haraami|kamina|kamine|kamini|madarchod|bhenchod|bahenchod|kutte|kutiya|gandu|gaandu|chutiya|chutia|bc|mc|abe|accha|acha|bohot|bahut|lekin|matlab|tera|tere|mera|mere|kuch|kuchh|tumhara|humara|wala|waale|wali)\b/i;

/**
 * Simple Latin-script check (a-z ignoring case).
 */
const LATIN_RE = /[a-zA-Z]/;

/**
 * Detect the dominant language/script of the input text.
 *
 * Detection priority:
 * 1. If Devanagari + Latin both present → `mixed`
 * 2. If Devanagari only → `hindi`
 * 3. If Latin + Hinglish markers → `hinglish`
 * 4. Otherwise → `english`
 */
export function detectLanguage(text: string): DetectedLanguage {
  const hasDevanagari = DEVANAGARI_RE.test(text);
  const hasLatin = LATIN_RE.test(text);

  if (hasDevanagari && hasLatin) return "mixed";
  if (hasDevanagari) return "hindi";

  // Pure Latin script — check for Hinglish markers
  if (hasLatin && HINGLISH_MARKERS.test(text)) return "hinglish";

  return "english";
}
