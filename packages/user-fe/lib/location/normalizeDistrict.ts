/**
 * Well-known alias mappings for district names.
 * Keys are lowercase. Values are the canonical names stored in the DB.
 */
const DISTRICT_ALIAS_MAP: Record<string, string> = {
  khordha: "Khorda",
  khurda: "Khorda",
  bhubaneswar: "Khorda",
  "bhubaneswar (m.corp.)": "Khorda",
};

/**
 * Normalises a raw district name coming from a geocoder (Google or Nominatim)
 * into the canonical form used in our operating-districts list.
 *
 * - Collapses whitespace
 * - Strips common suffixes added by Nominatim ("… District", "… Zila", etc.)
 * - Applies the alias map for known spelling variants
 */
export function normalizeDistrictName(value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  // Collapse internal whitespace
  let name = trimmed.replace(/\s+/g, " ");

  // Strip common geocoder suffixes (case-insensitive)
  // e.g. "Khorda District" → "Khorda", "Puri Zila" → "Puri"
  name = name.replace(/\s+(district|zila|zilah|tehsil|taluk|taluka|subdivision)$/i, "").trim();

  // Strip municipal corporation suffixes (e.g. "Bhubaneswar (M.Corp.)")
  name = name.replace(/\s*\(\s*m\.corp\.\s*\)$/i, "").trim();
  name = name.replace(/\s*\(\s*m\s*corp\s*\)$/i, "").trim();

  // Apply alias map (lookup by lowercase key)
  return DISTRICT_ALIAS_MAP[name.toLowerCase()] ?? name;
}
