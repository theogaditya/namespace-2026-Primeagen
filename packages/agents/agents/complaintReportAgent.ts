import type { PrismaClient } from "../prisma/generated/client/client";
import { getChatModel } from "../lib/models/provider";
import { fetchAllComplaintsForReport } from "../lib/tools/fetchAllComplaintsForReport";
import { computeReportStats, type ReportStats } from "../lib/tools/computeReportStats";
import { REPORT_AGENT_SYSTEM_PROMPT, ReportSchema, type ComplaintReport } from "../lib/prompts/reportAgent";

// ── Public interface ────────────────────────────────────────────────────────

export interface ComplaintReportAgentOptions {
  db: PrismaClient;
  onProgress?: (phase: "retrieval" | "reranking" | "synthesis", detail?: string) => void;
  onToken?: (chunk: string) => void;
  onComplete?: (report: ComplaintReport) => void;
  onStats?: (stats: ReportStats) => void;
}

export interface ComplaintReportAgentResult {
  report: ComplaintReport;
  stats: ReportStats;
}

/**
 * Two-phase report agent:
 *   Phase 1 -Fetch complaints + compute stats (no LLM)
 *   Phase 2 -Stream LLM generation, then parse structured output
 */
export async function runComplaintReportAgent(
  options: ComplaintReportAgentOptions
): Promise<ComplaintReportAgentResult> {
  const { db, onProgress, onToken, onComplete, onStats } = options;

  // agent start (no noisy logs)

  // ── Phase 1: Data collection ──────────────────────────────────────────────
  onProgress?.("retrieval", "Fetching all complaints from database");
  let rawComplaints;
  try {
    rawComplaints = await fetchAllComplaintsForReport(db);
  } catch (dbErr) {
    console.error("[ComplaintReportAgent] DB fetch FAILED:", dbErr);
    throw dbErr;
  }

  onProgress?.("reranking", "Computing aggregate statistics");
  const stats = computeReportStats(rawComplaints);
  onStats?.(stats);

  // ── Phase 2: LLM generation (single structured call) ────────────────────────
  onProgress?.("synthesis", "Generating intelligence report via LLM");

  const model = getChatModel("chat", { maxTokens: 8192 });

  const humanMessage = `Generate the report based on these statistics:\n${JSON.stringify(stats, null, 2)}\n\nCurrent timestamp: ${new Date().toISOString()}`;

  const messages = [
    { role: "system" as const, content: REPORT_AGENT_SYSTEM_PROMPT },
    { role: "user" as const, content: humanMessage },
  ];

  // Emit status tokens for the client (SSE)
  onToken?.(`📊 Fetched ${rawComplaints.length} complaints across ${Object.keys(stats.byDistrict).length} districts\n`);
  onToken?.(`📈 Resolution rate: ${stats.resolutionRate.toFixed(1)}% · SLA breaches: ${stats.slaBreachCount} · Escalations: ${stats.escalatedToState}\n`);
  onToken?.(`🔍 Top category: ${stats.topCategoryByVolume} · Most urgent district: ${stats.mostUrgentDistrict}\n`);
  onToken?.(`\n🤖 Running LLM synthesis (single structured call -~30-60s)...\n`);
  const t0 = Date.now();

  let structured;
  try {
    const structuredModel = model.withStructuredOutput(ReportSchema);
    structured = await structuredModel.invoke(messages);
  } catch (llmErr) {
    console.error("[ComplaintReportAgent] LLM call FAILED:", llmErr);
    throw llmErr;
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const report = structured as unknown as ComplaintReport;

  onToken?.(`\n✅ Report generated in ${elapsed}s\n`);
  onComplete?.(report);

  return { report, stats };
}
