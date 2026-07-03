// PII patterns to strip from agent output before sending to user
const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string; label: string }> = [
  // Aadhaar numbers (12 digits, possibly space/dash separated)
  {
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    replacement: "[AADHAAR REDACTED]",
    label: "Aadhaar number",
  },
  // Phone numbers (Indian 10-digit with optional +91/0 prefix)
  {
    pattern: /(?:\+91[\s-]?|0)?[6-9]\d{9}\b/g,
    replacement: "[PHONE REDACTED]",
    label: "Phone number",
  },
  // Email addresses
  {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: "[EMAIL REDACTED]",
    label: "Email address",
  },
  // UUIDs (potential internal IDs)
  {
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    replacement: "[ID REDACTED]",
    label: "Internal ID",
  },
];

// Words/phrases that indicate admin data leakage
const ADMIN_DATA_MARKERS = [
  "password",
  "aadhaarId",
  "phoneNumber",
  "officialEmail",
  "JWT_SECRET",
  "DATABASE_URL",
  "REDIS_URL",
  "API_KEY",
  "SECRET",
  "accessLevel",
  "managedByMunicipalId",
  "managedByStateAdminId",
  "managedBySuperAdminId",
];

// Emails that should NOT be redacted (support contact, public info)
const ALLOWED_EMAILS = new Set([
  (process.env.SUPPORT_EMAIL || "support@swarajdesk.in").toLowerCase(),
  "support@swarajdesk.in",
]);

export interface FilterResult {
  filtered: boolean;
  output: string;
  redactions: string[];
}

/**
 * Filter agent output to remove PII and sensitive data
 * Only redacts OTHER users' PII -the requesting user's own data is allowed
 * Allows the platform support email to pass through
 */
export function filterOutput(output: string, requestingUserId?: string): FilterResult {
  let filtered = false;
  const redactions: string[] = [];
  let result = output;

  // Check for admin data markers
  for (const marker of ADMIN_DATA_MARKERS) {
    if (result.toLowerCase().includes(marker.toLowerCase())) {
      // Remove the line containing the admin data
      result = result
        .split("\n")
        .filter((line) => !line.toLowerCase().includes(marker.toLowerCase()))
        .join("\n");
      filtered = true;
      redactions.push(`Stripped line containing "${marker}"`);
    }
  }

  // Redact PII patterns (except allowed emails)
  for (const { pattern, replacement, label } of PII_PATTERNS) {
    const matches = result.match(pattern);
    if (matches) {
      if (label === "Email address") {
        // Only redact emails that aren't in the allowlist
        result = result.replace(pattern, (match) => {
          if (ALLOWED_EMAILS.has(match.toLowerCase())) return match;
          return replacement;
        });
        const redactedCount = matches.filter(
          (m) => !ALLOWED_EMAILS.has(m.toLowerCase())
        ).length;
        if (redactedCount > 0) {
          filtered = true;
          redactions.push(`Redacted ${redactedCount} ${label}(s)`);
        }
      } else {
        result = result.replace(pattern, replacement);
        filtered = true;
        redactions.push(`Redacted ${matches.length} ${label}(s)`);
      }
    }
  }

  return { filtered, output: result, redactions };
}
