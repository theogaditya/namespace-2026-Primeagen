import type { PrismaClient } from "../../prisma/generated/client/client";
import { CATEGORY_MAP, simpleStem } from "./constants";
import type { SurveyDocument } from "./processor";

interface RawSurveyRecord {
  id: string;
  source_type: string;
  category: string;
  content: string;
  source_url?: string;
}

let _surveyDataset: SurveyDocument[] | null = null;
let _invertedIndex: Map<string, Set<number>> | null = null;
let _docFreqs: Map<string, number> | null = null;
let _avgDocLen = 0;


function loadSurveyDataset(): SurveyDocument[] {
  if (_surveyDataset) return _surveyDataset;

  const dataPath = require("path").join(__dirname, "..", "datasets", "survey_data.json");
  const raw: RawSurveyRecord[] = JSON.parse(
    require("fs").readFileSync(dataPath, "utf-8")
  );

  _surveyDataset = raw.map((r) => ({
    id: r.id,
    sourceType: r.source_type,
    category: r.category,
    content: r.content,
    sourceUrl: r.source_url,
  }));


  _invertedIndex = new Map();
  _docFreqs = new Map();
  let totalLen = 0;

  for (let i = 0; i < _surveyDataset.length; i++) {
    const tokens = tokenize(_surveyDataset[i]!.content);
    totalLen += tokens.length;
    const seen = new Set<string>();

    for (const token of tokens) {
      if (!_invertedIndex.has(token)) {
        _invertedIndex.set(token, new Set());
      }
      _invertedIndex.get(token)!.add(i);

      if (!seen.has(token)) {
        seen.add(token);
        _docFreqs.set(token, (_docFreqs.get(token) || 0) + 1);
      }
    }
  }

  _avgDocLen = totalLen / _surveyDataset.length;

  return _surveyDataset;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter((t) => t.length > 1);
}

function tokenizeWithStems(text: string): string[] {
  const raw = tokenize(text);
  const withStems = new Set(raw);
  for (const t of raw) {
    const stemmed = simpleStem(t);
    if (stemmed !== t) withStems.add(stemmed);
  }
  return [...withStems];
}


const BM25_K1 = 1.5;
const BM25_B = 0.75;

export function retrieveSurveyDocs(
  category: string,
  query: string,
  topK = 20
): SurveyDocument[] {
  const dataset = loadSurveyDataset();
  const invertedIndex = _invertedIndex!;
  const docFreqs = _docFreqs!;
  const N = dataset.length;

  const categoryInfo = CATEGORY_MAP[category];
  const allowedCategories = categoryInfo
    ? new Set(categoryInfo.surveyCategories.map((c) => c.toLowerCase()))
    : null;
  const keywords = categoryInfo?.keywords || [];

  // ── Strategy 1: Category-first retrieval (case-insensitive) ──
  // Collect ALL docs that match the allowed survey categories
  const categoryMatchIndices: number[] = [];
  if (allowedCategories) {
    for (let i = 0; i < dataset.length; i++) {
      if (allowedCategories.has(dataset[i]!.category.toLowerCase())) {
        categoryMatchIndices.push(i);
      }
    }
  }

  if (categoryMatchIndices.length > 0) {
    // We have category matches — now rank them using BM25 + keywords
    const queryTokens = [
      ...tokenizeWithStems(query),
      ...keywords.map((k) => k.toLowerCase()),
    ];
    // Deduplicate query tokens
    const uniqueQueryTokens = [...new Set(queryTokens)];

    const scored: { idx: number; score: number }[] = [];

    for (const docIdx of categoryMatchIndices) {
      const doc = dataset[docIdx]!;
      const docTokens = tokenize(doc.content);
      const docLen = docTokens.length;

      let score = 0;
      for (const qToken of uniqueQueryTokens) {
        const df = docFreqs.get(qToken) || 0;
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

        let tf = 0;
        for (const t of docTokens) {
          if (t === qToken) tf++;
        }

        const tfNorm =
          (tf * (BM25_K1 + 1)) /
          (tf + BM25_K1 * (1 - BM25_B + BM25_B * (docLen / _avgDocLen)));

        score += idf * tfNorm;
      }

      // Base score to ensure every category-matched doc gets included
      score += 0.1;

      scored.push({ idx: docIdx, score });
    }

    scored.sort((a, b) => b.score - a.score);
    const topDocs = scored.slice(0, topK);

    return topDocs.map(({ idx, score }) => ({
      ...dataset[idx]!,
      score,
    }));
  }

  // ── Strategy 2: BM25 keyword search (fallback when no category match) ──
  const queryTokens = [
    ...tokenizeWithStems(query),
    ...keywords.map((k) => k.toLowerCase()),
  ];
  const uniqueQueryTokens = [...new Set(queryTokens)];

  const scores = new Map<number, number>();

  for (const qToken of uniqueQueryTokens) {
    const postings = invertedIndex.get(qToken);
    if (!postings) continue;

    const df = docFreqs.get(qToken) || 0;
    const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

    for (const docIdx of postings) {
      const doc = dataset[docIdx]!;
      const docTokens = tokenize(doc.content);
      const docLen = docTokens.length;

      let tf = 0;
      for (const t of docTokens) {
        if (t === qToken) tf++;
      }

      const tfNorm =
        (tf * (BM25_K1 + 1)) /
        (tf + BM25_K1 * (1 - BM25_B + BM25_B * (docLen / _avgDocLen)));

      scores.set(docIdx, (scores.get(docIdx) || 0) + idf * tfNorm);
    }
  }

  const sortedIndices = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK);

  return sortedIndices.map(([idx, score]) => ({
    ...dataset[idx]!,
    score,
  }));
}

