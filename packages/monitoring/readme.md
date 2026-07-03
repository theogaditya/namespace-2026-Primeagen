# Monitoring Package

A self-hosted, real-time health monitoring system for the IIT BBSR Swaraj platform. It monitors backend APIs, databases, DNS/TLS, EC2, Redis, S3, and more -with a built-in dashboard, per-cycle log files, smart alerting, and false-positive suppression.

---

## Getting Started

### 1. Install Dependencies

```bash
npm install pg --legacy-peer-deps && npm install @types/pg --save-dev --legacy-peer-deps
```

### 2. Configure Environment

Create a `.env` file at `packages/monitoring/.env` (use `.env.example` as a reference):

```env
# SMTP (for email alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ALERT_TO=your-alert-inbox@gmail.com

# EC2
EC2_HOST=<public-ip>
EC2_SSH_KEY=/absolute/path/to/ec2-iit-pair

# Cloudflare (for DNS checks)
CF_API_TOKEN=<cloudflare-api-token>
CF_ZONE_ID=<cloudflare-zone-id>

# Feature probe credentials (monitoring agent accounts)
MONITOR_AGENT_EMAIL=agent@example.com
MONITOR_AGENT_PASSWORD=secret
MONITOR_MUNI_EMAIL=muni@example.com
MONITOR_MUNI_PASSWORD=secret
```

### 3. Run

```bash
# Development
npm run dev

# Production (compile then run)
npx tsc && node dist/index.js
```

The dashboard is served at `http://localhost:3001` by default.

---

## Architecture Overview

```
scheduler.ts         ← orchestrates check cycles (every 15 min)
├── httpChecker.ts   ← HTTP/HTTPS checks with retry + slow grading
├── featureProber.ts ← 52 deep API probes (batched, concurrency-limited)
├── dnsChecker.ts    ← DNS checks via Cloudflare API
├── ec2Checker.ts    ← EC2 reachability via SSH
├── ec2LogChecker.ts ← Fetches journalctl logs from EC2 over SSH
└── runLogger.ts     ← Writes per-cycle JSON logs to logs/

alerter.ts           ← State machine; decides when to send email alerts
dashboard.ts         ← Express API + static dashboard UI
```

---

## Check Groups

| Group | What's Monitored |
|---|---|
| `backend-health` | `/health` endpoint of user-be, admin-be, comp-queue |
| `feature-api` | 52 deep API probes (auth, complaints, feeds, auto-assign, blockchain) |
| `database` | NeonDB connectivity via raw SQL ping |
| `redis` | Redis `PING` command |
| `s3` | AWS S3 `listObjectsV2` on the configured bucket |
| `ec2` | SSH reachability + public IP check |
| `dns-tls` | DNS record consistency + TLS certificate validity for all 3 domains |

### Disabled Probes (Mutating)
> Note: Some `POST` and `PUT` endpoints (e.g. Create Agent, Escalate Complaint, Process Queue) were initially tested but have been commented out to avoid polluting the live production database with dummy monitoring data. The monitoring focuses strictly on safe `GET` operations and non-destructive `POST`s (like Logins and Polling start/stop).

---

## False Positive Suppression

Production endpoints -especially heavy DB queries and auto-assign blockchain ops -can be legitimately slow or transiently unavailable. Three mechanisms work together to prevent false alerts:

### Layer 1 -Immediate Retries (in `httpChecker.ts`)

Every standard HTTP check automatically retries **up to 2 times** with a **1.5 s delay** between attempts before recording a failure.

- A 1-second network blip → retried silently, card stays `UP`
- If all attempts fail → recorded as `DOWN` with `(failed after 3 attempts)` in the message
- Feature probes use `noRetry: true` (see below) since they rely on dampening instead

### Layer 2 -Status Dampening + Consecutive Failure Threshold (in `alerter.ts`)

A state machine tracks each check across cycles. The dashboard and email behave differently:

| Consecutive failures | Dashboard status | Email sent? |
|---|---|---|
| 1st failure | `⚠️ WARNING -watching` | ❌ No |
| 2nd+ failure | `❌ DOWN` | ✅ Yes (batched) |
| Recovery | `✅ UP` | ✅ Yes (only if was truly DOWN) |

This means a transient glitch that resolves on the next cycle **never sends an email and never shows as DOWN**.

### Layer 3 -Response Time Grading (in `httpChecker.ts`)

