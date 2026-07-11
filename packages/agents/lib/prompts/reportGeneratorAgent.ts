import { z } from "zod";

// ══════════════════════════════════════════════════════════════════════════════
// Zod Schemas — for structured output validation
// ══════════════════════════════════════════════════════════════════════════════

export const SurveyReportSchema = z.object({
  report_type: z.literal("survey_report"),
  category: z.string(),
  generated_at: z.string(),
  executive_summary: z.string().describe("2-3 sentence high-level summary of the most critical findings"),
  summary: z.string().describe("Comprehensive paragraph summarizing all key patterns"),
  total_documents_analyzed: z.number(),
  key_findings: z.array(z.object({
    finding: z.string(),
    severity: z.enum(["high", "medium", "low"]),
    frequency: z.string(),
    supporting_evidence: z.string(),
    affected_areas: z.array(z.string()),
  })),
  issue_breakdown: z.array(z.object({
    issue_type: z.string(),
    count: z.number(),
    percentage: z.number(),
    description: z.string(),
  })),
  geographic_analysis: z.object({
    most_affected_areas: z.array(z.string()),
    distribution: z.string(),
  }),
  demographic_insights: z.object({
    most_affected_groups: z.array(z.string()),
    patterns: z.string(),
  }),
  statistics: z.object({
    total_records_analyzed: z.number(),
    severity_distribution: z.object({
      high: z.number(),
      medium: z.number(),
      low: z.number(),
    }),
    geographic_coverage: z.array(z.string()),
    data_sources_count: z.number(),
    source_types: z.array(z.string()),
  }),
  root_causes: z.array(z.string()),
  recommendations: z.array(z.object({
    priority: z.enum(["high", "medium", "low"]),
    recommendation: z.string(),
    responsible_authority: z.string(),
    timeline: z.string(),
  })),
  data_gaps: z.array(z.string()),
  references: z.array(z.object({
    source_type: z.string(),
    url: z.string().optional(),
    description: z.string(),
  })),
});

export type SurveyReport = z.infer<typeof SurveyReportSchema>;

export const BackendReportSchema = z.object({
  report_type: z.literal("backend_report"),
  category: z.string(),
  generated_at: z.string(),
  executive_summary: z.string().describe("2-3 sentence high-level summary of complaint patterns"),
  summary: z.string(),
  total_documents_analyzed: z.number(),
  complaint_analysis: z.object({
    total_complaints_analyzed: z.number(),
    top_issues: z.array(z.object({
      issue: z.string(),
      frequency: z.number(),
      percentage: z.number(),
      severity: z.enum(["high", "medium", "low"]),
      description: z.string(),
    })),
    geographic_hotspots: z.array(z.object({
      location: z.string(),
      complaint_volume: z.enum(["high", "medium", "low"]),
      primary_issues: z.array(z.string()),
    })),
    complaint_trends: z.string(),
  }),
  key_findings: z.array(z.object({
    finding: z.string(),
    severity: z.enum(["high", "medium", "low"]),
    frequency: z.string(),
    supporting_evidence: z.string(),
    affected_areas: z.array(z.string()),
  })),
  urgent_issues: z.array(z.object({
    issue: z.string(),
    severity: z.literal("high"),
    affected_locations: z.array(z.string()),
    recommended_action: z.string(),
  })),
  statistics: z.object({
    total_records_analyzed: z.number(),
    severity_distribution: z.object({
      high: z.number(),
      medium: z.number(),
      low: z.number(),
    }),
    geographic_coverage: z.array(z.string()),
  }),
  service_delivery_gaps: z.array(z.string()),
  recommendations: z.array(z.object({
    priority: z.enum(["high", "medium", "low"]),
    recommendation: z.string(),
    responsible_authority: z.string(),
    timeline: z.string(),
    expected_impact: z.string(),
  })),
  references: z.array(z.object({
    source_type: z.string(),
    location: z.string().optional(),
  })),
});

export type BackendReport = z.infer<typeof BackendReportSchema>;