export async function retrieveBackendDocs(
  db: PrismaClient,
  category: string,
  topK = 20
): Promise<SurveyDocument[]> {
  const categoryInfo = CATEGORY_MAP[category];
  const backendCategories = categoryInfo?.backendCategories || [];
  const keywords = categoryInfo?.keywords || [];

  const selectFields = {
    id: true as const,
    seq: true as const,
    description: true as const,
    subCategory: true as const,
    status: true as const,
    urgency: true as const,
    submissionDate: true as const,
    upvoteCount: true as const,
    qualityScore: true as const,
    escalationLevel: true as const,
    assignedDepartment: true as const,
    category: { select: { name: true as const } },
    location: { select: { district: true as const, city: true as const } },
  };

  // Strategy 1: Exact category match
  let complaints = await db.complaint.findMany({
    where: {
      status: { not: "DELETED" },
      ...(backendCategories.length > 0
        ? { category: { name: { in: backendCategories } } }
        : {}),
    },
    select: selectFields,
    orderBy: { submissionDate: "desc" },
    take: topK * 3,
  });

  // Strategy 2: If no results from exact match, try keyword search in descriptions
  if (complaints.length === 0 && keywords.length > 0) {
    const keywordConditions = keywords.slice(0, 5).map((kw) => ({
      description: { contains: kw, mode: "insensitive" as const },
    }));

    complaints = await db.complaint.findMany({
      where: {
        status: { not: "DELETED" },
        OR: keywordConditions,
      },
      select: selectFields,
      orderBy: { submissionDate: "desc" },
      take: topK * 3,
    });
  }

  // Strategy 3: If still no results, fetch ALL complaints as fallback
  if (complaints.length === 0) {
    complaints = await db.complaint.findMany({
      where: {
        status: { not: "DELETED" },
      },
      select: selectFields,
      orderBy: { submissionDate: "desc" },
      take: topK * 3,
    });
  }

  return complaints.map((c) => ({
    id: c.id,
    sourceType: "citizen_complaint",
    category: c.category.name,
    content: [
      `[${c.category.name}/${c.subCategory}]`,
      c.description,
      c.location
        ? `Location: ${[c.location.city, c.location.district].filter(Boolean).join(", ")}`
        : "",
      `Status: ${c.status} | Urgency: ${c.urgency}`,
      c.escalationLevel ? `Escalation: ${c.escalationLevel}` : "",
      c.assignedDepartment ? `Department: ${c.assignedDepartment}` : "",
    ]
      .filter(Boolean)
      .join(" — "),
    sourceUrl: undefined,
  }));
}
