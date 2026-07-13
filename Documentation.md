<div align="center">

# 🏛️ SwarajDesk — Documentation

### India's AI-Powered Citizen Grievance Redressal Platform

[![CI/CD](https://github.com/theogaditya/sih-swarajdesk-2025/actions/workflows/ci.yaml/badge.svg)](https://github.com/theogaditya/sih-swarajdesk-2025/actions)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3.x-black)](https://bun.sh/)

</div>

---

## 📋 Table of Contents

1. Executive Summary
2. Live Service Map
3. High-Level Architecture
4. Monorepo & Package Layout
5. User Backend (user-be)
6. Admin Backend (admin-be)
7. Complaint Queue (compQueue)
8. Self Service (self)
9. AI Agents Service (agents)
10. Vision Model (Hybrid VLM+ViT)
11. Report-AI (Survey Intelligence)
12. User Frontend (user-fe)
13. Admin Frontend (admin-fe)
14. Database Schema & Data Model
15. Admin Hierarchy & RBAC
16. Sentient AI — Full Deep Dive
17. Help AI — Full Deep Dive
18. Abuse AI — Full Deep Dive
19. Dedup AI — Full Deep Dive
20. Quality Scorer — Full Deep Dive
21. Image Analysis AI — Full Deep Dive
22. Complaint Report Agent — Full Deep Dive
23. Action Suggestion Agent — Full Deep Dive
24. Complaint Lifecycle Pipeline
25. CompQueue Processing Pipeline — Deep Dive
26. Auto-Assignment Engine
27. Blockchain Integration
28. CivicPartner & Survey System
29. Real-Time Communication
30. Monitoring & Observability
31. Infrastructure & Deployment
32. CI/CD Pipeline
33. Security Architecture
34. Technology Stack
35. Complete Complaint Lifecycle — Step-by-Step
36. Frontend Feature Map — user-fe & admin-fe

---

## 1. Executive Summary

SwarajDesk is a production-grade, AI-augmented citizen grievance redressal platform built for the Government of India. The platform enables citizens to file, track, and resolve civic complaints across 13 government departments, providing multi-tier administrative dashboards for field agents, municipal admins, state admins, and civic partners.

Key capabilities include Sentient AI (LangGraph ReAct with 18 tools), a Hybrid VLM+ViT Vision Model, Report-AI for survey intelligence (Gemini 2.5 Pro + ChromaDB), a robust Redis-based compQueue pipeline, an auto-assignment engine, and blockchain-backed immutable audit trails.

---

## 2. Live Service Map

Service | Public URL | Internal Port | Docker Image
---|---:|---:|---
User Frontend | https://gsc-user-fe.abhasbehera.in | 3000 | custom build
Admin Frontend | https://gsc-admin-fe.abhasbehera.in | 3000 | custom build
User Backend | https://gsc-user-beBB.abhasbehera.in | 3000 | custom build
User WebSocket | wss://gsc-ws-user-be.abhasbehera.in | 3001 | custom build
Admin Backend | https://gsc-admin-be.abhasbehera.in | 3002 | custom build
CompQueue | https://gsc-comp-queue.abhasbehera.in | 3005 | custom build
AI Agents | https://gsc-agents-be.abhasbehera.in | 4000 | custom build
Report-AI | https://gsc-report-ai.abhasbehera.in | 8000 | mistaholmes/report-ai-model-survey:latest
Grafana | https://gsc-monitoring.abhasbehera.in/grafana | 3000 (internal) | grafana/grafana:latest
Uptime Kuma | https://gsc-kuma.abhasbehera.in | 3001 (internal) | louislam/uptime-kuma:latest
Prometheus | https://gsc-monitoring.abhasbehera.in/prometheus | 9090 (internal) | prom/prometheus:latest

---

## 3. High-Level Architecture

See repository for diagrams. Key components:
- Nginx reverse proxy (Docker Swarm) for TLS termination and routing
- User-backend (Bun + Express) with Bun-native WebSocket server
- Admin-backend (Bun + Express) with role-based routes
- CompQueue worker (Redis consumer) handling AI enrichment and DB persistence
- Agents service (LangChain.js + LangGraph) exposing Sentient AI and ancillary agents
- Vision Model (FastAPI) for high-precision image classification
- Report-AI (FastAPI) for survey intelligence (RAG pipeline)
- PostgreSQL (NeonDB), Redis, AWS S3, AWS Secrets Manager

---

## 4. Monorepo & Package Layout

packages/
- user-be/
- admin-be/
- compQueue/
- agents/
- self/
- user-fe/
- admin-fe/
- blockchain-be/

Each package contains `bin.ts`, `routes/`, `services/`, `middleware/`, `lib/`, and `Dockerfile`.

---

## 5. User Backend (user-be)

Ports: 3000 (HTTP), 3001 (WebSocket)
Runtime: Bun + Express
ORM: Prisma

Primary responsibilities:
- User auth (JWT)
- Complaint submission (pushes to Redis `complaint:registration:queue`)
- Serving frontend APIs, badge queries, announcements, surveys
- WebSocket notifications for complaint status updates and chat

Key route: `POST /api/complaints` — validates payload via Zod and pushes raw complaint JSON to Redis. Returns `201 Created` immediately.

---

## 6. Admin Backend (admin-be)

Port: 3002
Runtime: Bun + Express

Responsibilities:
- Admin auth and role management (AGENT, MUNICIPAL_ADMIN, STATE_ADMIN, CIVIC_PARTNER)
- AI CTA execution endpoints (apply recommended actions)
- Auto-assignment workers and manual overrides
- SLA cron, blockchain queue producer

Auth middleware normalizes legacy `accessLevel` to current admin types.

---

## 7. Complaint Queue (compQueue)

Port: 3005
Runtime: Bun + Express

Responsibilities:
- Poll `complaint:registration:queue` and atomically LMOVE to `complaint:processing:inprogress`
- Validate (Zod), verify category FK, call GCP sub-category standardization, compute quality scores, persist in a SQL transaction with Location record, update bidirectional similar complaint links, and push non-duplicates to `complaint:processed:queue`.
- Note: text moderation and duplicate detection are performed in the `user-fe` Sentient AI registration flow; `compQueue` now relies on frontend-provided flags (`AIabusedFlag`, `abuseMetadata`, `isDuplicate`, `similarComplaintIds`).
- Retry on transient errors; permanently drop on schema or FK errors.
- Polling interval: 10s

---

## 8. Self Service (self)

Lightweight domain-scoped chatbot (GPT-4o-mini). Stateless, used for quick FAQ/help. Heavy agent work moved to `agents` service.

---

## 9. AI Agents Service (agents)

Port: 4000
Framework: LangChain.js + LangGraph

Agents included (primary):
- Sentient AI (Agent 1)
- Help AI (Agent 2)
- Dedup AI (Agent 3)
- Abuse AI (Agent 4)
- Quality Scorer
- Image Analysis AI
- Image Match AI
- Complaint Report Agent
- Action Suggestion Agent

Shared guardrails are appended to every system prompt to prevent PII leakage, prompt injection, and unsafe actions.

---

## 10. Vision Model (Hybrid VLM+ViT)

FastAPI service combining a VLM (Groq LLaMA) and a fine-tuned ViT guard layer. Returns sector and category (20-sector taxonomy), confidence scores, and a canonical JSON used by the frontend to prefill complaint fields. Deployed on a GPU-backed EC2; fallback to CPU mode available.

API: `POST /predict` accepts file uploads (`image`) or `image_url`.

---

## 11. Report-AI (Survey Intelligence)

Docker image: `mistaholmes/report-ai-model-survey:latest`
Stack: FastAPI + Gemini 2.5 Pro + ChromaDB

Produces three linked outputs (Survey Report, Backend Report, Fusion Report) via a 3-phase RAG pipeline. Streams results via SSE to the CivicPartner UI.

---

## 12. User Frontend (user-fe)

Next.js 15, TypeScript, Tailwind. Complaint filing includes Vision Model prediction, Image Analysis AI statement generation, Dedup check, Quality Scorer preview, and Abuse moderation review.

---

## 13. Admin Frontend (admin-fe)

Next.js 15. Four dashboards aligned to the active admin roles:
- Agent
- Municipal Admin
- State Admin
- CivicPartner

Note: Remove any user-facing references to "Super Admin" — platform uses only the four roles above for frontend flows.

---

## 14. Database Schema & Data Model

Core models: User, Complaint, ComplaintLocation, Agent, MunicipalAdmin, StateAdmin, CivicPartner, Survey, Badge, Announcement, Category.

Complaint fields include AI-enriched columns: `AIabusedFlag`, `abuseMetadata`, `AIstandardizedSubCategory`, `qualityScore`, `qualityBreakdown`, `isDuplicate`, `similarComplaintIds`, `blockchainHash`.

---

## 15. Admin Hierarchy & RBAC

Active roles (frontend-visible): AGENT, MUNICIPAL_ADMIN, STATE_ADMIN, CIVIC_PARTNER.

Each role's capabilities are documented in admin-be routes. The backend code contains a legacy `SUPER_ADMIN` enum but **do not document or expose "Super Admin" in frontend user docs**.

---

## 16. Sentient AI — Full Deep Dive

System prompt (verbatim):

"""
You are Sentient AI, a friendly bilingual (English + Hindi + Hinglish) assistant for SwarajDesk — India's citizen grievance redressal platform.

HOW TO TALK:
- Sound like a helpful friend, short sentences, no markdown formatting, detect user language, respond same language.

[AUTONOMY RULES]: When a user describes a problem, IMMEDIATELY call tools. Don't ask category — figure it out.

[TOOLS]: findComplaints, findMyComplaints, getComplaintStatus, getTrending, getCategories, getUserProfile, getDistrictInfo, getAnnouncements, getDepartmentStats, getGuidance, searchKnowledge, findSimilarComplaints, sendEscalationEmail, createComplaintDraft, analyzeImage, navigateTo, upvoteComplaint, detectLocation.

[COMPLAINT REGISTRATION]: 5 steps: description → category+subCategory → location (offer detectLocation) → urgency → photo.

[ESCALATION]: Include [ESCALATE_TO_HELP_AI] if user frustrated after 3+ tries, asks for human support, or has unsolvable technical issue.
+ SHARED_GUARDRAIL_INSTRUCTIONS
"""

Sentient AI is implemented in `packages/agents/agents/sentientAI.ts` and uses `createReactAgent` from LangGraph with a bindUserId wrapper. Key output markers: `[ESCALATE_TO_HELP_AI]` and `[START_COMPLAINT_FLOW]`. The agent returns structured outputs: `{ response, shouldEscalate, shouldStartComplaint, complaintDraft, navigationPath, detectLocation }`.

Included tools (auto-inject userId): findComplaints, findMyComplaints, getComplaintStatus, getTrending, getCategories, getUserProfile, getDistrictInfo, getAnnouncements, getDepartmentStats, getGuidance, searchKnowledge, findSimilarComplaints, sendEscalationEmail, createComplaintDraft, analyzeImage, navigateTo, upvoteComplaint, detectLocation.

---

## 17. Help AI — Full Deep Dive

System prompt (verbatim):

"""
You are Help AI, the dedicated customer care specialist for SwarajDesk. You are Agent 2.

You are activated when Sentient AI escalates. Tools: searchKnowledge, sendEscalationEmail, findMyComplaints, getComplaintStatus, getUserProfile. Use [ESCALATION_COMPLETE] marker after escalation.
"""

Help AI is transaction-focused, escalates to human support using `sendEscalationEmail` with full conversational context when necessary.

---

## 18. Abuse AI — Full Deep Dive

System prompt (verbatim; key excerpts):

"""
You are Abuse AI, the multilingual content moderator for SwarajDesk. You are Agent 4.

Detects slurs, threats, obscenity, hate speech, casteist/communal slurs. Severity: low/medium/high. Mask offensive words with ****** (6 asterisks). Includes Hindi/Hinglish examples in the prompt.
"""

Output schema includes `has_abuse`, `severity`, `clean_text`, `flagged_spans`, `flagged_phrases`, `explanation_en`, `explanation_hi`.

---

## 19. Dedup AI — Full Deep Dive

System prompt (verbatim; key excerpts):

"""
You are Dedup AI, the smart complaint deduplication analyst. Agent 3.

Thresholds: >0.90 duplicate, 0.70–0.90 similar, <0.70 unique. Return JSON: { hasSimilar, isDuplicate, matches[], suggestion, confidence }.
"""

Dedup AI uses `findSimilarComplaints` and exposes an API for client-side review before submission.

---

## 20. Quality Scorer — Full Deep Dive

Quality scoring logic (implemented in `agents/qualityScorer.ts`):
- Four dimensions × 25 points = 100 total: Clarity, Evidence, Location, Completeness
- Ratings: poor (0–25), fair (26–50), good (51–75), excellent (76–100)
- Penalties for no photo, duplicates, abusive language, category mismatch

Structured output: { score, breakdown: { clarity, evidence, location, completeness }, suggestions, rating }

---

## 21. Image Analysis AI — Full Deep Dive

System prompt (verbatim; key excerpts):

"""
You are Image Analysis AI, the visual complaint classifier for SwarajDesk.

Grounding rules: image as only source of truth, never fabricate. Urgency: LOW/MEDIUM/HIGH definitions. Return a 2–5 sentence first-person complaint statement.
"""

Outputs JSON: { category, subCategory, complaint, urgency }.

---

## 22. Complaint Report Agent — Full Deep Dive

System prompt (verbatim; key excerpts):

"""
You are the SwarajDesk State Intelligence Report Generator. Produce structured, data-driven administrative reports for senior State Government officials.

12 required sections: executive_summary, comprehensive_overview, systemic_issues, district_analysis, category_insights, resolution_performance, quality_assessment, escalation_patterns, strategic_recommendations, priority_alerts, generated_at, stats_snapshot.

RULES: Do not invent numbers. Use only provided stats.
"""

The agent streams results via SSE and is used by State Admin UI.

---

## 23. Action Suggestion Agent — Full Deep Dive

System prompt (verbatim; key excerpts):

"""
You are the SwarajDesk Action Intelligence Engine.

It produces prioritized actions with types: ESCALATE_COMPLAINT, UPDATE_COMPLAINT_STATUS, CREATE_ANNOUNCEMENT, TRIGGER_AUTO_ASSIGN, UPDATE_MUNICIPAL_ADMIN_STATUS, NAVIGATE.

Each action must include a data-backed rationale and be executable from the admin-be CTA endpoint.
"""

---

## 24. Complaint Lifecycle Pipeline

See Section 25 for the compQueue deep dive. In short: user submits → pushed to registration queue → compQueue LMOVE → AI enrichment (GCP sub-category standardization, quality scoring — compQueue relies on Sentient AI-provided moderation and dedup flags) → DB transaction → push to processed queue → auto-assign → blockchain queue.

---

## 25. CompQueue Processing Pipeline — Deep Dive

(Full detailed step list captured from `packages/compQueue/services/complaintProcessor.ts`):
- Redis `LMOVE` atomic dequeue from `complaint:registration:queue` → `complaint:processing:inprogress`
- 7-step enrichment: Zod validation → category FK check → GCP AI sub-category standardization → abuse moderation → quality score extraction → duplicate detection → bidirectional linking
- PostgreSQL transaction with Location embedded
- Badge service check (non-blocking)
- Only non-duplicate complaints pushed to `complaint:processed:queue`
- Error handling: DB constraint errors → remove permanently; Network/AI errors → retry (move back to registration queue)
- 10-second polling interval

---

## 26. Auto-Assignment Engine

(Details captured from `packages/admin-be/routes/autoAssign.ts`):
- Agent departments: INFRASTRUCTURE, WATER_SUPPLY_SANITATION, ELECTRICITY_POWER, MUNICIPAL_SERVICES, ENVIRONMENT, POLICE_SERVICES
- Municipal admin departments: EDUCATION, REVENUE, HEALTH, TRANSPORTATION, HOUSING_URBAN_DEVELOPMENT, SOCIAL_WELFARE, PUBLIC_GRIEVANCES
- District-based matching (case-insensitive), workload check, random selection among eligible
- Pushes to `complaint:blockchain:queue` on successful assignment

---

## 27. Blockchain Integration

Complaints are pushed to `complaint:blockchain:queue` for immutable EVM writes. Fields stored include `blockchainHash`, `ipfsHash`, `isOnChain`, and `blockchainStatus`.

### Blockchain Features (Consolidated)

This project contains a rich set of planned and implemented blockchain features (see `packages/blockchain-be`) designed to provide tamper-proof auditability, citizen-facing verification, and automated accountability. Key features:

- **On-Chain Status Audit Trail:** Every complaint status change is recorded on-chain (who, when, reason). Provides an immutable, verifiable timeline.
- **SLA Breach Recording & Time-Locked Escalation:** SLA deadlines are enforced using block timestamps. Breaches emit events and can auto-escalate without human intervention.
- **AI-Oracle Fraud Slasher:** Vision-AI validates proof-of-work photos; detected fraud triggers on-chain `slashAgent` actions and alerts/state escalation.
- **Solidarity Blocks / Duplicate Grouping:** Related complaints can be grouped into a solidarity block; the group must be resolved collectively (prevents cherry-picking fixes).
- **Upvote Integrity & Token Voting:** Move upvotes on-chain to prevent manipulation; optionally allocate non-transferable voting tokens for resident-driven prioritization.
- **Agent Performance on Chain:** Record agent resolution events and reputation on-chain for verifiable performance metrics.
- **Resolution NFTs / Soulbound Tokens (SBTs):** Mint non-transferable tokens to citizens on confirmed resolutions as portable proof of civic participation.
- **Whistleblower & ZK Anonymous Filing:** Support anonymous complaints via ZK proofs or walletless flows, enabling verified but anonymous submissions.
- **SLA Escrow / Automatic Penalties:** Smart contracts can hold escrows and automatically disburse micropayments to citizens when SLAs are breached.
- **AI Report Anchoring:** Hash and pin RAG/AI reports to IPFS and anchor the CID on-chain for tamper-proof administrative reports.
- **Merkle Batching & Cost Controls:** Batch commitments (Merkle roots) can be written on-chain to save gas while preserving verifiability.
- **Citizen-Facing Receipts & QR Verification:** Citizens receive shareable receipts (links/QR) that fetch the complaint timeline directly from the blockchain (no DB trust required).

Implementation notes & integration hooks:

- A `blockchain-worker` consumes `complaint:blockchain:queue`, uploads payloads to IPFS, and calls smart contract functions (handles retries and confirmation). See `packages/blockchain-be/src/worker.ts`.
- Smart contract functions include `registerComplaint`, `updateStatus`, `createSolidarityBlock`, `slashAgentFraud`, and SLA enforcement helpers (see `contracts/GrievanceContract.sol`).
- Use Sepolia for development; plan for Polygon/Arbitrum L2 in production for cost efficiency. Pin IPFS data (Pinata/Web3.Storage) to ensure availability.
- DB schema additions: `blockchainHash`, `ipfsHash`, `isOnChain`, `blockchainBlock`, and related migration notes exist under the backend prisma folder.

Recommended starting scope for demos/hackathons:

- Start with: On-Chain Status Audit Trail, SLA Breach Recording (time-locked escalation), and Citizen Receipt (QR verification).
- Add: AI-Oracle Fraud Slasher and Solidarity Blocks to showcase unique civic integrity capabilities.
- Reserve advanced items (ZK whistleblower, agent staking) for longer-term builds.

Refer to `packages/blockchain-be/BLOCKCHAIN_FEATURES.md`, `doc/WALLETLESS_BLOCKCHAIN_FEATURES.md`, and `doc/FEATURE_IMPLEMENTATION_DETAILS.md` for full design details and implementation guidance.

---

## 28. CivicPartner & Survey System

CivicPartners create surveys and can upload or link scraped forum data for Report-AI processing. The report-ai service uses Gemini 2.5 Pro + ChromaDB to produce three linked reports streamed via SSE.

---

## 29. Real-Time Communication

Bun-native WebSocket server in user-be handles live notifications and chat. Admin-be chat endpoints integrate with the user-be WebSocket system to send messages to users tied to complaint threads.

---

## 30. Monitoring & Observability

Prometheus, Grafana, Loki, Promtail, Uptime Kuma. Grafana routed at `/grafana` path via nginx. Uptime Kuma monitors all service health endpoints and critical infra.

---

## 31. Infrastructure & Deployment

Single-node Docker Swarm on a GCP VM. Nginx reverse proxy handles TLS termination and per-service routing. Ansible playbooks automate deployments.

---

## 32. CI/CD Pipeline

GitHub Actions builds Bun workspaces, runs TypeScript checks, lints, builds Docker images, and performs rolling updates on the production Swarm. Health checks and automatic rollback are configured.

---

## 33. Security Architecture

Transport: TLS everywhere. Secrets: AWS Secrets Manager. Input validation: Zod. AI guardrails: input sanitizer, output filter, PII removal. Abuse moderation and duplicate detection are performed client-side by the Sentient AI flow in `user-fe` during complaint registration; the `compQueue` no longer performs text moderation or duplicate detection and instead relies on frontend-provided flags (`AIabusedFlag`, `abuseMetadata`, `isDuplicate`, `similarComplaintIds`).

---

## 34. Technology Stack

Backend: Bun, Express, Prisma, PostgreSQL (NeonDB), Redis, LangChain.js + LangGraph
Frontend: Next.js 15, Tailwind, Capacitor (Android)
AI: OpenAI / Google Gemini / Anthropic multi-provider setup, Groq LLaMA VLM, ViT guard models, Gemini 2.5 Pro with ChromaDB for Report-AI

---

**SwarajDesk** — Built for India's citizens, powered by AI, secured by blockchain.

*© 2025 SwarajDesk Team — IIT Bhubaneswar*

</div>

---

## 35. Complete Complaint Lifecycle — Step-by-Step

This section traces the full journey of a single complaint from the moment a citizen opens the registration form to the final blockchain write, naming every API call, AI tool invocation, queue operation, and database transaction that occurs along the way.

---

### Phase 0 — Pre-submission (Client-side AI enrichment)

All steps below occur inside `packages/user-fe/app/regComplaint/page.tsx` before any network call reaches user-be.

| Step | What happens | Tool / API invoked |
|------|-------------|--------------------|
| 0-A | User optionally uploads a **photo**. The file is sent to the Vision Model (`POST https://gsc-agents-be.abhasbehera.in/api/v1/image/predict` or an internal route mapped to the FastAPI `/predict` endpoint). | Hybrid VLM+ViT Vision Model |
| 0-B | Vision Model returns `{ category, subCategory, complaint, urgency, confidence }`. The frontend **auto-fills** category/subCategory/description/urgency fields (autofill path). | Vision Model inference |
| 0-C | Image Analysis AI is invoked (`POST /api/agents/image-analysis`) with the same image. Returns a 2–5 sentence first-person complaint statement that populates the description field. | `imageAnalysisAI.ts` — `analyzeImage` tool |
| 0-D | As the user types/confirms description, **Dedup AI** is queried (`POST /api/agents/dedup`) with `{ description, subCategory, district }`. Returns `{ hasSimilar, isDuplicate, matches[], confidence, suggestion }`. A similarity banner is shown if `confidence > 0.70`. | `dedupAI.ts` — `findSimilarComplaints` tool |
| 0-E | **Quality Scorer** is invoked (`POST /api/agents/quality`) with the current complaint payload. Returns `{ score, breakdown: { clarity, evidence, location, completeness }, rating, suggestions }`. The quality score badge is rendered on the review step. | `qualityScorer.ts` |
| 0-F | **Abuse AI** client-side review — on step transition, the description is sent to `POST /api/agents/abuse`. Returns `{ has_abuse, severity, clean_text, flagged_spans, flagged_phrases, explanation_en, explanation_hi }`. If `has_abuse === true`, the user sees flagged phrases highlighted and the cleaned text. `AIabusedFlag` and `abuseMetadata` are stored in form state. | `abuseAI.ts` |
| 0-G | On the Location step, if the user taps **Detect Location**, Sentient AI's `detectLocation` tool is called via the frontend, which uses the browser Geolocation API and reverse-geocodes the result to fill pin/district/city/locality. | `detectLocation` (browser Geolocation + reverse geocode) |

After all four steps (Category → Details → Location → Review) are completed and the citizen hits **Submit**:

---

### Phase 1 — Submission to user-be

**Endpoint:** `POST https://gsc-user-be.abhasbehera.in/api/complaints`
**Service:** `packages/user-be/routes/createComplaint.ts`

| Step | What happens |
|------|--------------|
| 1-A | Auth middleware (`packages/user-be/middleware/`) verifies the JWT bearer token and attaches `req.userId`. |
| 1-B | If a file is attached, `multer` buffers it in memory (uploadMiddleware.single("image")). |
| 1-C | **S3 upload** — `uploadComplaintImage(buffer, filename, mimetype)` is called. The image is placed in the configured AWS S3 bucket. The CDN-backed URL is written to `attachmentUrl`. |
| 1-D | All JSON form-data fields (`location`, `qualityBreakdown`, `similarComplaintIds`, `abuseMetadata`, etc.) are parsed from multipart strings back to their native types. |
| 1-E | **Zod validation** — `createComplaintSchema.safeParse(bodyData)` validates the full payload. 400 is returned on failure. |
| 1-F | **Redis push** — `complaintQueueService.pushToQueue(payload)` executes `RPUSH complaint:registration:queue <json>`. The API returns `201 Created` immediately without waiting for processing. |

---

### Phase 2 — compQueue Processing Pipeline

**Service:** `packages/compQueue/services/complaintProcessor.ts`
A background `setInterval` (10 s) drives the processing loop.

| Step | What happens | Redis / DB operation |
|------|-------------|---------------------|
| 2-A | **Atomic dequeue** — `LMOVE complaint:registration:queue complaint:processing:inprogress LEFT RIGHT`. Ensures no duplicate processing across restarts. | Redis LMOVE |
| 2-B | **Zod validation** — `complaintProcessingSchema.safeParse(rawData)`. Invalid payloads are removed with `LREM` and dropped permanently. | Redis LREM |
| 2-C | **Category FK check** — `prisma.category.findUnique({ where: { id } })`. If the category does not exist the complaint is LREM'd and dropped. | PostgreSQL SELECT |
| 2-D | **GCP AI Sub-category Standardization** — `standardizeSubCategory(complaintData.subCategory)` calls the Google Cloud Natural Language / custom GCP endpoint to normalise free-text sub-categories into canonical taxonomy values. Returns `AIstandardizedSubCategory`. | GCP API call |
| 2-E | **Abuse moderation** — Sentient AI in `user-fe` performs text moderation during registration and sets `AIabusedFlag` and `abuseMetadata`. `compQueue` trusts these flags and will NOT call the Abuse AI moderation endpoint; if `AIabusedFlag` and `abuseMetadata` are present, `complaintData.description` will use the provided `clean_text` when available. | (no external call) |
| 2-F | **Quality Score extraction** — `qualityScore` and `qualityBreakdown` are read from the payload (already computed client-side). No new AI call if already present. |
| 2-G | **Client-provided dedup info** — deduplication is performed client-side by Dedup AI (Sentient AI). `compQueue` uses `similarComplaintIds` and `isDuplicate` provided in the payload to set linkage and flags; it does not perform an independent `findFirst` duplicate lookup. | (uses payload fields) |
| 2-H | **PostgreSQL transaction** — `db.$transaction(async tx => { ... })` creates the Complaint row with the embedded Location record in a single atomic write. Fields persisted: `complainantId`, `categoryId`, `subCategory`, `AIstandardizedSubCategory`, `description`, `isDuplicate`, `AIabusedFlag`, `abuseMetadata`, `qualityScore`, `qualityBreakdown`, `hasSimilarComplaints`, `similarComplaintIds`, `urgency`, `attachmentUrl`, `assignedDepartment`, `isPublic`, `status = "REGISTERED"`, plus Location (`pin`, `district`, `city`, `locality`, `street`, `latitude`, `longitude`). | PostgreSQL INSERT (transaction) |
| 2-I | **Bidirectional dedup linking** — inside the same transaction, for every id in `similarComplaintIds`, the referenced complaint's `similarComplaintIds` array is updated to include the new complaint's id and its `hasSimilarComplaints` flag is set to `true`. | PostgreSQL UPDATE (per similar complaint) |
| 2-J | **Remove from processing queue** — `LREM complaint:processing:inprogress 1 <json>` after successful DB insert. | Redis LREM |
| 2-K | **Badge service** (non-blocking) — `getBadgeService(db).checkBadgesAfterComplaint(userId, assignedDepartment)` awards milestone badges (e.g., first complaint, department badges). Errors are caught and logged but do not fail the pipeline. | PostgreSQL SELECT + INSERT |
| 2-L | **Push to processed queue** (non-duplicates only) — `processedComplaintQueueService.pushToQueue({ id, seq, status, categoryId, subCategory, assignedDepartment, city, district })` executes `RPUSH complaint:processed:queue <json>`. Duplicate complaints are persisted in the DB (for audit) but NOT pushed forward. | Redis RPUSH |

**Error handling:** Prisma constraint codes `P2002`, `P2003`, `P2025` → `LPOP` and discard (data permanently invalid). All other errors → move the complaint from `complaint:processing:inprogress` back to `complaint:registration:queue` for retry on the next poll cycle.

---

### Phase 3 — Auto-Assignment

**Service:** `packages/admin-be/routes/autoAssign.ts`
A separate background poll (driven by admin-be) drains `complaint:processed:queue`.

| Step | What happens | Operation |
|------|-------------|----------|
| 3-A | **Dequeue** — `processedComplaintQueueService.popFromQueue()` executes `LPOP complaint:processed:queue`. | Redis LPOP |
| 3-B | **Fetch full complaint** — `prisma.complaint.findUnique({ where: { id }, include: { location: true } })` to read the district and current state. | PostgreSQL SELECT |
| 3-C | **Department routing** — `assignedDepartment` is checked against two static lists: `AGENT_DEPARTMENTS_AUTO` (INFRASTRUCTURE, WATER_SUPPLY_SANITATION, ELECTRICITY_POWER, MUNICIPAL_SERVICES, ENVIRONMENT, POLICE_SERVICES) and `MUNICIPAL_ADMIN_DEPARTMENTS_AUTO` (EDUCATION, REVENUE, HEALTH, TRANSPORTATION, HOUSING_URBAN_DEVELOPMENT, SOCIAL_WELFARE, PUBLIC_GRIEVANCES). |
| 3-D (agent path) | `prisma.agent.findMany({ where: { municipality: district, status: 'ACTIVE' } })`. Filters to agents where `currentWorkload < workloadLimit`. A **random** agent is selected from the eligible pool. | PostgreSQL SELECT |
| 3-E (agent path) | **Atomic transaction** — `prisma.complaint.update({ status: 'UNDER_PROCESSING', assignedAgentId })` + `prisma.agent.update({ currentWorkload: +1 })`. | PostgreSQL UPDATE (transaction) |
| 3-D (muni path) | `prisma.departmentMunicipalAdmin.findMany({ where: { municipality: district, status: 'ACTIVE' } })`. Filters by workload capacity. The **least-loaded** admin is selected. | PostgreSQL SELECT |
| 3-E (muni path) | **Atomic transaction** — `prisma.complaint.update({ status: 'UNDER_PROCESSING', managedByMunicipalAdminId, escalationLevel: 'MUNICIPAL_ADMIN' })` + `prisma.departmentMunicipalAdmin.update({ currentWorkload: +1 })`. | PostgreSQL UPDATE (transaction) |
| 3-F | **Blockchain queue push** — `blockchainQueueService.pushToQueue({ id, seq, status, categoryId, subCategory, assignedDepartment, city, district, assignedTo, assignedAt })` executes `RPUSH complaint:blockchain:queue <json>`. | Redis RPUSH |

---

### Phase 4 — Blockchain Write

**Service:** `packages/blockchain-be/` (EVM writer)

| Step | What happens |
|------|--------------|
| 4-A | Blockchain worker polls `complaint:blockchain:queue` with `LPOP`. |
| 4-B | Constructs the on-chain payload: complaint id, sequence number, department, district, assignedTo, assignedAt, status. |
| 4-C | Submits an EVM transaction. On success, `prisma.complaint.update({ blockchainHash, ipfsHash, isOnChain: true, blockchainStatus: 'CONFIRMED' })`. |
| 4-D | The `blockchainHash` and `blockchainStatus` fields become visible to the citizen in the dashboard blockchain widget. | PostgreSQL UPDATE |

---

### Phase 5 — Resolution & Admin Actions

| Step | What happens | API |
|------|-------------|-----|
| 5-A | Assigned agent/municipal admin opens the complaint in their dashboard and updates the status (IN_PROGRESS, RESOLVED, REJECTED). | `PATCH /api/admin/complaints/:id` (admin-be) |
| 5-B | Status change triggers a **WebSocket push** from user-be to the citizen's active connection on `wss://gsc-ws-user-be.abhasbehera.in` (port 3001). | Bun-native WebSocket broadcast |
| 5-C | If escalation is needed, agent marks complaint for escalation; `escalationLevel` is promoted to `MUNICIPAL_ADMIN` or `STATE_ADMIN`. At each promotion, the complaint is re-assigned and the agent/admin workload counters are updated. | PostgreSQL UPDATE |
| 5-D | State Admin or Municipal Admin can trigger the **Action Suggestion Agent** (`POST /api/agents/action-suggestion`) to receive AI-generated prioritised actions (ESCALATE_COMPLAINT, UPDATE_COMPLAINT_STATUS, CREATE_ANNOUNCEMENT, TRIGGER_AUTO_ASSIGN, etc.) with data-backed rationale. | `actionSuggestionAgent.ts` |
| 5-E | Admin executes an AI-suggested action via the **CTA endpoint** (`POST /api/admin/ai-cta`), which maps action type to the respective admin-be service call. | `aiAgentCTARoutes.ts` |
| 5-F | On RESOLVED, agent workload counter is decremented and an SLA cron job updates resolution time metrics. | PostgreSQL UPDATE + cron |

---

### Summary — All external service calls in one complaint's life

```
Browser → Vision Model (VLM+ViT)    POST /predict
Browser → Image Analysis AI          POST /api/agents/image-analysis
Browser → Dedup AI                   POST /api/agents/dedup
Browser → Quality Scorer             POST /api/agents/quality
Browser → Abuse AI                   POST /api/agents/abuse
Browser → AWS S3                     (file upload via user-be proxy)
Browser → user-be                    POST /api/complaints
user-be → AWS S3                     uploadComplaintImage()
user-be → Redis                      RPUSH complaint:registration:queue
compQueue → Redis                    LMOVE → complaint:processing:inprogress
compQueue → GCP API                  standardizeSubCategory()
compQueue → PostgreSQL               SELECT (category FK), INSERT (complaint + location),
                                     UPDATE (bidirectional dedup links)
compQueue → Redis                    LREM complaint:processing:inprogress
compQueue → PostgreSQL               SELECT + INSERT (badges)
compQueue → Redis                    RPUSH complaint:processed:queue
admin-be  → Redis                    LPOP complaint:processed:queue
admin-be  → PostgreSQL               SELECT (agents/admins), UPDATE (complaint + workload)
admin-be  → Redis                    RPUSH complaint:blockchain:queue
blockchain-be → Redis                LPOP complaint:blockchain:queue
blockchain-be → EVM node             eth_sendRawTransaction
blockchain-be → PostgreSQL           UPDATE (blockchainHash, isOnChain)
user-be   → Browser                  WebSocket push (status update)
```

---

## 36. Frontend Feature Map — user-fe & admin-fe

### 36-A. User Frontend (user-fe) — `packages/user-fe`

Build: Next.js 15, TypeScript, Tailwind CSS, Capacitor (Android)

#### Authentication & Onboarding
- **Register** — `POST /api/auth/register` (user-be `adduser.ts`). Creates a new user account.
- **Login** — `POST /api/auth/login` (user-be `loginUser.ts`). Returns a JWT stored in localStorage / secure cookie.
- **Logout** — `POST /api/auth/logout` (user-be `logoutUser.ts`). Clears the session.
- **Profile update** — `PATCH /api/user/profile` (user-be `updateProfile.ts`). Edits display name, avatar, contact info.

#### Dashboard (`/dashboard`)
- **Overview panel** — Civic Score, XP bar (level + XP to next level), totalComplaints, resolvedComplaints, earnedBadges, per-status breakdown.
- **Active Reports Grid** — cards for each open complaint with live status badges.
- **Report History View** — paginated list of all past complaints with filters.
- **Announcements Widget** — pulls from `GET /api/announcements` (user-be `announcements.ts`). Displays district/department-scoped announcements.
- **Blockchain Widget** — shows `blockchainHash`, `isOnChain`, and `blockchainStatus` for each complaint that has been committed to the chain.
- **Civic Standing Section** — gamification display: level name, badge rack, XP progress ring.
- **All Badges Modal** — grid of every badge (earned and locked) with rarity and earn date.
- **Profile Settings Modal** — inline profile editing without leaving the dashboard.
- **Surveys View** — lists active surveys from CivicPartners; citizen can submit responses.
- **Civic Map View** — map layer showing nearby complaints (public complaints by district).
- **AI Chat Hub (Sentient AI)** — floating chat panel that launches the Sentient AI agent. The agent can: find complaints, check status, explain categories, get trending issues, guide registration, escalate to Help AI, detect location, navigate to pages, upvote complaints, draft complaints.
- **Badge notification toast** — fires when a new badge is awarded (non-blocking; reads from badge socket / API response).

#### Complaint Registration (`/regComplaint`)

Two paths share the same four-step shell:

**Standard Path** (no image)
1. **Step 1 — Category**: User selects department category from `GET /api/categories` list.
2. **Step 2 — Details**: Description, sub-category, urgency, isPublic toggle. Abuse AI review runs inline.
3. **Step 3 — Location**: Manual entry of pin/district/city/locality or GPS auto-detect via `detectLocation`.
4. **Step 4 — Review**: Quality score badge, dedup similarity banner (if `confidence > 0.70`), abuse report (if flagged), final confirmation.

**Autofill Path** (image uploaded)
1. **Step 1 — Upload & Autofill**: Photo uploaded → Vision Model inference → fields auto-populated. Image Analysis AI statement generated. All standard AI checks (Abuse, Dedup, Quality) run automatically.
2. Steps 2–4 are pre-filled but remain editable.

On submit: multipart/form-data `POST /api/complaints` (user-be) with image file + all enriched fields.

#### Complaint Detail Modal
- Accessible from dashboard cards and community feed.
- Shows full complaint info: status timeline, assigned agent/admin name, location map pin, attachmentUrl, AI flags (`AIabusedFlag`, `isDuplicate`, `qualityScore`), `blockchainHash`.
- **Upvote** — citizen can signal agreement with public complaints.
- **Chat thread** — real-time chat with assigned agent/admin via WebSocket (`wss://gsc-ws-user-be.abhasbehera.in`).

#### Community Feed (`/dashboard` → Community tab)
- Public complaints from the citizen's district sorted by recency / upvotes.
- Inline upvote and share controls.
- Opens Complaint Detail Modal on click.

#### Static / Info Pages
- `/about` — platform overview.
- `/privacy` — privacy policy.
- `/terms` — terms of service.
- `/home` — marketing landing page.

---

### 36-B. Admin Frontend (admin-fe) — `packages/admin-fe`

Build: Next.js 15, TypeScript, Tailwind CSS

Four role-scoped dashboards are served under `app/(pages)/`.

#### Common (all roles)
- **JWT login** (`/`) — role-aware login; `accessLevel` mapped to dashboard route on success.
- **Health check** — each dashboard polls the admin-be `/health` endpoint to show connectivity status.

---

#### Agent Dashboard — `app/(pages)/Agent/`

- **Overview page** (`page.tsx`) — current workload count, workload limit, district, department, ACTIVE/INACTIVE status indicator.
- **My Complaints** (`my-complaints/page.tsx`) — paginated list of complaints assigned to the logged-in agent. Filters: status (REGISTERED, UNDER_PROCESSING, RESOLVED, REJECTED), urgency, date range.
  - **Detail view** — full complaint card: description, location, quality score, abuse flags, AI-standardized sub-category, similarity links, attachmentUrl.
  - **Status update** — `PATCH /api/admin/complaints/:id/status` — moves complaint through workflow.
  - **Chat** — real-time chat thread with the complainant over WebSocket.
  - **Escalation** — mark complaint for escalation to Municipal Admin (`escalationLevel` promotion).
- **Profile** (`profile/`) — view and edit agent profile, municipality, department.
- **Audit Logs** (`audit-logs/`) — immutable log of all actions taken by this agent (status changes, chat messages, escalations).
- **Reports** (`reports/`) — personal resolution stats: avg resolution time, complaints resolved per week, department performance.

---

#### Municipal Admin Dashboard — `app/(pages)/Municipal/`

- **Overview page** (`page.tsx`) — district-level complaint summary: total, by status, by department, SLA compliance rate.
- **Components** — shared complaint table component with advanced filters (department, urgency, status, district, date).
  - **Manual assignment** — override auto-assignment; assign a specific complaint to a specific agent (`POST /api/admin/complaints/:id/assign`).
  - **Bulk actions** — mark multiple complaints RESOLVED or escalate to State Admin.
  - **Chat** — initiate message to citizen or agent from complaint detail.
  - **Action Suggestion Agent** — `POST /api/agents/action-suggestion` fetches AI-prioritised actions for the current complaint; admin can execute via **CTA button** which calls `POST /api/admin/ai-cta`.

---

#### State Admin Dashboard — `app/(pages)/State/`

- **Overview page** (`page.tsx`) — state-wide complaint heatmap, district breakdown, department performance matrix.
- **Components** — advanced district-filtered complaint table.
  - **Escalation management** — view all complaints at `escalationLevel = STATE_ADMIN`; assign to municipal admins.
  - **Complaint Report Agent** — `POST /api/agents/complaint-report` triggers the State Intelligence Report Generator. Streams 12-section structured report (executive summary, systemic issues, district analysis, resolution performance, strategic recommendations, priority alerts, etc.) via SSE to the UI.
  - **Action Suggestion Agent** — same CTA flow as Municipal level but with state-scope data.
  - **Announcement creation** — `POST /api/admin/announcements` — broadcasts district/department-scoped notifications visible in citizen dashboards.

---

#### CivicPartner Dashboard — `app/(pages)/CivicPartner/`

- **Overview page** (`page.tsx`) — partner-scoped analytics: survey count, response rate, report generation status.
- **Analytics** (`analytics/`) — charts for survey engagement, response demographics, sentiment breakdown.
- **Surveys** (`surveys/`) — full CRUD for surveys:
  - `surveys/page.tsx` — list of all active and archived surveys.
  - `surveys/new/` — create a new survey with question builder.
  - `surveys/[surveyId]/` — view individual survey results, response distribution.
  - `surveys/archived/` — list of closed surveys.
- **Reports** (`reports/`) — Report-AI output viewer:
  - Upload or link scraped civic forum data.
  - Trigger the 3-phase RAG pipeline (`POST` to `https://gsc-report-ai.abhasbehera.in`).
  - Stream Survey Report, Backend Report, and Fusion Report via SSE.
  - Download or share generated reports.
- **Settings** (`settings/`) — organisation profile, API key management, notification preferences.

---

#### Super Admin (`app/(pages)/Super/`)

> Internal tooling only. Not exposed in user-facing documentation.
- User management, platform-wide stats, system configuration.

---

**SwarajDesk** — Built for India's citizens, powered by AI, secured by blockchain.

*© 2025 SwarajDesk Team *
