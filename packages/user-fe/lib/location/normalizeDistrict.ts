const DISTRICT_ALIAS_MAP: Record<string, string> = {
  khordha: "Khorda",
};

export function normalizeDistrictName(value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const collapsed = trimmed.replace(/\s+/g, " ");
  return DISTRICT_ALIAS_MAP[collapsed.toLowerCase()] ?? collapsed;
}