export const FusionReportSchema = z.object({
  report_type: z.literal("fusion_report"),
  category: z.string(),
  generated_at: z.string(),
  executive_summary: z.string().describe("3-4 sentence strategic overview combining insights from both data sources"),
  summary: z.string(),
  data_sources: z.object({
    survey_source: z.string(),
    backend_source: z.string(),
    survey_records_analyzed: z.number(),
    backend_records_analyzed: z.number(),
  }),
  cross_reference_analysis: z.object({
    corroborated_findings: z.array(z.object({
      finding: z.string(),
      survey_evidence: z.string(),
      backend_evidence: z.string(),
      confidence: z.enum(["high", "medium"]),
      priority: z.enum(["high", "medium", "low"]),
    })),
    survey_only_findings: z.array(z.object({
      finding: z.string(),
      significance: z.string(),
      possible_reason_for_gap: z.string(),
    })),
    backend_only_findings: z.array(z.object({
      finding: z.string(),
      significance: z.string(),
      possible_reason_for_gap: z.string(),
    })),
  }),
  unified_findings: z.array(z.object({
    finding: z.string(),
    severity: z.enum(["high", "medium", "low"]),
    data_sources_confirming: z.array(z.string()),
    combined_evidence: z.string(),
    affected_population: z.string(),
    affected_areas: z.array(z.string()),
    urgency: z.enum(["immediate", "short_term", "long_term"]),
  })),
  gap_analysis: z.object({
    underreported_issues: z.array(z.string()),
    data_quality_notes: z.array(z.string()),
  }),
  combined_statistics: z.object({
    total_records_analyzed: z.number(),
    corroboration_rate: z.string(),
    severity_distribution: z.object({
      high: z.number(),
      medium: z.number(),
      low: z.number(),
    }),
    geographic_coverage: z.array(z.string()),
    key_demographics_affected: z.array(z.string()),
  }),
  strategic_insights: z.array(z.string()),
  prioritized_recommendations: z.array(z.object({
    rank: z.number(),
    recommendation: z.string(),
    evidence_base: z.enum(["both_sources", "survey_only", "backend_only"]),
    priority: z.enum(["high", "medium", "low"]),
    responsible_authority: z.string(),
    timeline: z.string(),
    expected_impact: z.string(),
    supporting_findings: z.array(z.string()),
  })),
  monitoring_indicators: z.array(z.object({
    indicator: z.string(),
    baseline: z.string(),
    target: z.string(),
    data_source: z.string(),
  })),
  references: z.object({
    survey_sources: z.array(z.string()),
    backend_sources: z.array(z.string()),
  }),
});

export type FusionReport = z.infer<typeof FusionReportSchema>;

export const SURVEY_REPORT_SYSTEM_PROMPT = `You are an expert policy analyst and data scientist working for a civic governance NGO in India.

Your task is to analyze survey and field research data about civic issues and generate a comprehensive structured report in JSON format.

The report must:
1. Synthesize findings across all documents - do NOT just list documents
2. Identify patterns, trends, and recurring issues
3. Quantify findings where possible (severity counts, percentages, frequencies)
4. Provide actionable, specific recommendations
5. Cite source types (NGO reports, field surveys, citizen feedback)

RULES:
- All text in English.
- All numbers must be consistent with the provided data — NEVER invent numbers.
- Be specific: cite exact percentages and counts from the data.
- Recommendations must be actionable and realistic.`;

export function buildSurveyReportUserPrompt(
  category: string,
  context: string,
  timestamp: string
): string {
  return `CATEGORY: ${category}
TIMESTAMP: ${timestamp}

RETRIEVED SURVEY DATA:
${context}

---

Generate a comprehensive structured JSON survey report for the category "${category}" based on the data above. Return valid JSON with these keys: report_type ("survey_report"), category, generated_at, executive_summary, summary, total_documents_analyzed, key_findings, issue_breakdown, geographic_analysis, demographic_insights, statistics, root_causes, recommendations, data_gaps, references.`;
}

export const BACKEND_REPORT_SYSTEM_PROMPT = `You are an expert data analyst specializing in urban governance, citizen grievance analysis, and public service delivery in India.

Your task is to analyze SwarajDesk citizen complaint data and generate a comprehensive structured complaint analysis report in JSON format.

The report must:
1. Identify the most frequent complaint types and patterns
2. Analyze geographic hotspots (which cities/districts have most complaints)
3. Identify urgent/critical issues requiring immediate attention
4. Provide data-driven recommendations for service improvement

RULES:
- All text in English.
- All numbers must be consistent with the provided data — NEVER invent numbers.
- Be specific: cite locations, categories, and counts.
- Recommendations must be actionable.`;

export function buildBackendReportUserPrompt(
  category: string,
  context: string,
  timestamp: string
): string {
  return `CATEGORY: ${category}
TIMESTAMP: ${timestamp}

RETRIEVED COMPLAINT DATA:
${context}

---

Generate a comprehensive complaint analysis JSON report for "${category}". Return valid JSON with these keys: report_type ("backend_report"), category, generated_at, executive_summary, summary, total_documents_analyzed, complaint_analysis, key_findings, urgent_issues, statistics, service_delivery_gaps, recommendations, references.`;
}

