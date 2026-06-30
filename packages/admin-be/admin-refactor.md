# Agent Routes — Full Refactor Implementation Plan

## Overview

The existing agent routes are a loose collection of endpoints with no coherent workflow. This plan tears them down completely (except authentication) and rebuilds them around three core pillars:

1. **Department + Municipality scoped complaint assignment** — complaints are matched to agents on both axes.
2. **Municipal-admin-direct routing** — admin-heavy departments bypass agents entirely.
3. **A functional SLA system** — deadlines enforced per urgency level, breaches surfaced in the UI.

---

## 1. Routing Logic: Who Gets the Complaint?

When a complaint is submitted, the `assignedDepartment` field determines the routing path.

### Path A — Routes to a Field Agent (7 departments)

| Department                    |
|-------------------------------|
| INFRASTRUCTURE                |
| WATER_SUPPLY_SANITATION        |
| ELECTRICITY_POWER             |
| TRANSPORTATION                |
| POLICE_SERVICES               |
| ENVIRONMENT                   |
| PUBLIC_GRIEVANCES             |

- The complaint is **not auto-assigned**. It is placed in an **unassigned pool**.
- An agent may **claim** it only if: `agent.municipality === complaint.location.district` **AND** `agent.department === complaint.assignedDepartment`.
- The frontend shows eligible agents a filtered "Claimable Complaints" view containing only complaints they are allowed to claim.
- If a complaint stays unclaimed beyond a threshold (configurable, default 4 hours for HIGH/CRITICAL, 24 hours for MEDIUM/LOW), it should be **auto-assigned** to the least-loaded eligible agent in that municipality+department.

### Path B — Routes Directly to Municipal Admin (6 departments)

| Department                  |
|-----------------------------|
| REVENUE                     |
| EDUCATION                   |
| HEALTH                      |
| MUNICIPAL_SERVICES          |
| HOUSING_URBAN_DEVELOPMENT   |
| SOCIAL_WELFARE              |

- The complaint is **auto-assigned** to the `DepartmentMunicipalAdmin` whose `municipality` matches `complaint.location.district` and `department` matches `complaint.assignedDepartment`.
- No agent is involved at the intake stage.
- Agents may still appear in the complaint history if they later assist, but the primary handler is the municipal admin.

---

## 2. Schema Changes Required

The following fields need to be added to the `Complaint` model in `schema.prisma`:

```prisma
slaDeadline   DateTime?           // Calculated at creation: now + SLA hours per urgency
slaBreached   Boolean  @default(false)  // Flipped to true by cron if deadline passes unresolved
```

> The existing `sla String?` field on Complaint stores a human-readable label (e.g., "48h"). Keep it as-is and use `slaDeadline` for actual enforcement.

The `Agent` model already has `municipality String?` — this must be treated as **required** going forward. The seed script (see section 8) sets it for all agents.

---

## 3. Complete Endpoint List — New `/api/agent` Routes

All routes below are under the prefix `/api/agent`. All except login/me require `authenticateAgentOnly`.

### 3.1 Authentication (carry over, minor cleanup)

| Method | Path         | Description |
|--------|-------------|-------------|
| POST   | `/login`    | Agent login. Returns JWT + agent profile. No changes to logic. |
| GET    | `/me`       | Returns authenticated agent's full profile including workload and SLA compliance stats. Must include `municipality` and `department` in response. |
| POST   | `/logout`   | Clears `agentToken` cookie. |

### 3.2 Workload & Availability

| Method | Path                  | Description |
|--------|-----------------------|-------------|
| GET    | `/workload`           | Returns `{ currentWorkload, workloadLimit, availabilityStatus, slaComplianceRate }` for the logged-in agent. Used by the capacity gauge in the dashboard. |
| PUT    | `/availability`       | Body: `{ status: "At Work" | "On Break" | "Off Duty" }`. Updates `availabilityStatus` on the Agent record. |

### 3.3 Browsing All Complaints (Dashboard Overview)

These are served from `/api/complaints/*` (already working). The agent dashboard fetches:
- `GET /api/complaints/all-complaints?page&limit&search` — unchanged, uses `authenticateAdmin` middleware which already accepts agents via token type check (confirm this in middleware).
- `GET /api/complaints/stats/overview` — unchanged.

**No changes needed to `complaint.ts` from the agent side.** However, `authenticateAdmin` middleware must be verified to accept `type: "AGENT"` tokens (currently it does).

### 3.4 Agent's Own Assigned Complaints

