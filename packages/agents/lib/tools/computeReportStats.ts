import type { RawComplaintData } from "./fetchAllComplaintsForReport";

// ── Exported interfaces ─────────────────────────────────────────────────────

export interface ReportStats {
  // Totals
  total: number;
  byStatus: Record<string, number>;
  byUrgency: Record<string, number>;
  byCategory: Record<string, number>;
  byDepartment: Record<string, number>;
  byDistrict: Record<string, number>;

  // Resolution metrics
  resolved: number;
  resolutionRate: number;
  avgResolutionDays: number;
  slaBreachCount: number;

  // Quality
  avgQualityScore: number;
  qualityDistribution: Record<"poor" | "fair" | "good" | "excellent", number>;

  // Escalations
  escalatedToState: number;
  escalatedToSuperState: number;

  // Duplicates & abuse
  duplicateCount: number;
  abuseCount: number;

  // Top performers & hotspots
  topDistrictsByVolume: { district: string; count: number }[];
  topCategoryByVolume: string;
  mostUrgentDistrict: string;

  // Trending sub-categories (top 10 by count)
  topSubCategories: { name: string; count: number }[];

  // High-upvote complaints (top 5)
  mostUpvotedComplaints: {
    id: string;
    seq: number;
    description: string;
    upvotes: number;
    category: string;
  }[];

