import { getChatModel } from "../lib/models/provider";
import {
  ACTION_SUGGESTION_SYSTEM_PROMPT,
  SuggestedActionsSchema,
  type SuggestedActions,
} from "../lib/prompts/actionSuggestionAgent";
import type { ComplaintReport } from "../lib/prompts/reportAgent";
import type { ReportStats } from "../lib/tools/computeReportStats";

/**
 * Single structured LLM call (no streaming, fast model).
 * Reads the completed report + raw stats and produces 3-8 actionable suggestions.
 */
export async function runActionSuggestionAgent(
  report: ComplaintReport,
  stats: ReportStats
): Promise<SuggestedActions> {
  const model = getChatModel("fast");
  const structured = model.withStructuredOutput(SuggestedActionsSchema);

  const result = await structured.invoke([
    { role: "system", content: ACTION_SUGGESTION_SYSTEM_PROMPT },
    {
      role: "user",
      content:
        `Here is the analytics report:\n${JSON.stringify(report, null, 2)}\n\n` +
        `Here are the raw stats (use complaintId values from mostUpvotedComplaints):\n` +
        `${JSON.stringify(stats, null, 2)}`,
    },
  ]);

  return result as unknown as SuggestedActions;
}
