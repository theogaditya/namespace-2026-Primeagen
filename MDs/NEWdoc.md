<div align="center">

# 🏛️ SwarajDesk — Production Documentation

### India's AI-Powered Citizen Grievance Redressal Platform

[![CI/CD](https://github.com/theogaditya/sih-swarajdesk-2025/actions/workflows/ci.yaml/badge.svg)](https://github.com/theogaditya/sih-swarajdesk-2025/actions)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3.x-black)](https://bun.sh/)

</div>

---

## 📋 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Live Service Map](#2-live-service-map)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Monorepo & Package Layout](#4-monorepo--package-layout)
5. [User Backend (`user-be`)](#5-user-backend-user-be)
6. [Admin Backend (`admin-be`)](#6-admin-backend-admin-be)
7. [Complaint Queue (`compQueue`)](#7-complaint-queue-compqueue)
8. [Self Service (`self`)](#8-self-service-self)
9. [AI Agents Service (`agents`)](#9-ai-agents-service-agents)
10. [User Frontend (`user-fe`)](#10-user-frontend-user-fe)
11. [Admin Frontend (`admin-fe`)](#11-admin-frontend-admin-fe)
12. [Database Schema & Data Model](#12-database-schema--data-model)
13. [Admin Hierarchy & RBAC](#13-admin-hierarchy--rbac)
14. [AI Models & Agents — Current](#14-ai-models--agents--current)
15. [AI Models & Agents — Future Analytics](#15-ai-models--agents--future-analytics)
16. [Complaint Lifecycle Pipeline](#16-complaint-lifecycle-pipeline)
17. [CivicPartner & Survey System](#17-civicpartner--survey-system)
18. [Blockchain Integration](#18-blockchain-integration)
19. [Real-Time Communication](#19-real-time-communication)
20. [Monitoring & Observability](#20-monitoring--observability)
21. [Infrastructure & Deployment](#21-infrastructure--deployment)
22. [CI/CD Pipeline](#22-cicd-pipeline)
23. [Security Architecture](#23-security-architecture)
24. [Testing Strategy](#24-testing-strategy)
25. [Technology Stack](#25-technology-stack)

---

## 1. Executive Summary

**SwarajDesk** is a production-grade, AI-augmented citizen grievance redressal platform built for the Government of India's Smart India Hackathon (SIH 2025). The platform enables citizens to file, track, and resolve civic complaints across 13 government departments, while providing multi-tier administrative dashboards for agents, municipal admins, state admins, and super admins.

### Core Capabilities

| Capability | Description |
|---|---|
| **AI-Powered Complaint Filing** | Vision AI auto-categorizes photo-based complaints; Voice AI enables spoken complaint filing via STT→Agent→TTS pipeline |
| **Multi-Agent AI System** | 5 specialized AI agents (Sentient, Help, Abuse, Dedup, Quality) built on LangChain/LangGraph with 18 tools |
| **6-Tier Admin Hierarchy** | Agent → Dept. Municipal Admin → Super Municipal Admin → Dept. State Admin → Super State Admin → Super Admin |
| **Automated Assignment** | Redis queue-based complaint processing with intelligent auto-assignment by department and district |
| **Blockchain Audit Trail** | On-chain status tracking, SLA breach recording, and immutable assignment records |
| **Real-Time Updates** | Bun-native WebSocket server for live complaint status notifications |
| **Multi-Cloud Deployment** | GKE Autopilot (Kubernetes) + EC2 (Docker) with Terraform IaC and Ansible automation |
| **Production Monitoring** | 52-probe health monitoring system with email alerting and false-positive suppression |
| **CivicPartner Portal** | NGO/Government body survey system with analytics dashboard |
| **Gamification** | Badge system with 4 categories and 5 rarity tiers to incentivize civic participation |

---

## 2. Live Service Map

| Service | Public URL | Port | Status |
|---|---|---|---|
| **User Frontend** | `https://iit-bbsr-swaraj-user-fe.adityahota.online` | 3000 | ✅ Active |
| **Admin Frontend** | `https://iit-bbsr-swaraj-admin-fe.adityahota.online` | 3000 | ✅ Active |
| **User Backend (HTTP)** | `https://iit-bbsr-swaraj-user-be.adityahota.online` | 3000 | ✅ Active |
| **User Backend (WebSocket)** | `wss://iit-bbsr-swaraj-ws-user-be.adityahota.online` | 3001 | ✅ Active |
| **Admin Backend** | `https://iit-bbsr-swaraj-admin-be.adityahota.online` | 3002 | ✅ Active |
| **Complaint Queue** | `https://iit-bbsr-swaraj-comp-queue.adityahota.online` | 3005 | ✅ Active |
| **Self Service (AI)** | `https://iit-bbsr-swaraj-self.adityahota.online` | 3030 | ✅ Active |
| **AI Agents** | Internal/K8s | 4000 | ✅ Active |
| **ArgoCD Dashboard** | `https://iit-bbsr-swaraj.adityahota.online` | — | ✅ Active |
| **Monitoring Dashboard** | `http://localhost:3001` (self-hosted) | 3001 | ✅ Active |

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                        │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐                  │
│  │  User App    │  │  Admin Dashboard │  │ CivicPartner │                  │
│  │  (Next.js +  │  │  (Next.js)       │  │   Portal     │                  │
│  │  Capacitor)  │  │                  │  │              │                  │
│  └──────┬───────┘  └────────┬─────────┘  └──────┬───────┘                  │
└─────────┼──────────────────┼───────────────────┼───────────────────────────┘
          │                  │                   │
          ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INGRESS LAYER                                       │
│            Traefik (K8s) / Nginx (EC2) + Cloudflare DNS/TLS                │
└─────────┬──────────────────┬───────────────────┬───────────────────────────┘
          │                  │                   │
          ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND SERVICES                                    │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐      │
│  │  user-be    │  │  admin-be   │  │  compQueue   │  │    self     │      │
│  │  HTTP:3000  │  │  HTTP:3002  │  │  HTTP:3005   │  │  HTTP:3030  │      │
│  │  WS:3001    │  │             │  │              │  │             │      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘      │
│         │                │                │                 │              │
│         │                │                │                 │              │
│  ┌──────┴────────────────┴────────────────┴─────────────────┴──────┐       │
│  │                    AI Agents Service (:4000)                     │       │
│  │   SentientAI · HelpAI · AbuseAI · DedupAI · QualityScorer     │       │
│  │                 (LangChain / LangGraph)                         │       │
│  └─────────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
          │                  │                   │
          ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  PostgreSQL  │  │    Redis     │  │  AWS S3      │  │  AWS Secrets │   │
│  │  (NeonDB)    │  │  (Queues +   │  │  (Uploads)   │  │  Manager     │   │
│  │              │  │   Sessions)  │  │              │  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Architecture Principles

- **Microservices**: Each backend (user-be, admin-be, compQueue, self, agents) is an independent Express.js service with its own Docker image
- **Event-Driven Processing**: Complaints flow through Redis queues (registration → processing → assignment → blockchain)
- **AI-First Design**: Every complaint passes through AI moderation, quality scoring, and duplicate detection
- **Multi-Cloud Ready**: Simultaneously deployable on GKE Autopilot (Kubernetes) and bare EC2 instances
- **Zero-Trust Secrets**: All secrets retrieved at runtime from AWS Secrets Manager — never stored in code or environment files

---

## 4. Monorepo & Package Layout

The project uses a **Bun workspace monorepo** with all packages under `packages/`:

```
sih-swarajdesk-2025/
├── packages/
│   ├── user-be/          # User-facing backend API + WebSocket server
│   ├── admin-be/         # Admin dashboard backend API
│   ├── compQueue/        # Complaint processing queue worker
│   ├── self/             # AI vision/chat/image-matching microservice
│   ├── agents/           # LangChain AI multi-agent system
│   ├── user-fe/          # User frontend (Next.js + Capacitor mobile)
│   ├── admin-fe/         # Admin frontend (Next.js)
│   ├── k8s/              # Kubernetes manifests (20 YAML files)
│   ├── monitoring/       # Self-hosted health monitoring system
│   └── mychart/          # Helm chart (Traefik + ArgoCD)
│
├── ansible/              # GKE deployment playbooks
├── aws/                  # AWS-specific deployment playbooks
├── ec2/                  # EC2 Terraform + Ansible automation
├── terraform/            # GKE Autopilot Terraform configs
├── .github/workflows/    # CI/CD pipeline definitions
├── package.json          # Root workspace config
└── tsconfig.json         # Shared TypeScript config
```

Each backend package follows a consistent structure:
```
packages/<service>/
├── index.ts              # Express app factory (Server class)
├── bin.ts                # Bootstrap: secrets retrieval → Prisma → Redis → HTTP + WS
├── routes/               # Express route handlers
├── middleware/            # Auth, rate limiting, secret injection
├── services/             # Business logic layer
├── lib/                  # Utilities (Redis clients, Prisma, helpers)
├── prisma/               # Schema + migrations + generated client
├── test/                 # Unit tests (Jest/Vitest)
├── Dockerfile            # Production container image
└── docker-compose.yaml   # Local development stack
```

---

## 5. User Backend (`user-be`)

**Port**: 3000 (HTTP) + 3001 (WebSocket) | **Runtime**: Bun + Express 5 | **ORM**: Prisma

The user-be service is the primary API serving the citizen-facing application. It handles user authentication, complaint management, real-time updates, chat, surveys, badges, and profile management.

### API Routes

| Route | Auth | Method(s) | Description |
|---|---|---|---|
| `/api/health` | ❌ | GET | Health check with DB connectivity status |
| `/api/users/register` | ❌ | POST | User registration (email, Aadhaar, phone — all unique) |
| `/api/users/login` | ❌ | POST | JWT-based login with token generation |
| `/api/users/logout` | ✅ | POST | Session invalidation |
| `/api/districts` | ❌ | GET | List operating states and districts |
| `/api/categories` | ❌ | GET | List complaint categories and sub-categories |
| `/api/complaints` | ✅ | POST | Submit complaint (pushes to Redis registration queue) |
| `/api/complaints/get/*` | ✅ | GET | Fetch complaints (own, by ID, public feed, trending, heatmap data) |
| `/api/chat` | ✅ | GET/POST | Complaint-linked messaging between users and agents |
| `/api/badges` | ✅ | GET | User badge collection and available badges |
| `/api/users/stats` | ✅ | GET | User statistics (complaints filed, resolved, upvotes) |
| `/api/announcements` | ✅ | GET | Municipal announcements feed |
| `/api/users/profile` | ✅ | PUT | Update user profile details |
| `/api/surveys` | ❌/✅ | GET/POST | Public survey listing + authenticated survey submission |
| `/api/user/profile/:id` | ❌ | GET | Public user profile view |

### Key Features

- **AWS Secrets Manager Bootstrap**: On startup, `bin.ts` calls `retrieveAndInjectSecrets()` to pull all secrets from AWS Secrets Manager and inject them into `process.env` — no `.env` files needed in production
- **Dual Server Architecture**: HTTP server (Express) on port 3000 and a **Bun-native WebSocket server** on port 3001, both initialized in `bin.ts`
- **Redis Queue Integration**: Complaints are not written directly to the database. They are pushed to `complaint:registration:queue` in Redis and picked up by the `compQueue` service asynchronously
- **Middleware Stack**: Helmet (security headers), compression (gzip), CORS (configurable origins), JWT auth middleware
- **Complaint Feed Features**: Public feed, trending complaints, heatmap data for geographic visualization, upvote system (1 per user per complaint, enforced by DB unique constraint)
- **Survey System**: Full survey participation — list published surveys, submit responses with multiple question types (TEXT, MCQ, CHECKBOX, RATING, YES_NO)

---

## 6. Admin Backend (`admin-be`)

**Port**: 3002 | **Runtime**: Bun + Express | **ORM**: Prisma

The admin-be service powers the administrative dashboard with a multi-tier role-based access control system.

### API Routes

| Route | Description |
|---|---|
| `/api/auth` | Admin authentication (login, verify, role-based JWT) |
| `/api/super-admin/*` | Super Admin: manage all state admins, categories, system-wide operations |
| `/api/state-admin/*` | State Admin: manage municipal admins, escalated complaints, regional workflows |
| `/api/municipal-admin/*` | Municipal Admin: manage agents, handle department complaints, announcements |
| `/api/agent/*` | Agent: view assigned complaints, update status, resolve, co-assign |
| `/api/chat/*` | Agent-to-user real-time messaging on complaints |
| `/api/complaints/*` | Cross-role complaint operations (search, filter, bulk operations) |
| `/api/auto-assign/*` | Auto-assignment queue management + blockchain queue endpoints |
| `/api/civic-partner/auth` | CivicPartner (NGO/Gov body) authentication |
| `/api/civic-partner/surveys` | Survey CRUD for CivicPartners |
| `/api/civic-partner/analytics` | CivicPartner analytics dashboard data |
| `/api/surveys` | Public survey listing (consumed by user-fe) |
| `/api/public/announcements` | Public announcement feed |

### Auto-Assignment Engine

The `autoAssign.ts` route implements an intelligent complaint routing system:

1. **Department-Based Routing**: Complaints in field-level departments (Infrastructure, Water, Electricity, Municipal, Environment, Police) are assigned to **Agents**; administrative departments (Education, Revenue, Health, Transportation, Housing, Social Welfare) are assigned to **Municipal Admins**
2. **District Matching**: Assignments are restricted to agents/admins in the same municipality/district as the complaint, using case-insensitive matching
3. **Workload Balancing**: Only agents/admins with `currentWorkload < workloadLimit` are eligible; a random selection among eligible candidates provides load distribution
4. **Blockchain Sync**: Every assignment is pushed to `complaint:blockchain:queue` for immutable on-chain recording
5. **Polling**: Auto-assignment runs on a 15-second polling interval, consuming from the `complaint:processed:queue`

---

## 7. Complaint Queue (`compQueue`)

**Port**: 3005 | **Runtime**: Bun + Express | **ORM**: Prisma

The compQueue service is the central complaint processing pipeline — a dedicated worker that dequeues raw complaints from Redis, enriches them with AI analysis, validates data integrity, and persists them to PostgreSQL.

### Processing Pipeline

```
User Submits Complaint
        │
        ▼
┌─────────────────────────────┐
│  Redis: complaint:          │
│  registration:queue         │  ◄── user-be pushes raw complaint JSON
└────────────┬────────────────┘
             │ LMOVE (atomic)
             ▼
┌─────────────────────────────┐
│  Redis: complaint:          │
│  processing:inprogress      │  ◄── Prevents duplicate processing
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  ENRICHMENT PIPELINE        │
│  1. Zod schema validation   │
│  2. Category FK verification│
│  3. Duplicate detection     │
│  4. AI sub-category         │
│     standardization (GCP)   │
│  5. AI abuse moderation     │
│     (AbuseAI agent)         │
│  6. Quality score injection │
│  7. Similar complaint       │
│     bidirectional linking   │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  PostgreSQL Transaction     │
│  - Create Complaint record  │
│  - Create Location record   │
│  - Link similar complaints  │
│  - Award badges (async)     │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  Redis: complaint:          │
│  processed:queue            │  ◄── admin-be auto-assign consumes this
└─────────────────────────────┘
```

### Key Technical Details

- **Atomic Queue Operations**: Uses Redis `LMOVE` to atomically transfer complaints from registration to processing queue, preventing race conditions
- **Error Recovery**: DB constraint errors (P2002/P2003/P2025) cause permanent removal from queue; transient errors (network, AI service) move the complaint back to the registration queue for retry
- **Polling**: 10-second interval polling cycle
- **Badge System**: After each successful complaint creation, `badgeService.checkBadgesAfterComplaint()` evaluates and awards new badges
- **Moderation Integration**: Calls the Agents service abuse moderation API; stores full moderation metadata including flagged phrases, severity, and bilingual explanations

### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Service health check |
| `/api/processing` | POST | Manual trigger to process next complaint |
| `/api/processing/start` | POST | Start automatic polling |
| `/api/processing/stop` | POST | Stop automatic polling |
| `/api/processing/status` | GET | Queue lengths and polling status |

---

## 8. Self Service (`self`)

**Port**: 3030 | **Runtime**: Bun + Express | **AI**: OpenAI GPT-4o-mini

The self service is a standalone AI microservice providing three core capabilities using OpenAI's vision and language models.

### Routes

#### `POST /api/image` — Vision-Based Complaint Categorization
- Accepts image uploads (multipart) or image URLs (base64/CDN)
- Uses **GPT-4o-mini vision** to analyze the image and produce:
  - `category`: Best-matching category from 13 predefined departments
  - `subCategory`: Specific sub-issue identification
  - `complaint`: First-person natural language complaint text
  - `urgency`: LOW / MEDIUM / HIGH assessment
- Grounding rules prevent hallucination — the AI only describes what is visible in the image
- Response format enforced via `response_format: { type: "json_object" }`

#### `POST /api/chat` — Civic Support Chatbot
- Scoped exclusively to SwarajDesk-related topics (complaints, public services, platform features)
- Strictly declines off-topic questions (politics, entertainment, academics)
- Uses GPT-4o-mini with a domain-specific system prompt

#### `POST /api/match` — Image Comparison for Duplicate Detection
- Accepts two images (file uploads or URLs) and determines if they show the same location/incident
- Returns: `match` (boolean), `confidence` (0-1), `reason` (text)
- Uses GPT-4o-mini vision with temperature=0.0 for deterministic comparison
- Short-circuits if identical content is provided
- Used by the complaint pipeline to detect photo-based duplicates

---

## 9. AI Agents Service (`agents`)

**Port**: 4000 | **Runtime**: Bun + Express | **Framework**: LangChain.js + LangGraph

The agents service is the most sophisticated component — a multi-agent AI system built on LangChain/LangGraph that provides conversational AI, content moderation, duplicate detection, quality scoring, and voice interaction.

### Model Provider Architecture

The service uses a **model-agnostic provider factory** (`lib/models/provider.ts`) that supports three LLM providers:

| Provider | Chat Model | Fast Model | Embeddings |
|---|---|---|---|
| **OpenAI** (default) | `gpt-4o` | `gpt-4o-mini` | `text-embedding-3-small` |
| **Google** | `gemini-1.5-pro` | `gemini-1.5-flash` | `text-embedding-004` |
| **Anthropic** | `claude-sonnet-4-20250514` | `claude-sonnet-4-20250514` | — |

Model selection is controlled via environment variables (`MODEL_PROVIDER`, `MODEL_CHAT`, `MODEL_FAST`), enabling zero-code provider switching in production.

### API Routes

| Route | Auth | Description |
|---|---|---|
| `/api/health` | ❌ | Service health check |
| `/api/chat` | ✅ JWT | Conversational AI (text-based) |
| `/api/voice` | ✅ JWT | Voice AI (STT → Agent → TTS) |
| `/api/dedup` | ✅ JWT | Duplicate complaint detection |
| `/api/moderate` | 🔑 API Key | Content moderation (service-to-service) |
| `/api/quality-score` | ✅ JWT | Complaint quality scoring |

### Guardrails System

Three layers of safety:

1. **Input Sanitizer** (`inputSanitizer.ts`): Blocks prompt injection, off-topic queries, and malicious inputs before they reach the LLM
2. **Output Filter** (`outputFilter.ts`): Strips PII (emails, phone numbers, Aadhaar), admin-internal data, and system markers from AI responses
3. **Rate Limiter** (`rateLimiter.ts`): Per-user rate limiting with configurable windows for chat and voice (voice has stricter limits)

---

## 10. User Frontend (`user-fe`)

**Framework**: Next.js 15 + Capacitor (Android) | **Styling**: Tailwind CSS + shadcn/ui

### Pages & Features

| Page | Features |
|---|---|
| **Landing (`/`)** | Hero section, feature showcase, brand logos, CTA |
| **Registration (`/addUser`)** | Multi-step form with Aadhaar validation, location picker |
| **Login (`/loginUser`)** | Email/phone + password authentication |
| **Dashboard (`/dashboard`)** | Complaint list, filing form, chat, badges, announcements, surveys |
| **Complaint Filing** | Image upload → AI auto-categorization, Google Maps pin selection, voice input, dedup check, quality score preview |
| **About (`/about`)** | Platform mission and team info |
| **Privacy (`/privacy`)** | Privacy policy |
| **Terms (`/terms`)** | Terms of service |

### Notable Frontend Components

- **`google-map-picker.tsx`**: Interactive Google Maps component for precise complaint location selection with geocoding
- **`abuse-flag-banner.tsx`**: Visual banner for complaints flagged by AI abuse moderation
- **`dedup-results-card.tsx`**: Shows similar/duplicate complaints detected by DedupAI before submission
- **`quality-score-badge.tsx`**: Visual quality score indicator (poor/fair/good/excellent) with breakdown
- **`Navbar.tsx`**: Responsive navigation with auth state management
- **`Features.tsx`**: Animated feature showcase on landing page
- **`cta.tsx`**: AI chatbot CTA with conversational interface
- **Capacitor Integration**: Android app wrapper via `capacitor.config.ts` with `CapacitorBackHandler.tsx` for native back navigation

---

## 11. Admin Frontend (`admin-fe`)

**Framework**: Next.js 15 | **Styling**: Tailwind CSS

### Role-Based Dashboards

The admin frontend provides 5 distinct dashboard views, each tailored to its admin tier:

| Dashboard | Path | Features |
|---|---|---|
| **Agent** | `/(pages)/Agent/` | My complaints, status updates, chat with citizens, resolve/escalate, dashboard metrics |
| **Municipal Admin** | `/(pages)/Municipal/` | Department complaints, agent management, announcements, community moderation |
| **State Admin** | `/(pages)/State/` | Escalated complaints, municipal admin management, regional workflows, state-level analytics |
| **Super Admin** | `/(pages)/Super/` | System-wide management, category CRUD, all admin management, global metrics |
| **CivicPartner** | `/(pages)/CivicPartner/` | Survey creation, response analytics, data export |

### Key Features

- **Complaint Heatmap**: Geographic visualization of complaint density using latitude/longitude data
- **Agent Dashboard Revamp**: Redesigned agent UI with dedicated My Complaints, Reports, and Dashboard pages
- **Real-Time Chat**: Agent-to-citizen messaging interface for complaint resolution
- **Stitch Directory**: HTML mock files for design prototyping in `admin-fe/stitch/`

---

## 12. Database Schema & Data Model

**Database**: PostgreSQL (NeonDB) | **ORM**: Prisma with generated client | **Schema**: 656 lines, 25+ models

### Core Entity Relationship

```
User ──────────────────────────────────────┐
  │ has many                                │
  ├── Complaint ◄──── Category              │
  │     │ has one                            │
  │     ├── ComplaintLocation               │
  │     ├── AuditLog[]                      │
  │     ├── Chat[]                          │
  │     ├── Upvote[] (1 per user)           │
  │     │                                    │
  │     │ assigned to                        │
  │     ├── Agent                            │
  │     ├── DepartmentMunicipalAdmin        │
  │     ├── DepartmentStateAdmin (escalated)│
  │     ├── SuperStateAdmin (escalated)     │
  │     └── SuperAdmin (managed)            │
  │                                          │
  ├── UserBadge[] ──── Badge               │
  ├── UserLocation                          │
  └── Upvote[]                              │
                                             │
CivicPartner ─── Survey ─── SurveyQuestion  │
                    └── SurveyResponse       │
                          └── SurveyAnswer   │
```

### Complaint Fields

| Field | Type | Description |
|---|---|---|
| `seq` | Int (auto-increment) | Human-readable complaint number |
| `status` | Enum | REGISTERED → UNDER_PROCESSING → FORWARDED → ON_HOLD → COMPLETED → REJECTED → ESCALATED_* → DELETED |
| `urgency` | Enum | LOW, MEDIUM, HIGH, CRITICAL |
| `AIabusedFlag` | Boolean? | Set by AbuseAI moderation |
| `abuseMetadata` | JSON? | Full moderation details (severity, flagged phrases, explanations in EN/HI) |
| `AIstandardizedSubCategory` | String? | AI-normalized sub-category for analytics |
| `qualityScore` | Int? | 0-100 quality score from QualityScorer |
| `qualityBreakdown` | JSON? | Per-dimension breakdown (clarity, evidence, location, completeness) |
| `isDuplicate` | Boolean? | Duplicate detection result |
| `hasSimilarComplaints` | Boolean? | Whether similar complaints exist |
| `similarComplaintIds` | String[] | Bidirectional links to similar complaints |
| `blockchainHash` | String? | On-chain transaction hash |
| `ipfsHash` | String? | IPFS content hash |
| `isOnChain` | Boolean | Whether complaint is synced to blockchain |
| `blockchainStatus` | Enum | PENDING → CONFIRMED → FAILED |

### Key Enums

- **13 Departments**: Infrastructure, Education, Revenue, Health, Water Supply & Sanitation, Electricity & Power, Transportation, Municipal Services, Police Services, Environment, Housing & Urban Development, Social Welfare, Public Grievances
- **Badge Categories**: FILING, ENGAGEMENT, RESOLUTION, CATEGORY_SPECIALIST
- **Badge Rarities**: COMMON, UNCOMMON, RARE, EPIC, LEGENDARY

---

## 13. Admin Hierarchy & RBAC

SwarajDesk implements a **6-tier administrative hierarchy** reflecting India's governance structure:

```
                    ┌─────────────────┐
                    │   Super Admin   │  System-wide control
                    └────────┬────────┘
                             │ manages
                    ┌────────▼────────┐
                    │ Super State     │  State-level oversight
                    │ Admin           │  Cross-department coordination
                    └───┬─────────┬───┘
                        │         │
           ┌────────────▼──┐  ┌──▼────────────┐
           │ Dept. State   │  │ Super         │
           │ Admin         │  │ Municipal     │  Municipality oversight
           │ (per dept)    │  │ Admin         │
           └───────┬───────┘  └──────┬────────┘
                   │                 │
           ┌───────▼─────────────────▼───┐
           │  Dept. Municipal Admin      │  Department-level management
           │  (per dept + municipality)  │  Agent supervision
           └────────────┬───────────────┘
                        │ manages
                ┌───────▼───────┐
                │    Agent      │  Field-level complaint handling
                │ (per district)│  Direct citizen interaction
                └───────────────┘
```

### Role Capabilities

| Role | Key Permissions |
|---|---|
| **Agent** | View assigned complaints, update status, resolve, chat with citizens, co-assign to other agents |
| **Dept. Municipal Admin** | Manage agents, handle department complaints, create announcements and news, moderate community |
| **Super Municipal Admin** | Oversee department admins, handle cross-department issues, municipality-level metrics |
| **Dept. State Admin** | Manage municipal admins, handle escalated complaints, define regional workflows and SLAs |
| **Super State Admin** | Oversee state admins, cross-department coordination, state-level resolution tracking |
| **Super Admin** | System-wide control: manage categories, all admin tiers, global operations |

---

## 14. AI Models & Agents — Current

SwarajDesk employs **5 specialized AI agents** and **3 AI microservices**, each purpose-built for a specific function in the complaint lifecycle.

### Agent 1: Sentient AI (Primary Conversational Agent)

- **Framework**: LangChain `createReactAgent` (LangGraph ReAct pattern)
- **Model**: `gpt-4o` (chat tier) — configurable via provider factory
- **Role**: Primary user-facing conversational AI that handles all natural language interactions

**18 Bound Tools:**

| Tool | Description |
|---|---|
| `findComplaints` | Search public complaints by keyword, category, district |
| `findMyComplaints` | Retrieve the authenticated user's own complaints |
| `getTrending` | Get trending/high-upvote complaints |
| `getCategories` | List available complaint categories and sub-categories |
| `getUserProfile` | Fetch user profile details |
| `getDistrictInfo` | Get information about districts and municipalities |
| `getAnnouncements` | Retrieve municipal announcements |
| `getDepartmentStats` | Department-level performance statistics |
| `getGuidance` | Provide step-by-step guidance on complaint filing |
| `getComplaintStatus` | Check status of a specific complaint |
| `searchKnowledge` | Search knowledge base for platform-related information |
| `findSimilarComplaints` | Find potentially duplicate or related complaints |
| `sendEscalation` | Escalate a complaint to a higher admin tier |
| `createComplaintDraft` | Generate a pre-filled complaint draft for user review |
| `analyzeImage` | Analyze uploaded images via the self service |
| `navigateTo` | Navigate the user to a specific page in the frontend |
| `upvoteComplaint` | Upvote a complaint on behalf of the user |
| `detectLocation` | Trigger browser geolocation for complaint location |

**Architecture**: Per-request agent instances with `bindUserId()` — each tool automatically has the authenticated user's ID injected, removing it from the LLM's visible schema to prevent manipulation.

**Structured Actions**: The agent emits structured JSON actions (`COMPLAINT_DRAFT_READY`, `NAVIGATE`, `DETECT_LOCATION`) that the frontend interprets to trigger UI flows.

### Agent 2: Help AI (Escalation Support Agent)

- **Framework**: LangChain `createReactAgent`
- **Model**: `gpt-4o` (chat tier)
- **Role**: Specialized agent activated when Sentient AI detects a user needs deeper help
- **Trigger**: Sentient AI emits `[ESCALATE_TO_HELP_AI]` marker
- **Tools**: `searchKnowledge`, `sendEscalation`, `findMyComplaints`, `getComplaintStatus`, `getUserProfile`
- **Capability**: Focused on resolving complex issues, finding user-specific information, and performing escalations to human administrators

### Agent 3: Abuse AI (Content Moderation Agent)

- **Framework**: LangChain `.withStructuredOutput()` (no tools, structured output only)
- **Model**: `gpt-4o-mini` (fast tier) — optimized for low-latency moderation
- **Role**: Detects and masks abusive content in complaint descriptions
- **Languages**: English, Hindi, and Hinglish (code-mixed Hindi-English)
- **Output Schema**:
  - `has_abuse`: boolean
  - `clean_text`: text with abusive words replaced by `******`
  - `severity`: none / low / medium / high
  - `flagged_phrases[]`: each with original text, masked version, language, category (abuse/threat/obscenity/hate_speech/personal_attack), and severity
  - `explanation_en` / `explanation_hi`: bilingual explanations
- **Integration**: Called by compQueue during complaint processing; results stored as `abuseMetadata` JSON in the Complaint record
- **Fail-Safe**: On error, returns safe default (no abuse detected) to avoid blocking legitimate complaints

### Agent 4: Dedup AI (Duplicate Detection Agent)

- **Framework**: LangChain `createReactAgent`
- **Model**: `gpt-4o-mini` (fast tier)
- **Role**: Analyzes draft complaints before submission to detect potential duplicates
- **Tool**: `findSimilarComplaints` — searches existing complaints by description similarity, category, and district
- **Output**: `hasSimilar`, `isDuplicate`, `matches[]` (with similarity scores), `suggestion`, `confidence`
- **Frontend Integration**: Results shown in `dedup-results-card.tsx` before user submits — can upvote existing similar complaints instead of filing duplicates

### Agent 5: Quality Scorer

- **Framework**: LangChain `.withStructuredOutput()`
- **Model**: `gpt-4o-mini` (fast tier)
- **Role**: Evaluates complaint quality across 4 dimensions (each 0-25, total 0-100)
- **Dimensions**:
  1. **Clarity (0-25)**: Description specificity, detail level, timeline inclusion
  2. **Evidence (0-25)**: Photo/document attachment quality
  3. **Location (0-25)**: Precision — exact GPS > PIN code > district only
  4. **Completeness (0-25)**: Category, sub-category, urgency, description length
- **Rating Scale**: poor (0-25) → fair (26-50) → good (51-75) → excellent (76-100)
- **Bilingual Suggestions**: Improvement tips in the same language as the description (Hindi or English)
- **Fallback**: Heuristic scoring algorithm if AI call fails

### AI Microservices (Self Service)

| Service | Model | Function |
|---|---|---|
| **Vision AI** | GPT-4o-mini (vision) | Image → complaint categorization + description generation |
| **Civic Chatbot** | GPT-4o-mini | Domain-restricted conversational support |
| **Image Matcher** | GPT-4o-mini (vision) | Two-image comparison for duplicate photo detection |

### Voice AI Pipeline

The agents service provides a full **speech-to-speech** conversational pipeline:

```
User speaks → Base64 audio → STT (OpenAI Whisper) → Transcribed text
                                                          │
                                    ┌─────────────────────▼──────────────────────┐
                                    │  Agent Router (Sentient AI → Help AI)      │
                                    │  + Input sanitization + Output filtering   │
                                    └─────────────────────┬──────────────────────┘
                                                          │
AI responds ← Base64 audio ← TTS (OpenAI) ← Response text
                               │
                               ├── Voice: "nova" for Sentient AI
                               └── Voice: "alloy" for Help AI (distinct tone)
```

- **Rate Limiting**: Voice requests have stricter per-minute and hourly rate limits
- **Audio Size Cap**: 5MB max (~60 seconds of audio)
- **Non-Fatal TTS**: If text-to-speech fails, the text response is still returned

### Agent Router Architecture

The `router.ts` agent router orchestrates the multi-agent system:

1. **Image Pre-Processing**: If a base64 image is attached, it's first analyzed by the self service and the results are appended to the message context
2. **Input Sanitization**: The `inputSanitizer` checks for prompt injection, off-topic content, and malicious inputs
3. **Session Memory**: `sessionMemory` maintains conversation history per user per session
4. **Sentient AI Invocation**: Primary agent processes the enriched message with full conversation context
5. **Output Filtering**: PII redaction and admin data stripping via `outputFilter`
6. **Escalation Routing**: If Sentient AI emits `[ESCALATE_TO_HELP_AI]`, the message is re-routed to Help AI with the original context as escalation context
7. **Action Detection**: Structured actions (complaint drafts, navigation, location detection) are extracted and passed to the frontend

---

## 15. AI Models & Agents — Future Analytics

The following AI agents and models are planned for future releases to generate analytics, metrics reports, and actionable insights from collected complaints, survey data, and civic engagement data.

### Planned Analytics Agents

#### 1. Trend Analysis Agent
- **Purpose**: Identify emerging complaint patterns across time, geography, and departments
- **Input**: Historical complaint data, submission dates, locations, categories
- **Output**: Trend reports showing spikes in specific complaint types, seasonal patterns, geographic hotspots
- **Use Case**: Proactive resource allocation — e.g., detect that water complaints spike in summer in specific districts

#### 2. Department Performance Agent
- **Purpose**: Generate detailed performance scorecards for each department and admin tier
- **Metrics**: Average resolution time, SLA compliance rate, escalation frequency, citizen satisfaction (from survey responses), agent workload distribution
- **Output**: Weekly/monthly performance reports with rankings and improvement recommendations
- **Integration**: Will consume data from the `Complaint` table (resolution dates, status history) and `Survey` responses

#### 3. Sentiment Analysis Agent
- **Purpose**: Analyze citizen sentiment from complaint descriptions, chat messages, and survey responses
- **Models**: Fine-tuned BERT/RoBERTa for Hindi-English sentiment classification
- **Output**: Sentiment scores per department, district, and time period; identify areas of citizen frustration
- **Languages**: Hindi, English, Hinglish — mirroring the existing AbuseAI's multilingual capabilities

#### 4. Predictive Prioritization Agent
- **Purpose**: Predict which complaints are most likely to escalate or breach SLA
- **Input**: Complaint features (category, urgency, district, description length, quality score, similar complaint count)
- **Model**: Gradient boosted decision trees or neural networks trained on historical resolution data
- **Output**: Priority score and risk level for each incoming complaint
- **Integration**: Will feed into the auto-assignment engine to prioritize high-risk complaints

#### 5. Survey Insights Agent
- **Purpose**: Generate actionable reports from CivicPartner survey data
- **Capabilities**: Cross-tabulation of survey responses, correlation with complaint data, demographic analysis
- **Output**: Automated research reports for NGOs and government bodies
- **Integration**: Will consume `SurveyResponse` and `SurveyAnswer` data from the CivicPartner system

#### 6. Fraud & Anomaly Detection Agent
- **Purpose**: Detect suspicious patterns — mass duplicate filings, coordinated fake complaints, unusually high resolution rates
- **Techniques**: Statistical anomaly detection, clustering analysis, network analysis of complaint relationships
- **Output**: Fraud alerts and anomaly reports for Super Admins
- **Integration**: Will use `similarComplaintIds`, `isDuplicate`, `AIabusedFlag`, and `upvoteCount` data

#### 7. Geographic Intelligence Agent
- **Purpose**: Correlate complaint data with geographic features to identify infrastructure patterns
- **Input**: `ComplaintLocation` (lat/lng, district, locality) + external geographic data
- **Output**: Infrastructure health maps, underserved area identification, resource distribution recommendations
- **Visualization**: Will power enhanced heatmaps beyond the current complaint density view

### Analytics Platform Architecture (Planned)

```
┌──────────────────────────────────────────────────────┐
│                    Data Sources                       │
│  Complaints · Surveys · Chat · Upvotes · Badges      │
└─────────────────────┬────────────────────────────────┘
                      │ ETL Pipeline
                      ▼
┌──────────────────────────────────────────────────────┐
│              Analytics Data Warehouse                 │
│         (PostgreSQL materialized views /              │
│          dedicated analytics DB)                      │
└─────────────────────┬────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│ Trend Agent  │ │ Perf.    │ │ Sentiment    │
│              │ │ Agent    │ │ Agent        │
└──────┬───────┘ └────┬─────┘ └──────┬───────┘
       │              │              │
       └──────────────┼──────────────┘
                      ▼
┌──────────────────────────────────────────────────────┐
│              Automated Reports API                    │
│  Weekly digests · PDF exports · Dashboard widgets    │
└──────────────────────────────────────────────────────┘
```

---

## 16. Complaint Lifecycle Pipeline

The complete lifecycle of a complaint through the system:

```
1. CITIZEN FILES COMPLAINT
   └── user-fe: Form/Voice/Photo input
       ├── Image? → Self Service Vision AI → auto-fill category + description
       ├── Voice? → Agents Voice AI → STT → Agent → complaint draft
       ├── DedupAI check → show similar complaints, suggest upvoting instead
       ├── QualityScorer → show quality score and improvement suggestions
       └── Push to Redis `complaint:registration:queue`

2. COMPLAINT PROCESSING (compQueue)
   ├── Zod validation
   ├── Category FK verification
   ├── AI sub-category standardization (GCP)
   ├── AbuseAI moderation → clean_text + metadata
   ├── Quality score + dedup data injection
   ├── PostgreSQL transaction (create Complaint + Location records)
   ├── Bidirectional similar complaint linking
   ├── Badge evaluation and awarding
   └── Push to Redis `complaint:processed:queue`

3. AUTO-ASSIGNMENT (admin-be)
   ├── Pop from processed queue
   ├── District-based agent/admin matching
   ├── Workload-balanced random selection
   ├── DB transaction (assign + increment workload)
   ├── Status: REGISTERED → UNDER_PROCESSING
   └── Push to Redis `complaint:blockchain:queue`

4. AGENT/ADMIN HANDLING
   ├── Agent views assigned complaint in admin-fe
   ├── Agent-citizen chat (real-time via WebSocket)
   ├── Status updates: UNDER_PROCESSING → FORWARDED/ON_HOLD/COMPLETED
   ├── Escalation to higher admin tiers if needed
   └── Co-assignment to additional agents for complex issues

5. RESOLUTION & FEEDBACK
   ├── Complaint marked COMPLETED with resolution details
   ├── Citizen notification via WebSocket
   ├── Resolution metrics updated (agent resolution rate, avg time)
   └── Blockchain confirmation of final status
```

---

## 17. CivicPartner & Survey System

### Overview

The CivicPartner system enables **NGOs and government bodies** to register as partners, create surveys, collect citizen responses, and access analytics dashboards.

### Data Model

- **CivicPartner**: Organization profile with `orgType` (NGO / GOVERNMENT_BODY), registration number, verification status
- **Survey**: Title, description, category, source type (NGO/SURVEY), status (DRAFT → PUBLISHED → CLOSED → ARCHIVED), date range
- **SurveyQuestion**: 5 question types (TEXT, MCQ, CHECKBOX, RATING, YES_NO), ordered, with options array
- **SurveyResponse**: Per-citizen response with submission timestamp
- **SurveyAnswer**: Individual answers with text, selected options, or rating values

### Features

| Feature | Description |
|---|---|
| **Partner Authentication** | Separate auth flow with org-level credentials |
| **Survey Builder** | Multi-question surveys with drag-and-drop ordering |
| **Public Survey Listing** | Published surveys visible to citizen app users |
| **Survey Submission** | Citizens can complete surveys from `user-fe` |
| **Analytics Dashboard** | Response aggregation, question-level breakdown, export |
| **Survey Lifecycle** | DRAFT → PUBLISHED → CLOSED → ARCHIVED |

---

## 18. Blockchain Integration

SwarajDesk is designed with **blockchain readiness** — database schema and queue infrastructure are in place for on-chain recording of complaint lifecycle events.

### Current Implementation

- **Database Fields**: `blockchainHash` (VARCHAR 66), `blockchainBlock` (BigInt), `ipfsHash`, `isOnChain` (Boolean), `blockchainStatus` (PENDING/CONFIRMED/FAILED)
- **`BlockchainSyncEvent` Model**: Tracks all synced events with entity type, entity ID, payload, and processing status
- **Redis Queue**: `complaint:blockchain:queue` receives data after every auto-assignment for async on-chain recording
- **Blockchain Queue API**: `admin-be` exposes endpoints to check queue status and pop events for the blockchain worker

### Planned Blockchain Features (Tier 1)

| Feature | Description |
|---|---|
| **On-Chain Status Audit Trail** | Every status change recorded as a blockchain transaction |
| **SLA Breach Recording** | Smart contract emits `SLA_BREACHED` events for public accountability |
| **Escalation Trail** | Immutable record of every escalation with reason, from-admin, to-admin |
| **Agent Performance on Chain** | Resolution events per agent for public performance scoring |

### Technology Plan

- **Development**: Sepolia testnet
- **Production**: Layer 2 (Polygon/Arbitrum) for gas cost optimization
- **Storage**: IPFS for complaint payloads; CID stored on-chain, TX hash stored in DB
- **Cost Optimization**: Batch weekly Merkle commitments to cut gas costs by ~99%

---

## 19. Real-Time Communication

### WebSocket Server

- **Runtime**: Bun-native WebSocket server (not Socket.IO — zero dependencies)
- **Port**: 3001 (separate from HTTP on 3000)
- **Purpose**: Live complaint status notifications, chat message delivery, announcement push

### Chat System

- **Model**: `Chat` model with `senderType` (USER/AGENT), linked to both `Complaint` and `User`/`Agent`
- **Image Support**: `imageUrl` field for sharing photos within chat
- **Indexing**: Database indexes on `userId`, `agentId`, and `complaintId` for fast query performance

---

## 20. Monitoring & Observability

### Self-Hosted Monitoring System (`packages/monitoring`)

A purpose-built, real-time health monitoring system with a web dashboard, per-cycle log files, smart alerting, and false-positive suppression.

### Architecture

| Component | Function |
|---|---|
| `scheduler.ts` | Orchestrates check cycles every 15 minutes |
| `httpChecker.ts` | HTTP/HTTPS checks with 2-retry + slow response grading |
| `featureProber.ts` | 52 deep API probes (auth, complaints, feeds, auto-assign, blockchain) |
| `dnsChecker.ts` | Cloudflare API-based DNS record consistency checks |
| `ec2Checker.ts` | EC2 SSH reachability verification |
| `ec2LogChecker.ts` | Remote `journalctl` log collection over SSH |
| `runLogger.ts` | Per-cycle JSON log files with automatic rotation |
| `alerter.ts` | State machine for email alert decisions |
| `dashboard.ts` | Express API + static dashboard UI |

### Check Groups (78 Total Checks)

| Group | What's Monitored |
|---|---|
| `backend-health` | `/health` endpoint of user-be, admin-be, comp-queue |
| `feature-api` | 52 deep API probes (auth, complaints, feeds, auto-assign) |
| `database` | NeonDB connectivity via raw SQL ping |
| `redis` | Redis `PING` command |
| `s3` | AWS S3 `listObjectsV2` on the configured bucket |
| `ec2` | SSH reachability + public IP check |
| `dns-tls` | DNS record consistency + TLS certificate validity |

### False-Positive Suppression (3 Layers)

1. **Immediate Retries**: Every HTTP check retries up to 2 times with 1.5s delay
2. **Status Dampening**: State machine requires 2 consecutive failures before marking DOWN and sending email (single transient failures show as WARNING only)
3. **Response Time Grading**: Slow-but-alive endpoints graded as `UP ⚠️ Slow (Xms)` — never trigger alerts

### Tiered Timeouts

| Tier | Timeout | Applied To |
|---|---|---|
| `T_FAST` | 15s | Auth verify, profile, lightweight GETs |
| `T_NORMAL` | 30s | Admin lists, queue status, chat |
| `T_HEAVY` | 35s | Feed queries, complaint lists, heatmaps |
| `T_POST` | 30s | Login, submit, update, escalate |
| `T_BLOCKCHAIN` | 45s | Auto-assign, blockchain queue ops |

### Alerting

- All alerts **batched into a single email** per cycle (never individual emails)
- Email includes summary table of all state changes (UP → DOWN, DOWN → UP) with response times
- Recoveries send a single "resolved" notification only if the check was confirmed DOWN

---

## 21. Infrastructure & Deployment

SwarajDesk is deployed and tested on **multiple clouds and VPS providers** using Infrastructure as Code (IaC) with Terraform and Configuration Management with Ansible.

### Deployment Target 1: Google Kubernetes Engine (GKE Autopilot)

**Stack**: Terraform → GKE Autopilot → Helm → Traefik → ArgoCD → K8s Manifests

#### Terraform Configuration (`terraform/terra.tf`)
- Provisions a GKE Autopilot cluster in `us-central1`
- Cluster name: `autopilot-cluster-1`

#### Full Deployment Pipeline (`ansible/full-deploy.yml`)

The Ansible playbook orchestrates a **7-step deployment**:

| Step | Action |
|---|---|
| 1 | Terraform init + apply (GKE Autopilot provisioning) |
| 2 | Get GKE credentials via `gcloud` |
| 3 | Add Helm repositories (Traefik, ArgoCD, External Secrets) |
| 4 | Install platform Helm chart (Traefik ingress + ArgoCD) |
| 5 | Install External Secrets operator + create AWS SM credentials |
| 6 | Apply 20 K8s manifests (deployments, secrets, ingresses, middlewares) |
| 7 | Final status: pods, services, ingresses, ArgoCD password |

#### Kubernetes Manifests (`packages/k8s/`)

20 YAML files covering:

| Manifest Type | Files |
|---|---|
| **Deployments** | user-be, admin-be, comp-queue, self, agents (5) |
| **Secrets** (ExternalSecrets) | user-be, admin-be, comp-queue, self, agents, aws-secrets (6) |
| **Ingresses** | user-be (HTTP + WS), admin-be, comp-queue, self, agents, ArgoCD (6) |
| **Middlewares** | CORS middleware, WebSocket middleware (2) |
| **Cluster Config** | AWS ClusterSecretStore (1) |

#### Helm Chart (`packages/mychart/`)
- **Traefik**: Ingress controller with Let's Encrypt TLS
- **ArgoCD**: GitOps continuous deployment
- Dependencies managed via `Chart.yaml` + `Chart.lock`

### Deployment Target 2: AWS EC2 (Single Instance)

**Stack**: Terraform → EC2 → Ansible → Docker → Nginx → Cloudflare DNS

#### Terraform Configuration (`ec2/main.tf`)

| Resource | Configuration |
|---|---|
| **Instance Type** | `m7i-flex.large` |
| **AMI** | Ubuntu 22.04 LTS |
| **Region** | `ap-south-1` (Mumbai) |
| **Storage** | 30GB gp3 EBS |
| **Security Group** | Ports: 22 (SSH), 80 (HTTP), 3000-3005 (backends), 3030 (self) |
| **Key Pair** | `ec2-iit-pair` (managed by Terraform) |

#### One-Shot Deployment — `autoAnsible.sh`

A bash script that automates the full pipeline with colour-coded output:

```bash
./autoAnsible.sh                    # Full deploy (terraform + ansible)
./autoAnsible.sh --skip-terraform   # Re-deploy ansible only
./autoAnsible.sh --dry-run          # Preview steps
```

**7-Step Pipeline:**
1. `terraform validate`
2. `terraform apply -auto-approve`
3. Extract IP from `terraform output`
4. Update `ansible/inventory.ini` with new IP
5. Poll SSH until instance is reachable (~5 min max)
6. Run `ansible-playbook playbook.yml` (system setup)
7. Run `ansible-playbook containers.yml` (Docker deployment)

#### One-Shot Deployment — `autoAnsi/deploy.yml`

A single Ansible playbook with 4 plays:

| Play | Runs On | Actions |
|---|---|---|
| Play 1 | localhost | Terraform validate → apply → extract IP → update inventory → SSH wait |
| Play 2 | EC2 instance | Install Docker, Nginx, pull images, configure reverse proxy |
| Play 3 | EC2 instance | Configure AWS creds, generate env files, deploy all 4 containers |
| Play 4 | localhost | Print deployment summary with IP, SSH command, and service URLs |

#### Docker Containers

| Container | Image | Port |
|---|---|---|
| `user-be` | `ogadityahota/swarajdesk-user-be:latest` | 3000, 3001 |
| `admin-be` | `ogadityahota/sih-swarajdesk-admin-be:latest` | 3002 |
| `comp-queue` | `ogadityahota/swarajdesk-comp-queue:latest` | 3005 |
| `self` | `ogadityahota/swarajdesk-self:latest` | 3030 |

### Deployment Target 3: AWS Infrastructure (Alternative)

**Directory**: `aws/` — Contains AWS-specific Ansible playbooks mirroring the GKE playbooks:

| Playbook | Purpose |
|---|---|
| `aws-full-deploy.yml` | Complete AWS infrastructure deployment |
| `aws-k8s-platform-setup.yml` | K8s platform on AWS EKS |
| `aws-pre-push.yml` | Pre-push validation and image building |
| `aws-prisma.yml` | Database migration on AWS |
| `aws-run-all.yml` | Start all services on AWS |
| `aws-stop-all.yml` | Stop all services on AWS |
| `aws-app-deploy.yml` | Application-only deployment |

### Additional Ansible Playbooks

| Playbook | Directory | Purpose |
|---|---|---|
| `run-all.yml` | `ansible/` | Start all services on GKE |
| `stop-all.yml` | `ansible/` | Stop all services on GKE |
| `pre-push.yml` | `ansible/` | Pre-push Docker image validation |
| `prisma.yml` | `ansible/` | Database migration playbook |
| `k8s-platform-setup.yml` | `ansible/` | K8s platform initialization |

### DNS Management

- **Provider**: Cloudflare
- **Features**: Proxied DNS records, automatic SSL/TLS, DDoS protection
- **Automation**: DNS records can be updated via `ansible-playbook deploy.yml -e dns_only=true`
- **Domains**: All services under `*.adityahota.online` subdomain

### Nginx Reverse Proxy (EC2)

On EC2 deployments, Nginx serves as the reverse proxy:
- Routes requests to appropriate containers based on subdomain
- Handles SSL termination (via Cloudflare origin certificates)
- WebSocket upgrade support for the WS endpoint

---

## 22. CI/CD Pipeline

### GitHub Actions (`ci.yaml`)

**Trigger**: Push to `main` branch or any pull request

#### Pipeline Stages

```
Checkout → Setup Node 20 + Bun → Test → Build → Push → (ArgoCD Sync)
```

#### Test Stage (4 packages)

| Package | Steps |
|---|---|
| `user-be` | `bun install` → `prisma generate` → `bun run test:unit` |
| `admin-be` | `bun install` → `prisma generate` → `bun run test:unit` |
| `compQueue` | `bun install` → `prisma generate` → `bun run test:unit` |
| `self` | `bun install` → `bun run test:unit` |

#### Build & Push Stage (main branch only)

4 Docker images built and pushed to Docker Hub with dual tags:

| Image | Tags |
|---|---|
| `ogadityahota/swarajdesk-user-be` | `latest`, `<commit-sha>` |
| `ogadityahota/sih-swarajdesk-admin-be` | `latest`, `<commit-sha>` |
| `ogadityahota/swarajdesk-comp-queue` | `latest`, `<commit-sha>` |
| `ogadityahota/swarajdesk-self` | `latest`, `<commit-sha>` |

- **Build Engine**: Docker Buildx with inline caching
- **Auth**: Docker Hub credentials via GitHub Secrets (`DOCKERHUB_USERNAME`, `DOCKERHUB_PASSWORD`)
- **No-Cache Build**: Each push builds fresh images to ensure latest code

#### GitOps Flow (ArgoCD)

The CI pipeline was designed to auto-open a PR from `main` → `deploy` branch, which ArgoCD watches for changes. On merge, ArgoCD syncs the new images to the Kubernetes cluster.

---

## 23. Security Architecture

### Authentication

| Layer | Mechanism |
|---|---|
| **User Auth** | JWT-based tokens with configurable expiry |
| **Admin Auth** | Role-based JWT with access level embedded in token |
| **CivicPartner Auth** | Separate auth flow with organization-level credentials |
| **Service-to-Service** | API key authentication (e.g., abuse moderation from compQueue → agents) |
| **Agent AI Auth** | User JWT forwarded to agents service; tools auto-bound with userId |

### Secrets Management

- **AWS Secrets Manager**: All production secrets stored in AWS SM with per-service secret bundles:
  - `sih-swaraj-user-be-prod`
  - `sih-swaraj-admin-be-prod`
  - `sih-swaraj-comp-queue-prod`
  - `sih-swaraj-self-prod`
- **K8s External Secrets**: On GKE, the External Secrets Operator syncs AWS SM secrets into K8s Secret resources
- **Bootstrap Pattern**: Services start with only `SECRETS_AWS_ACCESS_KEY_ID`, `SECRETS_AWS_SECRET_ACCESS_KEY`, and `SECRET_NAME_AWS_USER_BE` — all other secrets (DB URL, Redis URL, API keys) are fetched at runtime

### Security Middleware

| Middleware | Service | Function |
|---|---|---|
| **Helmet** | user-be, agents | HTTP security headers (CSP, HSTS, X-Frame-Options) |
| **CORS** | All backends | Configurable origin whitelist with credential support |
| **Compression** | user-be | Gzip response compression |
| **Rate Limiting** | agents | Per-user rate limiting for chat and voice |
| **Input Sanitization** | agents | Prompt injection and off-topic detection |
| **Output Filtering** | agents | PII redaction, admin data stripping |

### Data Protection

- **Aadhaar Handling**: Stored as string (hashing recommended for production)
- **Password Hashing**: bcrypt-based hashing
- **PII Redaction**: AI output filter strips emails, phone numbers, and internal IDs
- **Consent**: `consentDataCollection` flag on User model
- **Data Deletion**: Cascade deletes on related records when user is removed

---

## 24. Testing Strategy

### Unit Testing

| Package | Framework | Config | Focus |
|---|---|---|---|
| `user-be` | Jest | `jest.config.js` | Route handlers, middleware, input validation |
| `admin-be` | Jest | — | Admin routes, auth, auto-assign logic |
| `compQueue` | Jest | — | Complaint processing pipeline, queue operations |
| `self` | Jest | — | AI route handlers, OpenAI integration |
| `agents` | Vitest | `vitest.config.ts` | Agent invocations, tool binding, guardrails |

### Test Commands

```bash
# Run all tests (from root)
bun run test

# Individual package tests
bun run test:admin-be
bun run test:compQueue
bun run test:user-be

# Coverage reports
bun run test:coverage
bun run test:coverage:admin-be
bun run test:coverage:compQueue
bun run test:coverage:user-be
```

### CI Integration

- All unit tests run on every push and PR via GitHub Actions
- Tests must pass before Docker images are built
- Prisma client is generated in CI with a dummy `DATABASE_URL` to enable type-safe test compilation

### Production Monitoring as Testing

The monitoring system (`packages/monitoring`) effectively serves as a **continuous integration test suite for production**:
- 52 deep API probes test real endpoints every 15 minutes
- Database, Redis, S3, EC2, DNS/TLS connectivity verified each cycle
- JSON log files preserve test results with response times for historical analysis

---

## 25. Technology Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Bun** | 1.3.x | JavaScript runtime (replaces Node.js) |
| **Express** | 5.x | HTTP server framework |
| **Prisma** | Latest | Database ORM with type-safe client generation |
| **PostgreSQL** | 15.x | Primary database (NeonDB serverless) |
| **Redis** | 7.x | Message queues, session storage, rate limiting |
| **TypeScript** | 5.x | Type-safe development across all packages |
| **Zod** | Latest | Runtime schema validation |

### AI & ML

| Technology | Purpose |
|---|---|
| **LangChain.js** | Agent framework, tool binding, structured output |
| **LangGraph** | ReAct agent pattern for conversational AI |
| **OpenAI GPT-4o** | Primary chat model for Sentient AI and Help AI |
| **OpenAI GPT-4o-mini** | Fast model for moderation, dedup, quality scoring, vision |
| **OpenAI Whisper** | Speech-to-text for voice AI |
| **OpenAI TTS** | Text-to-speech for voice responses |
| **Google Gemini** | Alternative model provider (via provider factory) |

### Frontend

| Technology | Purpose |
|---|---|
| **Next.js** | 15.x | React framework with App Router |
| **Tailwind CSS** | Utility-first CSS framework |
| **shadcn/ui** | Component library |
| **Capacitor** | Native Android app wrapper |
| **Google Maps API** | Location picker for complaint filing |

### Infrastructure

| Technology | Purpose |
|---|---|
| **Terraform** | Infrastructure as Code for GKE and EC2 |
| **Ansible** | Configuration management and deployment automation |
| **Docker** | Container images for all backend services |
| **Kubernetes** | Container orchestration (GKE Autopilot) |
| **Helm** | K8s package management (Traefik, ArgoCD) |
| **ArgoCD** | GitOps continuous deployment |
| **Traefik** | Kubernetes ingress controller |
| **Nginx** | Reverse proxy for EC2 deployments |
| **Cloudflare** | DNS, SSL/TLS, DDoS protection |
| **AWS Secrets Manager** | Production secrets management |
| **AWS S3** | File/image upload storage |
| **External Secrets Operator** | K8s-to-AWS secrets sync |
| **GitHub Actions** | CI/CD pipeline |
| **Docker Hub** | Container image registry |

### Monitoring

| Technology | Purpose |
|---|---|
| **Custom Node.js System** | 78-check monitoring with web dashboard |
| **SMTP (Gmail)** | Email alerting for downtime |
| **Cloudflare API** | DNS record verification |
| **SSH (Node.js)** | EC2 instance health and log collection |

---

<div align="center">

**SwarajDesk** — Built for India's citizens, powered by AI, secured by blockchain.

*© 2025 SwarajDesk Team — IIT Bhubaneswar*

</div>


---

## 5. User Backend (`user-be`)

**Port**: 3000 (HTTP) + 3001 (WebSocket) | **Runtime**: Bun + Express 5 | **ORM**: Prisma

The user-be service is the primary API serving the citizen-facing application.

### API Routes

| Route | Auth | Description |
|---|---|---|
| `/api/health` | No | Health check with DB connectivity status |
| `/api/users/register` | No | User registration (email, Aadhaar, phone) |
| `/api/users/login` | No | JWT-based login |
| `/api/users/logout` | Yes | Session invalidation |
| `/api/districts` | No | List operating states and districts |
| `/api/categories` | No | List complaint categories and sub-categories |
| `/api/complaints` | Yes | Submit complaint (pushes to Redis queue) |
| `/api/complaints/get/*` | Yes | Fetch complaints (own, by ID, public feed, trending, heatmap) |
| `/api/chat` | Yes | Complaint-linked messaging |
| `/api/badges` | Yes | User badge collection |
| `/api/users/stats` | Yes | User statistics |
| `/api/announcements` | Yes | Municipal announcements feed |
| `/api/users/profile` | Yes | Update user profile |
| `/api/surveys` | Mixed | Public survey listing + authenticated submission |
| `/api/user/profile/:id` | No | Public user profile view |

### Key Features

- **AWS Secrets Manager Bootstrap**: On startup, `bin.ts` calls `retrieveAndInjectSecrets()` to pull all secrets from AWS Secrets Manager and inject them into `process.env`
- **Dual Server Architecture**: HTTP server (Express) on port 3000 and a **Bun-native WebSocket server** on port 3001
- **Redis Queue Integration**: Complaints pushed to `complaint:registration:queue` in Redis, processed asynchronously by compQueue
- **Middleware Stack**: Helmet (security headers), compression (gzip), CORS (configurable origins), JWT auth
- **Complaint Feed**: Public feed, trending complaints, heatmap data, upvote system (1 per user per complaint)
- **Survey System**: Full survey participation — list surveys, submit responses with 5 question types (TEXT, MCQ, CHECKBOX, RATING, YES_NO)

---

## 6. Admin Backend (`admin-be`)

**Port**: 3002 | **Runtime**: Bun + Express | **ORM**: Prisma

### API Routes

| Route | Description |
|---|---|
| `/api/auth` | Admin authentication (login, verify, role-based JWT) |
| `/api/super-admin/*` | Super Admin: manage state admins, categories, system-wide ops |
| `/api/state-admin/*` | State Admin: manage municipal admins, escalated complaints, regional workflows |
| `/api/municipal-admin/*` | Municipal Admin: manage agents, department complaints, announcements |
| `/api/agent/*` | Agent: assigned complaints, status updates, resolve, co-assign |
| `/api/chat/*` | Agent-to-user real-time messaging |
| `/api/complaints/*` | Cross-role complaint operations |
| `/api/auto-assign/*` | Auto-assignment queue management + blockchain queue |
| `/api/civic-partner/auth` | CivicPartner authentication |
| `/api/civic-partner/surveys` | Survey CRUD for CivicPartners |
| `/api/civic-partner/analytics` | CivicPartner analytics dashboard |
| `/api/surveys` | Public survey listing |
| `/api/public/announcements` | Public announcement feed |

### Auto-Assignment Engine

1. **Department-Based Routing**: Field departments (Infrastructure, Water, Electricity, Municipal, Environment, Police) → **Agents**; Administrative departments (Education, Revenue, Health, etc.) → **Municipal Admins**
2. **District Matching**: Case-insensitive municipality/district matching
3. **Workload Balancing**: Only staff with `currentWorkload < workloadLimit` are eligible; random selection among candidates
4. **Blockchain Sync**: Every assignment pushed to `complaint:blockchain:queue`
5. **Polling**: 15-second interval consuming from `complaint:processed:queue`

---

## 7. Complaint Queue (`compQueue`)

**Port**: 3005 | **Runtime**: Bun + Express | **ORM**: Prisma

The compQueue is the central complaint processing pipeline.

### Processing Pipeline

```
User Submits → Redis registration:queue
    │ LMOVE (atomic)
    ▼
Redis processing:inprogress
    │
    ▼
ENRICHMENT:
  1. Zod schema validation
  2. Category FK verification
  3. Duplicate detection
  4. AI sub-category standardization (GCP)
  5. AI abuse moderation (AbuseAI)
  6. Quality score injection
  7. Similar complaint linking
    │
    ▼
PostgreSQL Transaction → Create Complaint + Location + Badge check
    │
    ▼
Redis processed:queue → consumed by auto-assign
```

### Technical Details

- **Atomic Queue Operations**: Redis `LMOVE` prevents race conditions
- **Error Recovery**: DB constraint errors → permanent removal; transient errors → retry via re-queue
- **Polling**: 10-second interval
- **Badge System**: Evaluates and awards badges after each complaint creation
- **Moderation**: Calls agents service; stores full moderation metadata (flagged phrases, severity, bilingual explanations)

---

## 8. Self Service (`self`)

**Port**: 3030 | **AI**: OpenAI GPT-4o-mini

### Routes

| Route | Function |
|---|---|
| `POST /api/image` | Vision AI: image → complaint category + description + urgency |
| `POST /api/chat` | Civic chatbot: domain-restricted conversational support |
| `POST /api/match` | Image comparison: determines if two photos show the same location/incident |

- **Vision AI**: Categorizes into 13 departments, generates first-person complaint text, assesses urgency (LOW/MEDIUM/HIGH)
- **Image Matcher**: Returns match (boolean), confidence (0-1), and reason; temp=0.0 for deterministic results
- **Chatbot**: Strictly scoped to SwarajDesk topics — declines off-topic questions

---

## 9. AI Agents Service (`agents`)

**Port**: 4000 | **Framework**: LangChain.js + LangGraph

### Model Provider Architecture

| Provider | Chat Model | Fast Model | Embeddings |
|---|---|---|---|
| **OpenAI** (default) | `gpt-4o` | `gpt-4o-mini` | `text-embedding-3-small` |
| **Google** | `gemini-1.5-pro` | `gemini-1.5-flash` | `text-embedding-004` |
| **Anthropic** | `claude-sonnet-4-20250514` | `claude-sonnet-4-20250514` | — |

### Routes

| Route | Auth | Description |
|---|---|---|
| `/api/health` | No | Service health |
| `/api/chat` | JWT | Conversational AI (text) |
| `/api/voice` | JWT | Voice AI (STT → Agent → TTS) |
| `/api/dedup` | JWT | Duplicate detection |
| `/api/moderate` | API Key | Content moderation (service-to-service) |
| `/api/quality-score` | JWT | Quality scoring |

### Guardrails

1. **Input Sanitizer**: Blocks prompt injection, off-topic, malicious inputs
2. **Output Filter**: Strips PII (emails, phones, Aadhaar), admin data, system markers
3. **Rate Limiter**: Per-user limits for chat and voice (voice is stricter)

---

## 10. User Frontend (`user-fe`)

**Framework**: Next.js 15 + Capacitor (Android) | **Styling**: Tailwind CSS + shadcn/ui

### Pages

| Page | Features |
|---|---|
| **Landing** | Hero, feature showcase, brand logos, CTA |
| **Registration** | Multi-step form with Aadhaar validation, location picker |
| **Login** | Email/phone + password |
| **Dashboard** | Complaint list, filing form, chat, badges, announcements, surveys |
| **Complaint Filing** | Image upload → AI auto-categorize, Google Maps picker, voice input, dedup check, quality score |

### Key Components

- `google-map-picker.tsx` — Interactive Google Maps location picker with geocoding
- `abuse-flag-banner.tsx` — Visual banner for AI-flagged abusive content
- `dedup-results-card.tsx` — Similar complaints display before submission
- `quality-score-badge.tsx` — 4-dimension quality score visualization
- `cta.tsx` — AI chatbot CTA with conversational interface
- **Capacitor**: Android app wrapper with native back navigation

---

## 11. Admin Frontend (`admin-fe`)

**Framework**: Next.js 15 | **Styling**: Tailwind CSS

### Role-Based Dashboards

| Dashboard | Path | Features |
|---|---|---|
| **Agent** | `/(pages)/Agent/` | My complaints, status updates, chat, resolve/escalate |
| **Municipal** | `/(pages)/Municipal/` | Department complaints, agent management, announcements |
| **State** | `/(pages)/State/` | Escalated complaints, municipal admin management, workflows |
| **Super** | `/(pages)/Super/` | System-wide management, category CRUD, global metrics |
| **CivicPartner** | `/(pages)/CivicPartner/` | Survey creation, response analytics |

- **Complaint Heatmap**: Geographic visualization using lat/lng data
- **Real-Time Chat**: Agent-to-citizen messaging for complaint resolution

---

## 12. Database Schema & Data Model

**Database**: PostgreSQL (NeonDB) | **ORM**: Prisma | **Schema**: 656 lines, 25+ models

### Core Models

```
User → Complaint → ComplaintLocation
  │       │ → AuditLog[], Chat[], Upvote[]
  │       │ → assigned to Agent / MunicipalAdmin / StateAdmin
  │       │ → BlockchainSyncEvent
  ├── UserBadge → Badge
  ├── UserLocation
  └── Upvote[]

CivicPartner → Survey → SurveyQuestion
                 └── SurveyResponse → SurveyAnswer
```

### Complaint Key Fields

| Field | Description |
|---|---|
| `seq` | Auto-increment human-readable complaint number |
| `status` | REGISTERED → UNDER_PROCESSING → FORWARDED → ON_HOLD → COMPLETED → REJECTED → ESCALATED_* → DELETED |
| `urgency` | LOW, MEDIUM, HIGH, CRITICAL |
| `AIabusedFlag` / `abuseMetadata` | Abuse moderation results (severity, flagged phrases, bilingual explanations) |
| `AIstandardizedSubCategory` | AI-normalized sub-category |
| `qualityScore` / `qualityBreakdown` | 0-100 score with per-dimension breakdown |
| `isDuplicate` / `hasSimilarComplaints` / `similarComplaintIds` | Duplicate detection with bidirectional linking |
| `blockchainHash` / `ipfsHash` / `isOnChain` / `blockchainStatus` | Blockchain sync fields |

### Enums

- **13 Departments**: Infrastructure, Education, Revenue, Health, Water Supply & Sanitation, Electricity & Power, Transportation, Municipal Services, Police Services, Environment, Housing & Urban Dev, Social Welfare, Public Grievances
- **Badge Categories**: FILING, ENGAGEMENT, RESOLUTION, CATEGORY_SPECIALIST
- **Badge Rarities**: COMMON, UNCOMMON, RARE, EPIC, LEGENDARY

---

## 13. Admin Hierarchy & RBAC

6-tier hierarchy reflecting India's governance:

```
Super Admin → Super State Admin → Dept. State Admin
                                → Super Municipal Admin
                                          ↓
                              Dept. Municipal Admin → Agent
```

| Role | Permissions |
|---|---|
| **Agent** | View assigned complaints, update status, resolve, chat, co-assign |
| **Dept. Municipal Admin** | Manage agents, department complaints, announcements, community moderation |
| **Super Municipal Admin** | Oversee department admins, cross-department issues, municipality metrics |
| **Dept. State Admin** | Manage municipal admins, escalated complaints, regional workflows, SLAs |
| **Super State Admin** | Oversee state admins, cross-department coordination, state-level tracking |
| **Super Admin** | System-wide: categories, all admin tiers, global operations |

---

## 14. AI Models & Agents — Current

### Agent 1: Sentient AI (Primary Conversational Agent)

- **Framework**: LangChain `createReactAgent` (LangGraph ReAct)
- **Model**: `gpt-4o` (chat tier)
- **18 Tools**: findComplaints, findMyComplaints, getTrending, getCategories, getUserProfile, getDistrictInfo, getAnnouncements, getDepartmentStats, getGuidance, getComplaintStatus, searchKnowledge, findSimilarComplaints, sendEscalation, createComplaintDraft, analyzeImage, navigateTo, upvoteComplaint, detectLocation
- **Per-request binding**: `bindUserId()` auto-injects authenticated user ID into every tool call
- **Structured Actions**: Emits `COMPLAINT_DRAFT_READY`, `NAVIGATE`, `DETECT_LOCATION` for frontend consumption

### Agent 2: Help AI (Escalation Support)

- **Model**: `gpt-4o`; triggered when Sentient AI emits `[ESCALATE_TO_HELP_AI]`
- **Tools**: searchKnowledge, sendEscalation, findMyComplaints, getComplaintStatus, getUserProfile
- Focused on complex issue resolution and human escalation

### Agent 3: Abuse AI (Content Moderation)

- **Model**: `gpt-4o-mini` with `.withStructuredOutput()`
- **Languages**: English, Hindi, Hinglish
- **Output**: `has_abuse`, `clean_text` (masked), `severity`, `flagged_phrases[]` (with category: abuse/threat/obscenity/hate_speech/personal_attack), bilingual explanations
- **Fail-Safe**: Returns safe default on error — never blocks legitimate complaints

### Agent 4: Dedup AI (Duplicate Detection)

- **Model**: `gpt-4o-mini` with `createReactAgent`
- **Tool**: `findSimilarComplaints`
- **Output**: `hasSimilar`, `isDuplicate`, `matches[]` with similarity scores, `suggestion`, `confidence`

### Agent 5: Quality Scorer

- **Model**: `gpt-4o-mini` with `.withStructuredOutput()`
- **4 Dimensions** (0-25 each, total 0-100): Clarity, Evidence, Location, Completeness
- **Rating**: poor (0-25) → fair (26-50) → good (51-75) → excellent (76-100)
- **Fallback**: Heuristic scoring if AI fails

### Vision & Voice AI

- **Vision AI** (self service): GPT-4o-mini vision for image → complaint categorization
- **Image Matcher** (self service): GPT-4o-mini vision for duplicate photo detection
- **Voice Pipeline** (agents): OpenAI Whisper STT → Agent Router → OpenAI TTS (nova/alloy voices)

### Agent Router

The `router.ts` orchestrates the multi-agent system:
1. Image pre-processing via self service
2. Input sanitization (guardrails)
3. Session memory (conversation history)
4. Sentient AI invocation
5. Output filtering (PII redaction)
6. Escalation routing to Help AI
7. Action detection for frontend

---

## 15. AI Models & Agents — Future Analytics

Planned agents for generating reports from complaints, surveys, and civic data:

| Agent | Purpose | Input | Output |
|---|---|---|---|
| **Trend Analysis** | Identify complaint patterns across time/geography/departments | Historical complaints | Trend reports, seasonal patterns, geographic hotspots |
| **Department Performance** | Generate performance scorecards per department | Complaints + surveys | Resolution time, SLA compliance, satisfaction scores |
| **Sentiment Analysis** | Analyze citizen sentiment from descriptions/chats/surveys | Text data | Sentiment scores per department/district/period |
| **Predictive Prioritization** | Predict which complaints will escalate or breach SLA | Complaint features | Priority score and risk level |
| **Survey Insights** | Generate actionable reports from CivicPartner surveys | Survey responses | Cross-tabulation, correlation, demographic analysis |
| **Fraud Detection** | Detect suspicious patterns (mass duplicates, fake complaints) | Complaint metadata | Fraud alerts, anomaly reports |
| **Geographic Intelligence** | Correlate complaints with geographic features | Location data | Infrastructure health maps, underserved area identification |

### Planned Architecture

```
Data Sources (Complaints, Surveys, Chat, Upvotes)
    │ ETL Pipeline
    ▼
Analytics Data Warehouse → Trend/Perf/Sentiment Agents → Automated Reports API
```

---

## 16. Complaint Lifecycle Pipeline

```
1. CITIZEN FILES COMPLAINT
   ├── Image? → Self Service Vision AI → auto-fill
   ├── Voice? → Agents Voice AI → STT → Agent → draft
   ├── DedupAI check → suggest upvoting similar
   ├── QualityScorer → show score + suggestions
   └── Push to Redis registration:queue

2. PROCESSING (compQueue)
   ├── Validation → AI enrichment (moderation, quality, dedup)
   ├── PostgreSQL transaction → badges
   └── Push to processed:queue

3. AUTO-ASSIGNMENT (admin-be)
   ├── District-based agent/admin matching
   ├── Workload-balanced selection → UNDER_PROCESSING
   └── Push to blockchain:queue

4. AGENT HANDLING
   ├── Chat, status updates, escalation
   └── FORWARDED → ON_HOLD → COMPLETED

5. RESOLUTION
   ├── Citizen notification (WebSocket)
   ├── Metrics updated
   └── Blockchain confirmation
```

---

## 17. CivicPartner & Survey System

Enables **NGOs and government bodies** to create surveys, collect responses, and access analytics.

- **CivicPartner**: Org profile with type (NGO/GOVERNMENT_BODY), registration number, verification
- **Survey Lifecycle**: DRAFT → PUBLISHED → CLOSED → ARCHIVED
- **Question Types**: TEXT, MCQ, CHECKBOX, RATING, YES_NO
- **Analytics**: Response aggregation, question-level breakdown, data export

---

## 18. Blockchain Integration

### Current Implementation

- **DB Fields**: `blockchainHash` (VARCHAR 66), `blockchainBlock`, `ipfsHash`, `isOnChain`, `blockchainStatus` (PENDING/CONFIRMED/FAILED)
- **`BlockchainSyncEvent` Model**: Tracks all synced events
- **Redis Queue**: `complaint:blockchain:queue` for async on-chain recording

### Planned Features

| Feature | Description |
|---|---|
| **On-Chain Status Audit Trail** | Every status change as a blockchain transaction |
| **SLA Breach Recording** | Smart contract `SLA_BREACHED` events |
| **Escalation Trail** | Immutable escalation records |
| **Agent Performance on Chain** | Resolution events per agent |
| **Merkle Batching** | Weekly commitments cutting gas by ~99% |

**Tech**: Sepolia (dev) → Polygon/Arbitrum L2 (production); IPFS for payloads

---

## 19. Real-Time Communication

- **WebSocket Server**: Bun-native (zero dependencies), port 3001
- **Chat System**: `Chat` model with USER/AGENT sender types, linked to Complaint
- **Image Support**: `imageUrl` field for photo sharing in chat
- **DB Indexes**: On `userId`, `agentId`, `complaintId` for fast queries

---

## 20. Monitoring & Observability

### Self-Hosted System (`packages/monitoring`)

78 checks across 7 groups running every 15 minutes:

| Group | Checks |
|---|---|
| `backend-health` | `/health` endpoints |
| `feature-api` | 52 deep API probes |
| `database` | NeonDB SQL ping |
| `redis` | Redis PING |
| `s3` | AWS S3 listObjects |
| `ec2` | SSH reachability |
| `dns-tls` | DNS consistency + TLS validity |

### False-Positive Suppression

1. **Retries**: 2 retries with 1.5s delay per check
2. **Dampening**: 2 consecutive failures required before DOWN status
3. **Slow Grading**: Slow-but-alive endpoints marked UP with warning

### Tiered Timeouts

| Tier | Timeout | Applied To |
|---|---|---|
| T_FAST | 15s | Auth, profile, lightweight GETs |
| T_NORMAL | 30s | Admin lists, queue status |
| T_HEAVY | 35s | Feeds, complaint lists, heatmaps |
| T_BLOCKCHAIN | 45s | Auto-assign, blockchain ops |

### Alerting

- Batched single email per cycle
- State machine: WARNING → DOWN → recovery notifications

---

## 21. Infrastructure & Deployment

### Target 1: GKE Autopilot (Kubernetes)

**Pipeline**: Terraform → GKE → Helm (Traefik + ArgoCD) → External Secrets → 20 K8s Manifests

| Step | Action |
|---|---|
| 1 | Terraform init + apply (GKE provisioning) |
| 2 | Get GKE credentials |
| 3 | Add Helm repos (Traefik, ArgoCD, External Secrets) |
| 4 | Install platform Helm chart |
| 5 | Install External Secrets + AWS SM credentials |
| 6 | Apply K8s manifests (deployments, secrets, ingresses, middlewares) |
| 7 | Final status report |

### Target 2: AWS EC2 (Docker)

**Terraform** (`ec2/main.tf`): m7i-flex.large, Ubuntu 22.04, ap-south-1, 30GB gp3

**One-Shot Deploy** (`autoAnsible.sh`):
1. terraform validate → apply
2. Extract IP → update inventory
3. SSH wait → ansible playbook (Docker + Nginx) → containers

**Docker Containers**: user-be (:3000,:3001), admin-be (:3002), comp-queue (:3005), self (:3030)

### Target 3: AWS Alternative (`aws/` directory)

Mirrors GKE playbooks for AWS EKS: `aws-full-deploy.yml`, `aws-k8s-platform-setup.yml`, `aws-prisma.yml`, `aws-run-all.yml`, `aws-stop-all.yml`, `aws-app-deploy.yml`

### DNS: Cloudflare (proxied records, SSL/TLS, DDoS protection)
### Reverse Proxy: Nginx (EC2) / Traefik (K8s)

---

## 22. CI/CD Pipeline

### GitHub Actions (`ci.yaml`)

**Trigger**: Push to `main` or any PR

| Stage | Details |
|---|---|
| **Test** | 4 packages: user-be, admin-be, compQueue, self (Prisma generate + `bun run test:unit`) |
| **Build & Push** (main only) | 4 Docker images to Docker Hub with tags: `latest` + `<commit-sha>` |
| **GitOps** | ArgoCD watches `deploy` branch; auto-syncs on merge |

### Docker Images

| Image | Repository |
|---|---|
| user-be | `ogadityahota/swarajdesk-user-be` |
| admin-be | `ogadityahota/sih-swarajdesk-admin-be` |
| compQueue | `ogadityahota/swarajdesk-comp-queue` |
| self | `ogadityahota/swarajdesk-self` |

---

## 23. Security Architecture

| Layer | Mechanism |
|---|---|
| **User Auth** | JWT tokens |
| **Admin Auth** | Role-based JWT with access level |
| **Secrets** | AWS Secrets Manager (runtime injection, never in code) |
| **K8s Secrets** | External Secrets Operator syncs from AWS SM |
| **Headers** | Helmet (CSP, HSTS, X-Frame-Options) |
| **Input Safety** | Prompt injection detection, input sanitization |
| **Output Safety** | PII redaction (emails, phones, Aadhaar) |
| **Rate Limiting** | Per-user chat + voice limits |
| **Data Protection** | Cascade deletes, consent flags, bcrypt hashing |

---

## 24. Testing Strategy

| Package | Framework | Focus |
|---|---|---|
| user-be | Jest | Routes, middleware, validation |
| admin-be | Jest | Admin routes, auth, auto-assign |
| compQueue | Jest | Processing pipeline, queue ops |
| self | Jest | AI route handlers |
| agents | Vitest | Agent invocations, tools, guardrails |

```bash
bun run test              # All tests
bun run test:coverage     # All with coverage
```

CI runs all tests on every push/PR before building Docker images.

---

## 25. Technology Stack

### Backend
Bun 1.3.x · Express 5 · Prisma · PostgreSQL (NeonDB) · Redis 7.x · TypeScript 5.x · Zod

### AI & ML
LangChain.js · LangGraph · OpenAI GPT-4o/4o-mini · OpenAI Whisper (STT) · OpenAI TTS · Google Gemini (alt provider)

### Frontend
Next.js 15 · Tailwind CSS · shadcn/ui · Capacitor (Android) · Google Maps API

### Infrastructure
Terraform · Ansible · Docker · Kubernetes (GKE Autopilot) · Helm · ArgoCD · Traefik · Nginx · Cloudflare · AWS Secrets Manager · AWS S3 · External Secrets Operator · GitHub Actions · Docker Hub

### Monitoring
Custom Node.js (78 checks) · SMTP alerts · Cloudflare API · SSH health checks

---

<div align="center">

**SwarajDesk** — Built for India's citizens, powered by AI, secured by blockchain.

*© 2025 SwarajDesk Team — IIT Bhubaneswar*

</div>
