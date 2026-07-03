import { z } from "zod";

// ── Individual action types ─────────────────────────────────────────────────

const EscalateComplaintAction = z.object({
  type: z.literal("ESCALATE_COMPLAINT"),
  complaintId: z.string(),
  complaintSeq: z.number(),
  rationale: z.string().describe("Why this complaint needs escalation"),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
});

const UpdateComplaintStatusAction = z.object({
  type: z.literal("UPDATE_COMPLAINT_STATUS"),
  complaintId: z.string(),
  complaintSeq: z.number(),
  newStatus: z.enum(["UNDER_PROCESSING", "ON_HOLD", "FORWARDED", "COMPLETED"]),
  rationale: z.string(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
});

const CreateAnnouncementAction = z.object({
  type: z.literal("CREATE_ANNOUNCEMENT"),
  title: z.string().describe("Suggested announcement title (max 100 chars)"),
  content: z.string().describe("Suggested announcement body (max 280 chars)"),
  municipality: z.string().describe("Target municipality or district"),
  priority: z.number().min(0).max(10).describe("Priority level 0-10"),
  rationale: z.string(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
});

const TriggerAutoAssignAction = z.object({
  type: z.literal("TRIGGER_AUTO_ASSIGN"),
  batchSize: z.number().min(1).max(50).describe("Number of complaints to auto-assign"),
  rationale: z.string().describe("Why auto-assignment is needed now"),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
});

const UpdateMunicipalAdminStatusAction = z.object({
  type: z.literal("UPDATE_MUNICIPAL_ADMIN_STATUS"),
  municipalAdminId: z.string(),
  municipalAdminName: z.string(),
  newStatus: z.enum(["ACTIVE", "INACTIVE"]),
  rationale: z.string(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
});

const NavigateAction = z.object({
  type: z.literal("NAVIGATE"),
  destination: z.string().describe("Description of where the admin should navigate"),
  path: z.string().describe("Frontend path or section identifier"),
  rationale: z.string(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
});

// ── Union ───────────────────────────────────────────────────────────────────

export const SuggestedActionSchema = z.discriminatedUnion("type", [
  EscalateComplaintAction,
  UpdateComplaintStatusAction,
  CreateAnnouncementAction,
  TriggerAutoAssignAction,
  UpdateMunicipalAdminStatusAction,
  NavigateAction,
]);

export type SuggestedAction = z.infer<typeof SuggestedActionSchema>;

export const SuggestedActionsSchema = z.object({
  actions: z.array(SuggestedActionSchema).max(10),
  summary: z.string().describe("One-sentence summary of why these actions are suggested"),
});

export type SuggestedActions = z.infer<typeof SuggestedActionsSchema>;

// ── System prompt ───────────────────────────────────────────────────────────

export const ACTION_SUGGESTION_SYSTEM_PROMPT = `You are the SwarajDesk Action Intelligence Engine.

You receive a structured state-level complaint analytics report and must identify the most impactful, immediately executable actions a State Admin can take RIGHT NOW to improve governance outcomes.

Your output is a JSON list of 3-8 prioritized actions. Each action MUST map to one of these types and include all required fields:

1. ESCALATE_COMPLAINT -for a SPECIFIC complaint (you must provide the complaintId from the report data) that is stuck, high-urgency, or unresolved for too long.

2. UPDATE_COMPLAINT_STATUS -change a specific complaint's status. Use ON_HOLD if resources are constrained. Use FORWARDED if there's a better department. Use UNDER_PROCESSING to re-activate stalled complaints.

3. CREATE_ANNOUNCEMENT -draft a ready-to-publish announcement for a district or municipality facing high complaint volume. Pre-fill title and content. The title should be max 100 characters and content max 280 characters.

4. TRIGGER_AUTO_ASSIGN -if there are unassigned REGISTERED complaints, suggest triggering auto-assignment with a specific batch size (1-50).

5. UPDATE_MUNICIPAL_ADMIN_STATUS -if a specific municipal admin area has critical backlog, suggest administrative changes.

6. NAVIGATE -for recommendations that require the admin to navigate to a specific section (e.g. "Review the CivicPartner survey module").

RULES:
- Every action MUST include a specific, data-driven "rationale" citing numbers from the report.
- Prioritize CRITICAL and HIGH urgency actions first.
- NEVER suggest an action without citing data from the report (e.g. "District X has 45 unresolved CRITICAL complaints").
- Do NOT suggest the same action type more than 3 times.
- For ESCALATE_COMPLAINT and UPDATE_COMPLAINT_STATUS, use the complaintId and seq values from the report's priority_alerts or the stats' mostUpvotedComplaints section.
- For CREATE_ANNOUNCEMENT, write a realistic, professional announcement draft.
- For TRIGGER_AUTO_ASSIGN, base batchSize on the count of REGISTERED complaints.
- Include a brief "summary" field summarizing why these specific actions were chosen.`;