Slow-but-alive endpoints no longer fail. Responses are graded:

- Faster than `slowThresholdMs` (default 8 s) → `UP`
- Slower than threshold but within timeout → `UP` with `⚠️ Slow (Xms)` message
- Timeout or connection error → `DOWN`

This is visible in the card and the detail modal but never triggers an alert.

---

## Tiered Timeouts

All 52 feature probes have explicit timeouts matched to their workload, defined in `featureProber.ts`:

| Tier | Timeout | Applied to |
|---|---|---|
| `T_FAST` | 15 s | Auth verify, profile, lightweight GETs |
| `T_NORMAL` | 30 s | Admin lists, queue status, chat |
| `T_HEAVY` | 35 s | Feed queries, complaint lists, heatmaps |
| `T_POST` | 30 s | Login, submit, update, escalate |
| `T_BLOCKCHAIN` | 45 s | Auto-assign, blockchain queue ops |

---

## Concurrent Connection Management

Firing all 52 probes simultaneously with Node's default HTTPS agent causes **socket queue exhaustion** (Node's default is 5 sockets per host). Requests queue up and time out even when the server is healthy. Two fixes are applied in `featureProber.ts`:

1. **Shared keep-alive HTTPS agent** with `maxSockets: 30` and `maxFreeSockets: 10` -eliminates the 5-socket bottleneck and reuses TCP connections across requests.

2. **Concurrency limiter** (`runWithConcurrency`) -probes are run in **batches of 10** rather than all 52 at once. This prevents socket storms while maintaining good cycle performance.

---

## DNS Checks

DNS checks use the **Cloudflare API** (not system DNS) to resolve records for:

- `iit-bbsr-swaraj-user-be.adityahota.online`
- `iit-bbsr-swaraj-admin-be.adityahota.online`
- `iit-bbsr-swaraj-comp-queue.adityahota.online`

The check verifies that IPs returned by Cloudflare are consistent across all three domains (expected behavior for proxied Cloudflare records). A mismatch triggers a `WARNING`.

---

## EC2 Checks

EC2 health is verified by opening a real **SSH connection** using the key at `EC2_SSH_KEY`. If SSH succeeds, the EC2 check is marked `UP` regardless of other checks. Detailed service logs (`journalctl`) are also fetched over SSH and surfaced in the dashboard modal.

---

## Per-Cycle Log Files

After every check cycle, a timestamped JSON file is written to `packages/monitoring/logs/`:

```
logs/run-2026-03-11T00-15-00.json
```

Each file contains:
```json
{
  "runAt": "2026-03-11T00:15:00.000Z",
  "totalChecks": 78,
  "summary": { "up": 71, "down": 2, "warning": 5 },
  "checks": {
    "feat-ube-chat": {
      "id": "feat-ube-chat",
      "status": "DOWN",
      "message": "Timeout after 30000ms",
      "responseTimeMs": 30039,
      ...
    }
  }
}
```

**Log rotation:** When more than **10 log files** accumulate, the **4 oldest** are automatically deleted after each cycle. This keeps disk usage bounded without losing recent history.

The `logs/` directory is tracked in git via `.gitkeep` but all `run-*.json` files are excluded by `.gitignore`.

### Dashboard Integration

Clicking any check card opens a detail modal that fetches the latest run log entry for that check via:

```
GET /api/check-log/:checkId
```

This shows the full message, response time, severity, and raw JSON log entry -making it easy to debug failures without SSHing into the server.

---

## Alerting

All alerts are **batched into a single email** per cycle. Individual per-check emails are never sent. The email includes:

- A summary table of all state changes (UP → DOWN, DOWN → UP)
- Full message and response time for each changed check
- Timestamp of the cycle

Alerts are only dispatched when a check has **confirmed failed for 2 consecutive cycles** (after surviving retry attempts). Recoveries send a single "resolved" notification.

---

## Dashboard API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/status` | Current state of all checks + summary |
| `GET /api/incidents` | Recent downtime incidents |
| `GET /api/alerts` | Recent alert history |
| `GET /api/history?hours=N` | Response time history for charting |
| `GET /api/check-log/:checkId` | Latest run log entry for a specific check |
| `GET /api/run-logs` | List all run log filenames |
| `GET /api/run-logs/:filename` | Full JSON for a specific historical run log |
| `POST /api/check/run` | Trigger an immediate check cycle |
