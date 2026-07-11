import type { PrismaClient } from "../prisma/generated/client/client";
import { resolveCategory, VALID_CATEGORIES } from "../lib/reportGenerator/constants";
import { retrieveSurveyDocs, retrieveBackendDocs } from "../lib/reportGenerator/retriever";
import { removeDuplicates, tagSeverity } from "../lib/reportGenerator/processor";
import {
  generateSurveyReport,
  generateBackendReport,
  generateFusionReport,
} from "../lib/reportGenerator/reportGenerators";
import type { SurveyReport, BackendReport, FusionReport } from "../lib/prompts/reportGeneratorAgent";


export type PipelinePhase =
  | "category_resolve"
  | "survey_retrieval"
  | "survey_processing"
  | "survey_generation"
  | "backend_retrieval"
  | "backend_processing"
  | "backend_generation"
  | "fusion_generation"
  | "complete";

export interface ReportGeneratorAgentOptions {
  db: PrismaClient;
  category: string;
  onProgress?: (phase: PipelinePhase, detail: string, elapsedMs?: number) => void;
  onToken?: (chunk: string) => void;
  onPhaseComplete?: (phase: string, report: Record<string, any>, elapsedMs: number) => void;
  onComplete?: (result: ReportGeneratorAgentResult) => void;
}

export interface ReportGeneratorAgentResult {
  success: boolean;
  category: string;
  resolvedCategory: string;
  surveyReport: SurveyReport;
  backendReport: BackendReport;
  fusionReport: FusionReport;
  pipelineMetadata: {
    totalTimeMs: number;
    phase12TimeMs: number;
    phase3TimeMs: number;
    surveyDocsRetrieved: number;
    backendDocsRetrieved: number;
  };
}

export async function runReportGeneratorAgent(
  options: ReportGeneratorAgentOptions
): Promise<ReportGeneratorAgentResult> {
  const { db, category: rawCategory, onProgress, onToken, onPhaseComplete, onComplete } = options;

  const pipelineStart = Date.now();

  onProgress?.("category_resolve", `Resolving category: "${rawCategory}"`, 0);

  const resolvedCategory = resolveCategory(rawCategory);
  const effectiveCategory = resolvedCategory || rawCategory;
  const isFreeText = !resolvedCategory;

  if (isFreeText) {
    onToken?.(`🔍 Free-text mode: "${rawCategory}" (no exact category match — searching across all data)\n`);
  } else {
    onToken?.(`📋 Category resolved: "${rawCategory}" → "${resolvedCategory}"\n`);
  }

  
  const phase12Start = Date.now();

  const [surveyResult, backendResult] = await Promise.all([
    runSurveyPhase(effectiveCategory, { onProgress, onToken, onPhaseComplete }),
    runBackendPhase(db, effectiveCategory, { onProgress, onToken, onPhaseComplete }),
  ]);

  const phase12TimeMs = Date.now() - phase12Start;
  onToken?.(`\n📊 Phase 1 & 2 completed in ${(phase12TimeMs / 1000).toFixed(1)}s\n`);

  const phase3Start = Date.now();

  onProgress?.("fusion_generation", "Generating fusion report from both reports...", Date.now() - pipelineStart);

  const fusionReport = await generateFusionReport(
    effectiveCategory,
    surveyResult.report,
    backendResult.report,
    {
      onToken,
      onProgress: (phase, message) => onProgress?.("fusion_generation", message, Date.now() - pipelineStart),
    }
  );

  const phase3TimeMs = Date.now() - phase3Start;
  onPhaseComplete?.("fusion_report", fusionReport, phase3TimeMs);

  const totalTimeMs = Date.now() - pipelineStart;

  const result: ReportGeneratorAgentResult = {
    success: true,
    category: rawCategory,
    resolvedCategory: effectiveCategory,
    surveyReport: surveyResult.report,
    backendReport: backendResult.report,
    fusionReport,
    pipelineMetadata: {
      totalTimeMs,
      phase12TimeMs,
      phase3TimeMs,
      surveyDocsRetrieved: surveyResult.docsRetrieved,
      backendDocsRetrieved: backendResult.docsRetrieved,
    },
  };

  onToken?.(`\n✅ All 3 reports generated in ${(totalTimeMs / 1000).toFixed(1)}s\n`);
  onProgress?.("complete", `Pipeline complete in ${(totalTimeMs / 1000).toFixed(1)}s`, totalTimeMs);
  onComplete?.(result);

  return result;
}