| Method | Path                              | Description |
|--------|-----------------------------------|-------------|
| GET    | `/my-complaints`                  | Returns paginated complaints where `assignedAgentId === agent.id` and status is not DELETED. Query params: `page`, `limit`, `status` (filter), `urgency` (filter), `sla` ("breached" \| "due_soon" \| "all"). Response shape: `{ complaints, pagination }`. |
| GET    | `/my-complaints/stats`            | Returns the agent's personal stats: total assigned, in-progress, completed, SLA compliance rate, avg resolution time. Used in the stats row of the My Complaints page. |

### 3.5 Claimable Complaints (New, Key Feature)

| Method | Path                              | Description |
|--------|-----------------------------------|-------------|
| GET    | `/claimable-complaints`           | Returns unassigned complaints eligible for this agent to claim. Filter: `complaint.assignedAgentId IS NULL` AND `complaint.assignedDepartment === agent.department` AND `complaint.location.district === agent.municipality` AND department is NOT in the municipal-admin-only list AND status is REGISTERED. Query params: `page`, `limit`, `urgency`. This is the data source for the filtered "Claim" view in the agent dashboard. |
| POST   | `/complaints/:id/claim`           | Agent self-assigns an unassigned complaint. Validations: (a) complaint's `assignedAgentId` must be null, (b) complaint's `assignedDepartment` must match `agent.department`, (c) complaint's `location.district` must match `agent.municipality`, (d) department must be in the agent-eligible list (not the 6 municipal-admin departments), (e) agent must not be at workload limit. On success: set `assignedAgentId`, increment `agent.currentWorkload`, set `status` to `UNDER_PROCESSING`, compute and set `slaDeadline`. |

> **Frontend integration note**: The existing `POST /api/agent/complaints/:id/assign` endpoint is renamed to `/claim` with stricter validations. The frontend call in `handleAssignToMe()` must be updated to hit `/claim` instead of `/assign`, but since the user asked not to change frontend this can be done via an alias or the new route kept at `/assign` path with a redirect/alias. The safest approach is to keep it at `/complaints/:id/assign` path (existing URL) but rewrite the handler internally.

### 3.6 Managing an Assigned Complaint

| Method | Path                              | Description |
|--------|-----------------------------------|-------------|
| GET    | `/complaints/:id`                 | Returns full complaint details. Agent must be the `assignedAgentId`. |
| PUT    | `/complaints/:id/status`          | Updates status. Agent must be the `assignedAgentId`. Valid transitions: `REGISTERED → UNDER_PROCESSING`, `UNDER_PROCESSING → COMPLETED | ON_HOLD | FORWARDED | REJECTED`. On `COMPLETED`: decrement agent workload, set `dateOfResolution`, compute `avgResolutionTime`, trigger badge check. Body: `{ status }`. |
| PUT    | `/complaints/:id/escalate`        | Escalates to municipal admin. Agent must be the `assignedAgentId`. Finds the matching `DepartmentMunicipalAdmin` by `municipality = complaint.location.district`. Sets `managedByMunicipalAdminId`, `status = ESCALATED_TO_MUNICIPAL_LEVEL`, `escalationLevel = "MUNICIPAL_ADMIN"`. Decrements agent workload, increments municipal admin workload. Agent's `id` is preserved in `assignedAgentId` for history. |

---

## 4. New Internal Service: Complaint Assignment Dispatcher

Create `lib/assignmentDispatcher.ts`. This replaces the broken `processNextAssignment` polling in the current `agent.ts`.

### What it does

1. Called whenever a new complaint is created (hooked into the user-be complaint submission flow or via a queue event).
2. Reads `complaint.assignedDepartment` and `complaint.location.district`.
3. **If department is in the municipal-admin list**: find the least-loaded active `DepartmentMunicipalAdmin` with matching `municipality` and `department`. Set `managedByMunicipalAdminId`. No agent assignment.
4. **If department is in the agent list**: do NOT auto-assign immediately. Leave `assignedAgentId = null`. The complaint enters the claimable pool.
5. Auto-assign fallback cron (see Section 5.3) handles complaints that remain unclaimed past their SLA threshold.

### Workload-freed reactive assignment (`lib/assignmentDispatcher.ts` — `drainUnclaimedForAgent`)

This is the key mechanism that ensures unassigned complaints are picked up **as soon as capacity opens**, without waiting for the cron.

**When it fires**: any time an agent's `currentWorkload` is decremented — three places:
- `PUT /api/agent/complaints/:id/status` when status becomes `COMPLETED` or `REJECTED`
- `PUT /api/agent/complaints/:id/escalate` on successful escalation
- SLA cron when it auto-escalates a breached complaint assigned to an agent