  // Time-series snapshot (last 12 months)
  monthlyVolume: { month: string; count: number }[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function countBy<T>(arr: T[], keyFn: (item: T) => string | null): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of arr) {
    const key = keyFn(item) || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function topN(record: Record<string, number>, n: number): { key: string; count: number }[] {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function qualityBucket(score: number | null): "poor" | "fair" | "good" | "excellent" {
  if (score === null || score === undefined) return "poor";
  if (score >= 76) return "excellent";
  if (score >= 51) return "good";
  if (score >= 26) return "fair";
  return "poor";
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// ── Main computation ────────────────────────────────────────────────────────

/**
 * Pure computation. Transforms raw complaint data into aggregate statistics.
 * Zero DB calls, zero LLM calls.
 */
export function computeReportStats(complaints: RawComplaintData[]): ReportStats {
  const total = complaints.length;

  // ── Group-by counts ───────────────────────────────────────────────────────
  const byStatus = countBy(complaints, (c) => c.status);
  const byUrgency = countBy(complaints, (c) => c.urgency);
  const byCategory = countBy(complaints, (c) => c.category);
  const byDepartment = countBy(complaints, (c) => c.assignedDepartment);
  const byDistrict = countBy(complaints, (c) => c.district);

  // ── Resolution metrics ────────────────────────────────────────────────────
  const resolved = complaints.filter((c) => c.status === "COMPLETED").length;
  const resolutionRate = total > 0 ? +((resolved / total) * 100).toFixed(2) : 0;

  const resolvedWithDates = complaints.filter(
    (c) => c.status === "COMPLETED" && c.dateOfResolution
  );
  const totalResolutionDays = resolvedWithDates.reduce((sum, c) => {
    return sum + daysBetween(c.submissionDate, c.dateOfResolution!);
  }, 0);
  const avgResolutionDays =
    resolvedWithDates.length > 0
      ? +(totalResolutionDays / resolvedWithDates.length).toFixed(2)
      : 0;

  // SLA breach: complaints that have an SLA string and are not completed
  // or completed past their SLA deadline. Simple heuristic: if status != COMPLETED
  // and SLA is set, count as potential breach.
  const slaBreachCount = complaints.filter((c) => {
    if (!c.sla) return false;
    // If resolved, check if resolution exceeded SLA days
    if (c.status === "COMPLETED" && c.dateOfResolution) {
      const slaDays = parseInt(c.sla, 10);
      if (!isNaN(slaDays)) {
        return daysBetween(c.submissionDate, c.dateOfResolution) > slaDays;
      }
    }
    // If not completed and SLA set, check if current date > submission + SLA days
    const slaDays = parseInt(c.sla, 10);
    if (!isNaN(slaDays)) {
      const deadline = new Date(c.submissionDate.getTime() + slaDays * 24 * 60 * 60 * 1000);
      return new Date() > deadline && c.status !== "COMPLETED";
    }
    return false;
  }).length;

  // ── Quality ───────────────────────────────────────────────────────────────
  const complaintsWithQuality = complaints.filter(
    (c) => c.qualityScore !== null && c.qualityScore !== undefined
  );
  const avgQualityScore =
    complaintsWithQuality.length > 0
      ? +(
          complaintsWithQuality.reduce((sum, c) => sum + (c.qualityScore ?? 0), 0) /
          complaintsWithQuality.length
        ).toFixed(2)
      : 0;

  const qualityDistribution: Record<"poor" | "fair" | "good" | "excellent", number> = {
    poor: 0,
    fair: 0,
    good: 0,
    excellent: 0,
  };
  for (const c of complaints) {
    qualityDistribution[qualityBucket(c.qualityScore)]++;
  }

  // ── Escalations ───────────────────────────────────────────────────────────
  const escalatedToState = complaints.filter((c) => c.isEscalatedToState).length;
  const escalatedToSuperState = complaints.filter((c) => c.isEscalatedToSuperState).length;

  // ── Duplicates & abuse ────────────────────────────────────────────────────
  const duplicateCount = complaints.filter((c) => c.isDuplicate === true).length;
  const abuseCount = complaints.filter((c) => c.isAbused === true).length;

  // ── Top districts ─────────────────────────────────────────────────────────
  const topDistrictsByVolume = topN(byDistrict, 5).map(({ key, count }) => ({
    district: key,
    count,
  }));

  const topCategoryByVolume =
    topN(byCategory, 1)[0]?.key || "Unknown";

  // Most urgent district: highest CRITICAL + HIGH count
  const urgentByDistrict: Record<string, number> = {};
  for (const c of complaints) {
    if (c.urgency === "CRITICAL" || c.urgency === "HIGH") {
      const d = c.district || "Unknown";
      urgentByDistrict[d] = (urgentByDistrict[d] || 0) + 1;
    }
  }
  const mostUrgentDistrict =
    topN(urgentByDistrict, 1)[0]?.key || "Unknown";

  // ── Sub-categories ────────────────────────────────────────────────────────
  const subCatCounts = countBy(complaints, (c) => c.subCategory);
  const topSubCategories = topN(subCatCounts, 10).map(({ key, count }) => ({
    name: key,
    count,
  }));

  // ── Most upvoted ──────────────────────────────────────────────────────────
  const mostUpvotedComplaints = [...complaints]
    .sort((a, b) => b.upvoteCount - a.upvoteCount)
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      seq: c.seq,
      description: c.description.substring(0, 200),
      upvotes: c.upvoteCount,
      category: c.category,
    }));

  // ── Monthly volume (last 12 months) ───────────────────────────────────────
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const monthlyMap: Record<string, number> = {};

  // Initialize all 12 months with 0
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    monthlyMap[monthKey(d)] = 0;
  }

  for (const c of complaints) {
    if (c.submissionDate >= twelveMonthsAgo) {
      const key = monthKey(c.submissionDate);
      if (key in monthlyMap) {
        monthlyMap[key] = (monthlyMap[key] ?? 0) + 1;
      }
    }
  }

  const monthlyVolume = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  return {
    total,
    byStatus,
    byUrgency,
    byCategory,
    byDepartment,
    byDistrict,
    resolved,
    resolutionRate,
    avgResolutionDays,
    slaBreachCount,
    avgQualityScore,
    qualityDistribution,
    escalatedToState,
    escalatedToSuperState,
    duplicateCount,
    abuseCount,
    topDistrictsByVolume,
    topCategoryByVolume,
    mostUrgentDistrict,
    topSubCategories,
    mostUpvotedComplaints,
    monthlyVolume,
  };
}
