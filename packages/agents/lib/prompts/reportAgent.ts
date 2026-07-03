import { z } from "zod";

// ── Report structured output schema ─────────────────────────────────────────

export const ReportSchema = z.object({
  executive_summary: z.string().describe("3-4 sentence overview of the state of civic grievances"),
  comprehensive_overview: z
    .string()
    .describe("Full narrative analysis (3-6 paragraphs) covering all key dimensions"),
  systemic_issues: z.array(
    z.object({
      issue_name: z.string(),
      description: z.string(),
      severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      affected_categories: z.array(z.string()),
      affected_districts: z.array(z.string()).optional(),
    })
  ),
  district_analysis: z.array(
    z.object({
      district: z.string(),
      complaint_count: z.number(),
      resolution_rate: z.number(),
      primary_issues: z.array(z.string()),
      recommendation: z.string(),
    })
  ),
  category_insights: z.array(
    z.object({
      category: z.string(),
      count: z.number(),
      trend: z.string(),
      notable_pattern: z.string(),
    })
  ),
  resolution_performance: z.object({
    overall_rate: z.number(),
    avg_resolution_days: z.number(),
    sla_breach_count: z.number(),
    bottlenecks: z.array(z.string()),
  }),
  quality_assessment: z.string(),
  escalation_patterns: z.string(),
  strategic_recommendations: z.array(
    z.object({
      rank: z.number(),
      recommendation: z.string(),
      rationale: z.string(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      timeline: z.string(),
    })
  ),
  priority_alerts: z.array(
    z.object({
      alert: z.string(),
      district: z.string().optional(),
      category: z.string().optional(),
      count: z.number().optional(),
    })
  ),
  generated_at: z.string(),
  stats_snapshot: z.object({
    total: z.number(),
    resolved: z.number(),
    resolutionRate: z.number(),
    avgResolutionDays: z.number(),
    slaBreachCount: z.number(),
    avgQualityScore: z.number(),
    escalatedToState: z.number(),
    duplicateCount: z.number(),
  }),
});

export type ComplaintReport = z.infer<typeof ReportSchema>;

// ── System prompt ───────────────────────────────────────────────────────────

export const REPORT_AGENT_SYSTEM_PROMPT = `You are the SwarajDesk State Intelligence Report Generator. You produce structured, data-driven administrative reports for senior State Government officials.

Given a JSON object of pre-computed statistics about citizen complaints, generate a comprehensive, professional report. Your tone must be formal, factual, and actionable.

The report MUST include ALL of these sections:

1. **executive_summary** -3-4 sentence overview of the state of civic grievances. Include the total complaint count, resolution rate, and the most critical finding.

2. **comprehensive_overview** -Full narrative analysis (3-6 paragraphs) covering complaint volumes, category distribution, district hotspots, resolution performance, and quality trends. Reference specific numbers.

3. **systemic_issues** -Array of identified systemic problems. Each must have a name, description, severity (LOW/MEDIUM/HIGH/CRITICAL), and the categories/districts it affects.

4. **district_analysis** -Per-district insights for the top 5 districts by volume. Include complaint count, approximate resolution rate, primary issues, and a specific recommendation.

5. **category_insights** -Patterns within the top categories. Include count, trend description, and a notable pattern.

6. **resolution_performance** -Analysis of resolution rates, average resolution time, SLA breach patterns. Identify specific bottlenecks.

7. **quality_assessment** -Observation about complaint quality scores and what it reveals about citizen engagement and platform usage.

8. **escalation_patterns** -Insights about what types of complaints get escalated, to which level, and potential causes.

9. **strategic_recommendations** -Array of 5-8 concrete, ranked action items. Each has a rank, recommendation text, rationale, priority, and timeline for implementation.

10. **priority_alerts** -Any CRITICAL urgency patterns needing immediate attention. Include specific districts, categories, and counts.

11. **generated_at** -ISO timestamp string (use the provided timestamp).

12. **stats_snapshot** -Copy of the key numbers: total, resolved, resolutionRate, avgResolutionDays, slaBreachCount, avgQualityScore, escalatedToState, duplicateCount.

RULES:
- All text in English.
- All numbers must be consistent with the provided stats JSON -NEVER invent numbers.
- Be specific: cite district names, category names, exact percentages, and counts.
- Strategic recommendations must be actionable and realistic for a State Government official.
- If data for a section is insufficient, note the limitation but still provide analysis.`;