**What it does**:
1. After decrementing workload, check `agent.currentWorkload < agent.workloadLimit`.
2. If slots are free, query for the oldest unassigned complaint matching `assignedDepartment === agent.department` AND `location.district === agent.municipality` AND `assignedAgentId = null` AND status `REGISTERED`, ordered by `urgency DESC, submissionDate ASC`.
3. If found and the agent is still below their limit: assign it (`assignedAgentId = agent.id`), set `status = UNDER_PROCESSING`, set `slaDeadline` (if not already set), increment `agent.currentWorkload`.
4. Repeat step 2–3 until no more eligible unassigned complaints exist **or** the agent is at their workload limit again.
5. Log how many complaints were auto-assigned in this drain pass.

**Scenario this solves**: All 2 INFRASTRUCTURE agents in Cuttack hit their workload limit of 10. Five new INFRASTRUCTURE/Cuttack complaints arrive and sit unassigned. The moment the first agent resolves a complaint (workload drops to 9 < 10), `drainUnclaimedForAgent` fires immediately and assigns the oldest pending complaint. No cron delay.

**Edge case — no agents available at all**: If every eligible agent in the municipality+department is at capacity, complaints remain in the pool and are handled by the SLA cron's auto-assign pass (Section 5.3), which runs every 15 minutes as a safety net.

---

## 5. SLA System

### 5.1 SLA Deadline Matrix (at complaint creation time)

| Urgency  | SLA Deadline |
|----------|--------------|
| CRITICAL | 48 hours     |
| HIGH     | 72 hours     |
| MEDIUM   | 7 days       |
| LOW      | 14 days      |

### 5.2 Where SLA Deadline is Set

