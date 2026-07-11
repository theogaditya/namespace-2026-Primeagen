export interface SurveyDocument {
  id: string;
  sourceType: string;
  category: string;
  content: string;
  sourceUrl?: string;
  severity?: "high" | "medium" | "low";
  score?: number;
}

const DEFAULT_SIMILARITY_THRESHOLD = 0.85;


export function removeDuplicates(
  docs: SurveyDocument[],
  threshold = DEFAULT_SIMILARITY_THRESHOLD
): SurveyDocument[] {
  if (docs.length <= 1) return docs;

  const uniqueDocs: SurveyDocument[] = [];
  const uniqueTokenSets: Set<string>[] = [];

  for (const doc of docs) {
    const tokens = tokenize(doc.content);
    let isDuplicate = false;

    for (const existingTokens of uniqueTokenSets) {
      if (jaccardSimilarity(tokens, existingTokens) >= threshold) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      uniqueDocs.push(doc);
      uniqueTokenSets.push(tokens);
    }
  }

  return uniqueDocs;
}

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/\s+/).filter(Boolean));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}


const HIGH_SEVERITY_KEYWORDS = new Set([
  "death", "died", "fatal", "collapse", "collapsed", "dangerous",
  "hazardous", "toxic", "contaminated", "emergency", "critical",
  "severe", "urgent", "life-threatening", "accident", "major",
  "outbreak", "epidemic", "flooding", "fire", "explosion",
  "unsafe", "disease", "injury", "injured", "casualty",
]);

const HIGH_SEVERITY_PHRASES = [
  "no water", "no electricity", "complete failure",
];

const MEDIUM_SEVERITY_KEYWORDS = new Set([
  "broken", "damaged", "poor", "complaint", "inadequate",
  "insufficient", "irregular", "delay", "delayed", "pending",
  "shortage", "overflow", "blocked", "clogged", "frequent",
  "repeated", "missing", "absent", "stray", "unhygienic",
  "dirty", "overflowing", "pothole", "crack", "leak",
  "disruption", "unpaved",
]);

const MEDIUM_SEVERITY_PHRASES = ["low quality"];

const LOW_SEVERITY_KEYWORDS = new Set([
  "maintenance", "minor", "cosmetic", "improvement", "moderate",
  "occasional", "suggestion", "request", "feedback", "review",
  "assessment", "survey", "general", "routine", "normal",
]);

export function tagSeverity(docs: SurveyDocument[]): SurveyDocument[] {
  for (const doc of docs) {
    doc.severity = computeSeverity(doc.content);
  }
  return docs;
}

function computeSeverity(text: string): "high" | "medium" | "low" {
  const textLower = text.toLowerCase();
  const tokens = new Set(textLower.split(/\s+/));

  let highScore = 0;
  let mediumScore = 0;

  for (const token of tokens) {
    if (HIGH_SEVERITY_KEYWORDS.has(token)) highScore++;
    if (MEDIUM_SEVERITY_KEYWORDS.has(token)) mediumScore++;
  }

  for (const phrase of HIGH_SEVERITY_PHRASES) {
    if (textLower.includes(phrase)) highScore += 2;
  }
  for (const phrase of MEDIUM_SEVERITY_PHRASES) {
    if (textLower.includes(phrase)) mediumScore += 1;
  }

  if (highScore >= 1) return "high";
  if (mediumScore >= 1) return "medium";
  return "low";
}

export function buildContext(
  docs: SurveyDocument[],
  maxChars = 30000
): string {
  // Group by category
  const clusters = new Map<string, SurveyDocument[]>();
  for (const doc of docs) {
    const cat = doc.category || "uncategorized";
    if (!clusters.has(cat)) clusters.set(cat, []);
    clusters.get(cat)!.push(doc);
  }

  const parts: string[] = [];
  let totalChars = 0;

  for (const [category, categoryDocs] of clusters) {
    const header = `\n--- Category: ${category} (${categoryDocs.length} records) ---\n`;
    parts.push(header);
    totalChars += header.length;

    for (let i = 0; i < categoryDocs.length; i++) {
      const doc = categoryDocs[i]!;
      const metaParts: string[] = [];

      if (doc.sourceType) metaParts.push(`Source: ${doc.sourceType}`);
      if (doc.sourceUrl) metaParts.push(`URL: ${doc.sourceUrl}`);
      if (doc.severity) metaParts.push(`Severity: ${doc.severity}`);

      const metaLine = metaParts.length > 0 ? metaParts.join(" | ") : "";
      const entry = `\n[Document ${i + 1}] ${metaLine}\n${doc.content}\n`;

      if (totalChars + entry.length > maxChars) {
        parts.push(
          `\n... (truncated, ${categoryDocs.length - i} more documents) ...\n`
        );
        break;
      }

      parts.push(entry);
      totalChars += entry.length;
    }
  }

  return parts.join("");
}