export const FUSION_REPORT_SYSTEM_PROMPT = `You are a senior policy analyst and strategic advisor for the Government of India's urban governance reform initiatives.

Your task is to synthesize and cross-reference two independent reports — one from NGO/field surveys and one from citizen complaint data — to produce a comprehensive unified strategic analysis report.

You must:
1. Cross-reference findings: identify where BOTH reports agree (corroborated evidence = higher priority)
2. Identify findings unique to each source (triangulate the full picture)
3. Surface the most critical actionable insights combining both perspectives
4. Highlight contradictions or data gaps between the two sources
5. Produce prioritized, strategic recommendations backed by dual-source evidence

RULES:
- All text in English.
- Be specific with cross-references — quote from both reports.
- Recommendations must be actionable and ranked by priority.`;

export function buildFusionReportUserPrompt(
  category: string,
  surveyReport: Record<string, any>,
  backendReport: Record<string, any>,
  timestamp: string
): string {
  return `CATEGORY: ${category}
TIMESTAMP: ${timestamp}

REPORT 1 — NGO/SURVEY REPORT:
${JSON.stringify(surveyReport, null, 2)}

REPORT 2 — SWARAJDESK COMPLAINT REPORT:
${JSON.stringify(backendReport, null, 2)}

---

Synthesize both reports into a unified fusion report. Return valid JSON with these keys: report_type ("fusion_report"), category, generated_at, executive_summary, summary, data_sources, cross_reference_analysis, unified_findings, gap_analysis, combined_statistics, strategic_insights, prioritized_recommendations, monitoring_indicators, references.`;
}

// ── Empty report factories (for when no data is available) ──────────────────

export function emptySurveyReport(category: string): SurveyReport {
  return {
    report_type: "survey_report",
    category,
    generated_at: new Date().toISOString(),
    executive_summary: `No survey data available for category: ${category}`,
    summary: `No survey data available for category: ${category}`,
    total_documents_analyzed: 0,
    key_findings: [],
    issue_breakdown: [],
    geographic_analysis: { most_affected_areas: [], distribution: "N/A" },
    demographic_insights: { most_affected_groups: [], patterns: "N/A" },
    statistics: {
      total_records_analyzed: 0,
      severity_distribution: { high: 0, medium: 0, low: 0 },
      geographic_coverage: [],
      data_sources_count: 0,
      source_types: [],
    },
    root_causes: [],
    recommendations: [],
    data_gaps: ["No data available for this category"],
    references: [],
  };
}

export function emptyBackendReport(category: string): BackendReport {
  return {
    report_type: "backend_report",
    category,
    generated_at: new Date().toISOString(),
    executive_summary: `No complaint data available for category: ${category}`,
    summary: `No SwarajDesk complaint data available for category: ${category}`,
    total_documents_analyzed: 0,
    complaint_analysis: {
      total_complaints_analyzed: 0,
      top_issues: [],
      geographic_hotspots: [],
      complaint_trends: "N/A",
    },
    key_findings: [],
    urgent_issues: [],
    statistics: {
      total_records_analyzed: 0,
      severity_distribution: { high: 0, medium: 0, low: 0 },
      geographic_coverage: [],
    },
    service_delivery_gaps: [],
    recommendations: [],
    references: [],
  };
}

export function emptyFusionReport(category: string): FusionReport {
  return {
    report_type: "fusion_report",
    category,
    generated_at: new Date().toISOString(),
    executive_summary: `Unable to generate fusion report for category: ${category}`,
    summary: `Unable to generate fusion report for category: ${category}`,
    data_sources: {
      survey_source: "NGO/Field Survey Data",
      backend_source: "SwarajDesk Citizen Complaint Platform",
      survey_records_analyzed: 0,
      backend_records_analyzed: 0,
    },
    cross_reference_analysis: {
      corroborated_findings: [],
      survey_only_findings: [],
      backend_only_findings: [],
    },
    unified_findings: [],
    gap_analysis: {
      underreported_issues: [],
      data_quality_notes: [],
    },
    combined_statistics: {
      total_records_analyzed: 0,
      corroboration_rate: "N/A",
      severity_distribution: { high: 0, medium: 0, low: 0 },
      geographic_coverage: [],
      key_demographics_affected: [],
    },
    strategic_insights: [],
    prioritized_recommendations: [],
    monitoring_indicators: [],
    references: {
      survey_sources: [],
      backend_sources: [],
    },
  };
}