The `slaDeadline` is written in two places:
- **At complaint creation** by validation/processing middleware in user-be (or at the point the complaint enters admin-be's assignment flow): `slaDeadline = submissionDate + offset from matrix`.
- **If an agent claims a complaint** that had no prior deadline (legacy data): set `slaDeadline` at claim time.

The existing `sla String?` field is populated with the human-readable label alongside it, e.g., `"48h (HIGH)"`.

### 5.3 SLA Enforcement Cron (`lib/slaCron.ts`)

A cron job runs every **15 minutes** using `node-cron` (already likely in the project). It does:

1. Find all complaints where `slaDeadline < now()` AND `slaBreached = false` AND status NOT IN `[COMPLETED, REJECTED, DELETED]`.
2. For each: set `slaBreached = true`.
3. If `urgency = CRITICAL` or `HIGH` and not yet escalated → auto-escalate by calling the escalation logic (find matching municipal admin, set `managedByMunicipalAdminId`, set status `ESCALATED_TO_MUNICIPAL_LEVEL`).
4. If agent-assigned: send a notification (log it for now, build a notification model later).
5. Log the breach count.

Additionally, the cron handles **unclaimed complaint auto-assignment** (safety net — the reactive `drainUnclaimedForAgent` in Section 4 is the primary mechanism):
1. Find complaints that are unassigned (`assignedAgentId = null`), not in municipal-admin-only departments, and have been registered for more than: 4 hours (CRITICAL/HIGH) or 24 hours (MEDIUM/LOW).
2. Find the least-loaded active agent with matching `municipality` and `department` that is below their workload limit.
3. If found: assign and compute SLA deadline (if not already set).
4. If not found (all agents at capacity): leave in pool and retry on the next cron tick. If still unassigned after 2× the urgency threshold, escalate to municipal admin.

### 5.4 SLA Endpoint for Agents

| Method | Path               | Description |
|--------|--------------------|-------------|
| GET    | `/sla-breaches`    | Returns the agent's complaints where `slaBreached = true` and status is not resolved. Used to surface overdue items in the frontend as a badge/alert. |

### 5.5 Frontend SLA display (no frontend changes needed)

The existing "Overdue" badge in `my-complaints/page.tsx` already checks `Math.floor((Date.now() - submissionDate) / 86400000) > 7`. Once `slaBreached` and `slaDeadline` fields are returned in complaint data, the frontend can be upgraded in a future iteration to use them directly. For now, the 7-day heuristic continues to work visually.

---

## 6. File Structure After Refactor

```
routes/
  agent.ts              ← REPLACED from scratch (authentication + all new endpoints)
lib/
  assignmentDispatcher.ts   ← NEW: routing logic at complaint intake
  slaCron.ts                ← NEW: SLA enforcement + unclaimed auto-assignment
  redis/
    assignQueue.ts        ← Keep but refactor: used by slaCron for unclaimed queue
```

The following files in `routes/` are **not touched**:
- `auth.ts`, `complaint.ts`, `complaintProcessing.ts`, `municipalAdminRoutes.ts`, `stateAdminRoutes.ts`, `superAdminRoutes.ts`, `publicAnnouncementRoutes.ts`, `publicSurveyRoutes.ts`, `userComplaints.ts`, `chat.ts`, `civicPartnerAuth.ts`, `civicPartnerAnalytics.ts`, `civicPartnerSurveys.ts`, `health.ts`

The `autoAssign.ts` route is **integrated into `assignmentDispatcher.ts`** and the route file removed/emptied.

---

## 7. Middleware Check

`middleware/unifiedAuth.ts` — verify `authenticateAgentOnly` extracts `req.admin.id` from token where `type === "AGENT"`. This is the pattern used throughout the existing code and must be preserved in the new routes.

`authenticateAdmin` (used by complaint.ts routes) — verify it accepts `type === "AGENT"` tokens so agents can continue to hit `GET /api/complaints/all-complaints` and `GET /api/complaints/stats/overview` without changes.

---

## 8. Implementation Order

1. **Schema migration**: Add `slaDeadline DateTime?` and `slaBreached Boolean @default(false)` to `Complaint`. Run `prisma migrate dev`.
2. **`lib/assignmentDispatcher.ts`**: Implement (a) intake routing logic (municipal admin vs agent pool) and (b) `drainUnclaimedForAgent(agentId)` function for workload-freed reactive assignment.
3. **New `routes/agent.ts`**: Implement all endpoints from Section 3 in order: auth → workload → my-complaints → claimable → actions → SLA. Call `drainUnclaimedForAgent` after every workload decrement inside `status` and `escalate` handlers.
4. **`lib/slaCron.ts`**: Implement the SLA cron (SLA breach detection + auto-escalation + unclaimed safety-net auto-assignment). Call `drainUnclaimedForAgent` after any cron-triggered escalation that decrements an agent's workload.
5. **Hook dispatcher**: Call `assignmentDispatcher` from the complaint creation flow (check `complaintProcessing.ts` or user-be intake route).
6. **Wire cron**: Start `slaCron` in `index.ts` alongside the server startup.
7. **Test**: Seed DB (Section 10) — upsert agents only. Verify agent records are created with correct `municipality` and `department` values; do not post test complaints.

---

## 9. Admin-Fe Endpoint Compatibility Matrix

The table below confirms which existing admin-fe calls map to which new backend routes with no frontend changes needed.

| Admin-Fe Call | Source File | New Backend Route | Notes |
|---|---|---|---|
| `GET /api/agent/me` | `Agent/page.tsx` | `GET /api/agent/me` | Same path, same response shape |
| `GET /api/complaints/all-complaints` | `Agent/page.tsx` | `GET /api/complaints/all-complaints` | Unchanged — in `complaint.ts` |
| `GET /api/complaints/stats/overview` | `Agent/page.tsx` | `GET /api/complaints/stats/overview` | Unchanged — in `complaint.ts` |
| `POST /api/agent/complaints/:id/assign` | `Agent/page.tsx` | `POST /api/agent/complaints/:id/assign` | **Same path**, handler rewritten with new validations |
| `PUT /api/agent/complaints/:id/status` | `Agent/page.tsx`, `my-complaints` | `PUT /api/agent/complaints/:id/status` | Same path, same body shape |
| `PUT /api/agent/complaints/:id/escalate` | `Agent/page.tsx`, `my-complaints` | `PUT /api/agent/complaints/:id/escalate` | Same path, improved logic |
| `GET /api/agent/my-complaints` | Proxied via `/api/complaints/assigned` Next.js route | `GET /api/agent/my-complaints` | Same path + response shape |
| `GET /api/complaints/all` (reports page) | `Agent/reports/page.tsx` via Next.js proxy | `GET /api/complaints/all-complaints` (same data) | Next.js proxy `/api/complaints/all` maps to this |

> All existing frontend URLs are preserved. Zero frontend changes required.

---

## 10. Seed Data Plan (see `seed-admins-agents.ts`)

**78 agents total**: 2 agents × 13 departments × 3 municipalities (Cuttack, Khorda, Puri).

Naming convention: `{dept_abbr}.{muni}.{1|2}@gov.in`
Password: `123123123` (bcrypt hashed)
Phone: sequential from `9100000001`

The seed uses `upsert` on `officialEmail` so it is idempotent and safe to re-run.

---

## 11. Notes on the Auto-Assign Queue (`autoAssign.ts`, `redis/assignQueue.ts`)

The existing `startAssignmentPolling` in `agent.ts` peeks a Redis queue but does nothing with it (the `processNextAssignment` function has a `TODO` comment). This dead code is removed.

The new `assignmentDispatcher.ts` does synchronous dispatch at complaint-creation time. The Redis queue is repurposed solely for the SLA cron's unclaimed-auto-assign pass so it isn't lost between server restarts.

---

*End of refactor plan. Implementation starts after this document is approved and migrations are run.*