async function runSurveyPhase(
  category: string,
  callbacks: {
    onProgress?: ReportGeneratorAgentOptions["onProgress"];
    onToken?: ReportGeneratorAgentOptions["onToken"];
    onPhaseComplete?: ReportGeneratorAgentOptions["onPhaseComplete"];
  }
): Promise<{ report: SurveyReport; docsRetrieved: number }> {
  const phaseStart = Date.now();


  callbacks.onProgress?.("survey_retrieval", "Retrieving survey/NGO documents (BM25)...", 0);
  const rawDocs = retrieveSurveyDocs(category, category, 20);
  callbacks.onToken?.(`📄 Survey: Retrieved ${rawDocs.length} documents for "${category}"\n`);

  callbacks.onProgress?.("survey_processing", `Deduplicating ${rawDocs.length} documents...`, Date.now() - phaseStart);
  const uniqueDocs = removeDuplicates(rawDocs);

  const taggedDocs = tagSeverity(uniqueDocs);

  const severityDist = { high: 0, medium: 0, low: 0 };
  for (const d of taggedDocs) {
    severityDist[d.severity || "low"]++;
  }
  callbacks.onToken?.(
    `🏷️  Survey: ${taggedDocs.length} unique docs | Severity: H:${severityDist.high} M:${severityDist.medium} L:${severityDist.low}\n`
  );

  // Generate report
  callbacks.onProgress?.("survey_generation", "Generating survey report via LLM...", Date.now() - phaseStart);
  const report = await generateSurveyReport(category, taggedDocs, {
    onToken: callbacks.onToken,
    onProgress: (phase, message) =>
      callbacks.onProgress?.("survey_generation", message, Date.now() - phaseStart),
  });

  const elapsed = Date.now() - phaseStart;
  callbacks.onPhaseComplete?.("survey_report", report, elapsed);

  return { report, docsRetrieved: rawDocs.length };
}


async function runBackendPhase(
  db: PrismaClient,
  category: string,
  callbacks: {
    onProgress?: ReportGeneratorAgentOptions["onProgress"];
    onToken?: ReportGeneratorAgentOptions["onToken"];
    onPhaseComplete?: ReportGeneratorAgentOptions["onPhaseComplete"];
  }
): Promise<{ report: BackendReport; docsRetrieved: number }> {
  const phaseStart = Date.now();

  // Retrieve from Prisma
  callbacks.onProgress?.("backend_retrieval", "Fetching backend complaints from database...", 0);
  const rawDocs = await retrieveBackendDocs(db, category, 20);
  callbacks.onToken?.(`📄 Backend: Retrieved ${rawDocs.length} complaints for "${category}"\n`);

  // Deduplicate
  callbacks.onProgress?.("backend_processing", `Deduplicating ${rawDocs.length} complaints...`, Date.now() - phaseStart);
  const uniqueDocs = removeDuplicates(rawDocs);

  // Severity tag
  const taggedDocs = tagSeverity(uniqueDocs);

  const severityDist = { high: 0, medium: 0, low: 0 };
  for (const d of taggedDocs) {
    severityDist[d.severity || "low"]++;
  }
  callbacks.onToken?.(
    `🏷️  Backend: ${taggedDocs.length} unique docs | Severity: H:${severityDist.high} M:${severityDist.medium} L:${severityDist.low}\n`
  );

  // Generate report
  callbacks.onProgress?.("backend_generation", "Generating backend report via LLM...", Date.now() - phaseStart);
  const report = await generateBackendReport(category, taggedDocs, {
    onToken: callbacks.onToken,
    onProgress: (phase, message) =>
      callbacks.onProgress?.("backend_generation", message, Date.now() - phaseStart),
  });

  const elapsed = Date.now() - phaseStart;
  callbacks.onPhaseComplete?.("backend_report", report, elapsed);

  return { report, docsRetrieved: rawDocs.length };
}
