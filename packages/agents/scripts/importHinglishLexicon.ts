#!/usr/bin/env bun
/*
 * importHinglishLexicon.ts
 *
 * Reads `packages/agents/lib/datasets/Hinglish_Profanity_List.csv` and produces:
 *   1. packages/agents/lib/toxicity/hinglish_lexicon.json
 *      — compact runtime lookup: { token, meaning, severity, severityEnum }[]
 *   2. Prints a TypeScript-ready regex array to stdout (copy-paste into abuseAI.ts)
 *
 * Usage:
 *   bun packages/agents/scripts/importHinglishLexicon.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CSV_PATH = resolve(__dirname, "../lib/datasets/Hinglish_Profanity_List.csv");
const JSON_OUT = resolve(__dirname, "../lib/toxicity/hinglish_lexicon.json");

interface LexiconEntry {
  token: string;
  meaning: string;
  severity: number;
  severityEnum: "low" | "medium" | "high";
}

function numericToEnum(n: number): "low" | "medium" | "high" {
  if (n <= 3) return "low";
  if (n <= 6) return "medium";
  return "high";
}

function main() {
  const raw = readFileSync(CSV_PATH, "utf-8");
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const entries: LexiconEntry[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    // CSV format: token,meaning,severity (no header row)
    const parts = line.split(",");
    if (parts.length < 3) continue;

    const token = (parts[0] ?? "").trim().toLowerCase();
    const meaning = (parts[1] ?? "").trim();
    const severity = parseInt((parts[2] ?? "").trim(), 10);

    if (!token || isNaN(severity)) continue;
    if (seen.has(token)) continue; // deduplicate
    seen.add(token);

    entries.push({
      token,
      meaning,
      severity,
      severityEnum: numericToEnum(severity),
    });
  }

  // Sort by severity descending for readability
  entries.sort((a, b) => b.severity - a.severity);

  // Write JSON
  writeFileSync(JSON_OUT, JSON.stringify(entries, null, 2), "utf-8");
  console.log(`✅  Wrote ${entries.length} entries to ${JSON_OUT}`);

  // Print TypeScript regex array for copy-paste into PROFANITY_PATTERNS
  console.log("\n// --- Generated PROFANITY_PATTERNS (Hinglish Lexicon) ---");
  console.log("// Paste these into agents/abuseAI.ts PROFANITY_PATTERNS array\n");

  for (const e of entries) {
    // Escape regex special chars in token
    const escaped = e.token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    console.log(`/\\b${escaped}\\b/gi,  // ${e.meaning} (sev: ${e.severity} → ${e.severityEnum})`);
  }
}

main();
