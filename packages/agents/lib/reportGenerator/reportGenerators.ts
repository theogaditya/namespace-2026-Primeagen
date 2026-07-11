import { getChatModel } from "../models/provider";
import { buildContext, type SurveyDocument } from "./processor";
import { extractJson } from "./jsonParser";
import {
  SURVEY_REPORT_SYSTEM_PROMPT,
  buildSurveyReportUserPrompt,
  BACKEND_REPORT_SYSTEM_PROMPT,
  buildBackendReportUserPrompt,
  FUSION_REPORT_SYSTEM_PROMPT,
  buildFusionReportUserPrompt,
  SurveyReportSchema,
  BackendReportSchema,
  FusionReportSchema,
  emptySurveyReport,
  emptyBackendReport,
  emptyFusionReport,
  type SurveyReport,
  type BackendReport,
  type FusionReport,
} from "../prompts/reportGeneratorAgent";

export async function generateSurveyReport(
  category: string,
  documents: SurveyDocument[],
  callbacks?: {
    onToken?: (chunk: string) => void;
    onProgress?: (phase: string, message: string) => void;
  }
): Promise<SurveyReport> {
  if (documents.length === 0) {
    return emptySurveyReport(category);
  }

  callbacks?.onProgress?.("llm_generation", "Generating survey report via LLM...");

  const context = buildContext(documents);
  const timestamp = new Date().toISOString();

  const model = getChatModel("chat", { maxTokens: 8192 });

  const messages = [
    { role: "system" as const, content: SURVEY_REPORT_SYSTEM_PROMPT },
    { role: "user" as const, content: buildSurveyReportUserPrompt(category, context, timestamp) },
  ];

  try {
    const structuredModel = model.withStructuredOutput(SurveyReportSchema);
    const result = await structuredModel.invoke(messages);

    callbacks?.onToken?.(`✅ Survey report generated (${(result as SurveyReport).key_findings?.length || 0} findings)\n`);

    return result as SurveyReport;
  } catch (structuredErr) {
    // Fallback: raw generation + JSON extraction
    console.warn("[SurveyReportGen] Structured output failed, falling back to raw generation:", structuredErr);

    try {
      const response = await model.invoke(messages);
      const rawText = typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

      const parsed = extractJson(rawText);
      if (parsed) {
        // Ensure required fields
        parsed.report_type = parsed.report_type || "survey_report";
        parsed.category = parsed.category || category;
        parsed.generated_at = parsed.generated_at || timestamp;
        callbacks?.onToken?.(`✅ Survey report generated (fallback mode)\n`);
        return parsed as SurveyReport;
      }
    } catch (fallbackErr) {
      console.error("[SurveyReportGen] Fallback generation failed:", fallbackErr);
    }

    return emptySurveyReport(category);
  }
}

export async function generateBackendReport(
  category: string,
  documents: SurveyDocument[],
  callbacks?: {
    onToken?: (chunk: string) => void;
    onProgress?: (phase: string, message: string) => void;
  }
): Promise<BackendReport> {
  if (documents.length === 0) {
    return emptyBackendReport(category);
  }

  callbacks?.onProgress?.("llm_generation", "Generating backend report via LLM...");

  const context = buildContext(documents);
  const timestamp = new Date().toISOString();

  const model = getChatModel("chat", { maxTokens: 8192 });

  const messages = [
    { role: "system" as const, content: BACKEND_REPORT_SYSTEM_PROMPT },
    { role: "user" as const, content: buildBackendReportUserPrompt(category, context, timestamp) },
  ];

  try {
    const structuredModel = model.withStructuredOutput(BackendReportSchema);
    const result = await structuredModel.invoke(messages);

    callbacks?.onToken?.(`✅ Backend report generated (${(result as BackendReport).key_findings?.length || 0} findings)\n`);

    return result as BackendReport;
  } catch (structuredErr) {
    console.warn("[BackendReportGen] Structured output failed, falling back:", structuredErr);

    try {
      const response = await model.invoke(messages);
      const rawText = typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

      const parsed = extractJson(rawText);
      if (parsed) {
        parsed.report_type = parsed.report_type || "backend_report";
        parsed.category = parsed.category || category;
        parsed.generated_at = parsed.generated_at || timestamp;
        callbacks?.onToken?.(`✅ Backend report generated (fallback mode)\n`);
        return parsed as BackendReport;
      }
    } catch (fallbackErr) {
      console.error("[BackendReportGen] Fallback failed:", fallbackErr);
    }

    return emptyBackendReport(category);
  }
}

export async function generateFusionReport(
  category: string,
  surveyReport: SurveyReport | Record<string, any>,
  backendReport: BackendReport | Record<string, any>,
  callbacks?: {
    onToken?: (chunk: string) => void;
    onProgress?: (phase: string, message: string) => void;
  }
): Promise<FusionReport> {
  callbacks?.onProgress?.("llm_generation", "Generating fusion report via LLM...");

  const timestamp = new Date().toISOString();

  const model = getChatModel("chat", { maxTokens: 8192 });

  const messages = [
    { role: "system" as const, content: FUSION_REPORT_SYSTEM_PROMPT },
    { role: "user" as const, content: buildFusionReportUserPrompt(category, surveyReport, backendReport, timestamp) },
  ];

  try {
    const structuredModel = model.withStructuredOutput(FusionReportSchema);
    const result = await structuredModel.invoke(messages);

    callbacks?.onToken?.(`✅ Fusion report generated (${(result as FusionReport).unified_findings?.length || 0} unified findings)\n`);

    return result as FusionReport;
  } catch (structuredErr) {
    console.warn("[FusionReportGen] Structured output failed, falling back:", structuredErr);

    try {
      const response = await model.invoke(messages);
      const rawText = typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

      const parsed = extractJson(rawText);
      if (parsed) {
        parsed.report_type = parsed.report_type || "fusion_report";
        parsed.category = parsed.category || category;
        parsed.generated_at = parsed.generated_at || timestamp;
        callbacks?.onToken?.(`✅ Fusion report generated (fallback mode)\n`);
        return parsed as FusionReport;
      }
    } catch (fallbackErr) {
      console.error("[FusionReportGen] Fallback failed:", fallbackErr);
    }

    return emptyFusionReport(category);
  }
}
