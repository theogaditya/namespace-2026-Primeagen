import axios from 'axios';
import https from 'https';
import { config } from '../config';
import { httpCheck, aliveValidator } from './httpChecker';
import type { CheckResult } from '../types';

// Credentials for monitoring probes -read from env or fall back to hardcoded test values
const AGENT_EMAIL = process.env.MONITOR_AGENT_EMAIL || 'ankita@gmail.com';
const AGENT_PASSWORD = process.env.MONITOR_AGENT_PASSWORD || '123123123';
const MUNI_EMAIL = process.env.MONITOR_MUNI_EMAIL || 'sourab@gmail.com';
const MUNI_PASSWORD = process.env.MONITOR_MUNI_PASSWORD || '123123123';

// Shared keep-alive agent with a generous socket pool.
// Without this Node uses max 5 sockets/host by default, causing queued
// requests to time out when 50+ probes fire simultaneously.
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  maxSockets: 30,          // allow 30 concurrent sockets to each host
  maxFreeSockets: 10,      // keep 10 idle sockets warm between cycles
});

// Simple concurrency limiter – runs at most `concurrency` tasks at a time.
async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], concurrency = 10): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      try {
        results[i] = { status: 'fulfilled', value: await tasks[i]() };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ── Timeout tiers (in ms) ─────────────────────────────────────────────────────
// Simple auth / health pings
const T_FAST = 10_000;
// Standard DB-backed GETs
const T_NORMAL = 15_000;
// Heavy DB reads (feed queries, complaint lists, heatmaps)
const T_HEAVY = 60_000;     // Some DB aggregations take longer than 30s
// POST operations that write to DB / trigger side effects
const T_POST = 20_000;
// Blockchain / queue operations that may be intentionally slow
const T_BLOCKCHAIN = 45_000;
// ─────────────────────────────────────────────────────────────────────────────

/** Login to admin-be and return a Bearer token, or null on failure */
async function loginAdmin(adminBeUrl: string, email: string, password: string, adminType: string): Promise<string | null> {
  try {
    const resp = await axios.post(
      `${adminBeUrl}/api/auth/login`,
      { officialEmail: email, password, adminType },
      { timeout: T_FAST, httpsAgent, validateStatus: () => true },
    );
    if (resp.status === 200 && resp.data?.token) {
      return resp.data.token as string;
    }
    console.warn(`[monitor] admin-be login (${adminType}) failed: HTTP ${resp.status} -${JSON.stringify(resp.data)}`);
    return null;
  } catch (err: any) {
    console.warn(`[monitor] admin-be login (${adminType}) error:`, err.message);
    return null;
  }
}

// Shorthand: noRetry probe (all feature probes skip retries to keep cycle fast)
function probe(opts: Parameters<typeof httpCheck>[0]) {
  return () => httpCheck({ ...opts, noRetry: true });
}

/**
 * 47 feature-level API deep probes across user-be, admin-be and comp-queue.
 * Admin-be routes that require authentication are probed using real JWTs
 * obtained by logging in as the monitoring agent + municipal-admin accounts.
 */
export async function runFeatureProbes(): Promise<CheckResult[]> {
  const { userBe, adminBe, compQueue } = config.urls;

  // Obtain tokens for authenticated admin-be routes (done in parallel)
  const [agentToken, muniToken] = await Promise.all([
    loginAdmin(adminBe, AGENT_EMAIL, AGENT_PASSWORD, 'AGENT'),
    loginAdmin(adminBe, MUNI_EMAIL, MUNI_PASSWORD, 'MUNICIPAL_ADMIN'),
  ]);

  const agentHeaders: Record<string, string> = agentToken ? { Authorization: `Bearer ${agentToken}` } : {};
  const muniHeaders: Record<string, string> = muniToken ? { Authorization: `Bearer ${muniToken}` } : {};

  // Run all probes with a concurrency cap of 10.
  // Running all 52+ at once floods the socket pool and causes false timeouts.
  const probeDefinitions: Array<() => Promise<CheckResult>> = [
    // ── user-be (16 probes) ──────────────────────────────────────────
    probe({ id: 'feat-ube-categories', name: 'user-be: GET Categories', group: 'feature-api', url: `${userBe}/api/categories`, validate: aliveValidator, timeout: T_FAST }),
    probe({ id: 'feat-ube-districts', name: 'user-be: GET Districts', group: 'feature-api', url: `${userBe}/api/districts`, validate: aliveValidator, timeout: T_FAST }),
    probe({ id: 'feat-ube-complaints-get', name: 'user-be: GET Complaints', group: 'feature-api', url: `${userBe}/api/complaints/get`, validate: aliveValidator, timeout: T_HEAVY }),
    probe({ id: 'feat-ube-badges', name: 'user-be: GET Badges', group: 'feature-api', url: `${userBe}/api/badges`, validate: aliveValidator, timeout: T_NORMAL }),
    probe({ id: 'feat-ube-login', name: 'user-be: POST User Login', group: 'feature-api', url: `${userBe}/api/users/login`, method: 'POST', body: { email: '_MONITOR_TEST_@test.com', password: 'test' }, validate: aliveValidator, timeout: T_POST }),
    probe({ id: 'feat-ube-register', name: 'user-be: POST User Register', group: 'feature-api', url: `${userBe}/api/users/register`, method: 'POST', body: { name: '_MONITOR_TEST_User', email: '_MONITOR_TEST_@test.com', password: 'testpass123', phoneNumber: '0000000000' }, validate: aliveValidator, timeout: T_POST }),
    probe({ id: 'feat-ube-profile', name: 'user-be: GET User Profile', group: 'feature-api', url: `${userBe}/api/user/profile`, validate: aliveValidator, timeout: T_NORMAL }),
    probe({ id: 'feat-ube-chat', name: 'user-be: GET Chat', group: 'feature-api', url: `${userBe}/api/chat`, validate: aliveValidator, timeout: T_NORMAL }),
    probe({ id: 'feat-ube-feed-trending', name: 'user-be: GET Feed Trending', group: 'feature-api', url: `${userBe}/api/complaints/get/trending`, validate: aliveValidator, timeout: T_HEAVY }),
    probe({ id: 'feat-ube-feed-recent', name: 'user-be: GET Feed Recent', group: 'feature-api', url: `${userBe}/api/complaints/get/recent`, validate: aliveValidator, timeout: T_HEAVY }),
    probe({ id: 'feat-ube-feed-foryou', name: 'user-be: GET Feed For-You', group: 'feature-api', url: `${userBe}/api/complaints/get/for-you`, validate: aliveValidator, timeout: T_HEAVY }),
    probe({ id: 'feat-ube-feed-heatmap', name: 'user-be: GET Feed Heatmap', group: 'feature-api', url: `${userBe}/api/complaints/get/heatmap`, validate: aliveValidator, timeout: T_HEAVY }),
    probe({ id: 'feat-ube-feed-search', name: 'user-be: GET Feed Search', group: 'feature-api', url: `${userBe}/api/complaints/get/search?q=test`, validate: aliveValidator, timeout: T_HEAVY }),
    probe({ id: 'feat-ube-validate-pin', name: 'user-be: GET Validate PIN', group: 'feature-api', url: `${userBe}/api/complaints/validate-pin?pin=834001`, validate: aliveValidator, timeout: T_FAST }),
    probe({ id: 'feat-ube-submit', name: 'user-be: POST Submit Complaint', group: 'feature-api', url: `${userBe}/api/complaints`, method: 'POST', body: {}, validate: aliveValidator, timeout: T_POST }),
    probe({ id: 'feat-ube-logout', name: 'user-be: POST User Logout', group: 'feature-api', url: `${userBe}/api/users/logout`, method: 'POST', validate: aliveValidator, timeout: T_POST }),

    // ── user-be (Missing Probes) ───────────────────────────────────────
    probe({ id: 'feat-ube-likes', name: 'user-be: POST Complaint Like', group: 'feature-api', url: `${userBe}/api/complaints/like`, method: 'POST', validate: aliveValidator, timeout: T_NORMAL }),
    probe({ id: 'feat-ube-comp-detail', name: 'user-be: GET Complaint Detail', group: 'feature-api', url: `${userBe}/api/complaints/get/00000000-0000-0000-0000-000000000000`, validate: aliveValidator, timeout: T_NORMAL }),
    probe({ id: 'feat-ube-notifications', name: 'user-be: GET Notifications', group: 'feature-api', url: `${userBe}/api/user/notifications`, validate: aliveValidator, timeout: T_NORMAL }),

    // ── admin-be: unauthenticated probes ─────────────────────────────
    probe({ id: 'feat-abe-auth-login', name: 'admin-be: POST Auth Login', group: 'feature-api', url: `${adminBe}/api/auth/login`, method: 'POST', body: { officialEmail: 'test@test.com', password: 'test', adminType: 'AGENT' }, validate: aliveValidator, timeout: T_POST }),
    probe({ id: 'feat-abe-auth-verify', name: 'admin-be: GET Auth Verify', group: 'feature-api', url: `${adminBe}/api/auth/verify`, validate: aliveValidator, timeout: T_FAST }),

    // ── admin-be: super-admin routes ──────────────────────────────────
    probe({ id: 'feat-abe-super-admins', name: 'admin-be: GET All Admins', group: 'feature-api', url: `${adminBe}/api/super-admin/admins`, headers: agentHeaders, validate: aliveValidator, timeout: T_NORMAL }),
    probe({ id: 'feat-abe-super-complaints', name: 'admin-be: GET Super Complaints', group: 'feature-api', url: `${adminBe}/api/super-admin/complaints`, headers: agentHeaders, validate: aliveValidator, timeout: T_HEAVY }),
    probe({ id: 'feat-abe-super-profile', name: 'admin-be: GET Super Profile', group: 'feature-api', url: `${adminBe}/api/super-admin/profile`, headers: agentHeaders, validate: aliveValidator, timeout: T_FAST }),
    probe({ id: 'feat-abe-super-my', name: 'admin-be: GET Super My-Complaints', group: 'feature-api', url: `${adminBe}/api/super-admin/my-complaints`, headers: agentHeaders, validate: aliveValidator, timeout: T_HEAVY }),

    // ── admin-be: state-admin routes ──────────────────────────────────
    probe({ id: 'feat-abe-state-admins', name: 'admin-be: GET State Admins', group: 'feature-api', url: `${adminBe}/api/state-admin/state-admins`, headers: agentHeaders, validate: aliveValidator, timeout: T_NORMAL }),
    probe({ id: 'feat-abe-state-complaints', name: 'admin-be: GET State Complaints', group: 'feature-api', url: `${adminBe}/api/state-admin/complaints`, headers: agentHeaders, validate: aliveValidator, timeout: T_HEAVY }),
    probe({ id: 'feat-abe-state-my', name: 'admin-be: GET State My-Complaints', group: 'feature-api', url: `${adminBe}/api/state-admin/my-complaints`, headers: agentHeaders, validate: aliveValidator, timeout: T_HEAVY }),
    probe({ id: 'feat-abe-state-municipal', name: 'admin-be: GET State Municipal-Admins', group: 'feature-api', url: `${adminBe}/api/state-admin/municipal-admins`, headers: agentHeaders, validate: aliveValidator, timeout: T_NORMAL }),

    // ── admin-be: municipal-admin routes ──────────────────────────────
    probe({ id: 'feat-abe-muni-agents', name: 'admin-be: GET Municipal All Agents', group: 'feature-api', url: `${adminBe}/api/municipal-admin/all`, headers: muniHeaders, validate: aliveValidator, timeout: T_NORMAL }),
    probe({ id: 'feat-abe-muni-complaints', name: 'admin-be: GET Municipal Complaints', group: 'feature-api', url: `${adminBe}/api/municipal-admin/complaints`, headers: muniHeaders, validate: aliveValidator, timeout: T_HEAVY }),
    probe({ id: 'feat-abe-muni-my', name: 'admin-be: GET Municipal My-Complaints', group: 'feature-api', url: `${adminBe}/api/municipal-admin/my-complaints`, headers: muniHeaders, validate: aliveValidator, timeout: T_HEAVY }),
    probe({ id: 'feat-abe-create-agent', name: 'admin-be: POST Create Agent', group: 'feature-api', url: `${adminBe}/api/municipal-admin/create/agent`, method: 'POST', headers: muniHeaders, body: { fullName: '_MONITOR_TEST_Agent', officialEmail: '_monitor_test_agent@test.com', password: 'monitortest123', department: 'INFRASTRUCTURE', municipality: 'Test' }, validate: aliveValidator, timeout: T_POST }),

    // ── admin-be: agent routes ─────────────────────────────────────────
    probe({ id: 'feat-abe-agent-login', name: 'admin-be: POST Agent Login', group: 'feature-api', url: `${adminBe}/api/agent/login`, method: 'POST', body: { officialEmail: 'test@test.com', password: 'test' }, validate: aliveValidator, timeout: T_POST }),
    probe({ id: 'feat-abe-agent-me', name: 'admin-be: GET Agent Me', group: 'feature-api', url: `${adminBe}/api/agent/me`, headers: agentHeaders, validate: aliveValidator, timeout: T_FAST }),
    probe({ id: 'feat-abe-agent-complaints', name: 'admin-be: GET Agent Complaints', group: 'feature-api', url: `${adminBe}/api/agent/complaints`, headers: agentHeaders, validate: aliveValidator, timeout: T_HEAVY }),
    probe({ id: 'feat-abe-agent-my', name: 'admin-be: GET Agent My-Complaints', group: 'feature-api', url: `${adminBe}/api/agent/my-complaints`, headers: agentHeaders, validate: aliveValidator, timeout: T_HEAVY }),

    // ── admin-be: complaint routes ─────────────────────────────────────
    probe({ id: 'feat-abe-complaint-list', name: 'admin-be: GET Complaint List', group: 'feature-api', url: `${adminBe}/api/complaints/list`, headers: agentHeaders, validate: aliveValidator, timeout: T_HEAVY }),
    probe({ id: 'feat-abe-complaint-stats', name: 'admin-be: GET Complaint Stats', group: 'feature-api', url: `${adminBe}/api/complaints/stats/overview`, headers: agentHeaders, validate: aliveValidator, timeout: T_HEAVY }),
    probe({ id: 'feat-abe-complaint-all', name: 'admin-be: GET All Complaints', group: 'feature-api', url: `${adminBe}/api/complaints/all-complaints`, headers: agentHeaders, validate: aliveValidator, timeout: T_HEAVY }),
    probe({ id: 'feat-abe-complaint-locs', name: 'admin-be: GET Complaint Locations', group: 'feature-api', url: `${adminBe}/api/complaints/locations`, headers: agentHeaders, validate: aliveValidator, timeout: T_HEAVY }),
    probe({ id: 'feat-abe-complaint-liked', name: 'admin-be: GET Most-Liked', group: 'feature-api', url: `${adminBe}/api/complaints/most-liked`, headers: agentHeaders, validate: aliveValidator, timeout: T_HEAVY }),
    probe({ id: 'feat-abe-autoassign-queue', name: 'admin-be: GET Queue Status', group: 'feature-api', url: `${adminBe}/api/auto-assign/queue-status`, headers: agentHeaders, validate: aliveValidator, timeout: T_NORMAL }),
    probe({ id: 'feat-abe-autoassign-poll', name: 'admin-be: GET Polling Status', group: 'feature-api', url: `${adminBe}/api/auto-assign/polling/status`, headers: agentHeaders, validate: aliveValidator, timeout: T_NORMAL }),
    probe({ id: 'feat-abe-autoassign-single', name: 'admin-be: POST Auto-Assign Single', group: 'feature-api', url: `${adminBe}/api/auto-assign/single`, method: 'POST', headers: agentHeaders, validate: aliveValidator, timeout: T_BLOCKCHAIN }),
    probe({ id: 'feat-abe-autoassign-batch', name: 'admin-be: POST Auto-Assign Batch', group: 'feature-api', url: `${adminBe}/api/auto-assign/batch`, method: 'POST', headers: agentHeaders, validate: aliveValidator, timeout: T_BLOCKCHAIN }),
    probe({ id: 'feat-abe-autoassign-bc-pop', name: 'admin-be: POST Blockchain Queue Pop', group: 'feature-api', url: `${adminBe}/api/auto-assign/blockchain-queue-pop`, method: 'POST', headers: agentHeaders, validate: aliveValidator, timeout: T_BLOCKCHAIN }),
    probe({ id: 'feat-abe-autoassign-poll-start', name: 'admin-be: POST Polling Start', group: 'feature-api', url: `${adminBe}/api/auto-assign/polling/start`, method: 'POST', headers: agentHeaders, validate: aliveValidator, timeout: T_NORMAL }),
    probe({ id: 'feat-abe-autoassign-poll-stop', name: 'admin-be: POST Polling Stop', group: 'feature-api', url: `${adminBe}/api/auto-assign/polling/stop`, method: 'POST', headers: agentHeaders, validate: aliveValidator, timeout: T_NORMAL }),

    // ── admin-be: additional agent routes ─────────────────────────────
    probe({ id: 'feat-abe-agent-complaint-id', name: 'admin-be: GET Agent Complaint By ID', group: 'feature-api', url: `${adminBe}/api/agent/complaints/monitor-probe`, headers: agentHeaders, validate: aliveValidator, timeout: T_NORMAL }),
    probe({ id: 'feat-abe-agent-me-complaints', name: 'admin-be: GET Agent Me Complaints', group: 'feature-api', url: `${adminBe}/api/agent/me/complaints`, headers: agentHeaders, validate: aliveValidator, timeout: T_HEAVY }),

    // ── admin-be: additional municipal-admin routes ────────────────────
    probe({ id: 'feat-abe-muni-login', name: 'admin-be: POST Municipal Login', group: 'feature-api', url: `${adminBe}/api/municipal-admin/login`, method: 'POST', body: { officialEmail: 'test@test.com', password: 'test' }, validate: aliveValidator, timeout: T_POST }),
    probe({ id: 'feat-abe-muni-complaint-id-status', name: 'admin-be: PUT Muni Complaint Status', group: 'feature-api', url: `${adminBe}/api/municipal-admin/complaints/monitor-probe/status`, method: 'PUT', headers: muniHeaders, body: { status: 'UNDER_PROCESSING' }, validate: aliveValidator, timeout: T_POST }),
    probe({ id: 'feat-abe-muni-complaint-escalate', name: 'admin-be: PUT Muni Complaint Escalate', group: 'feature-api', url: `${adminBe}/api/municipal-admin/complaints/monitor-probe/escalate`, method: 'PUT', headers: muniHeaders, validate: aliveValidator, timeout: T_POST }),

    // ── admin-be: chat routes ──────────────────────────────────────────
    probe({ id: 'feat-abe-chat-get', name: 'admin-be: GET Chat Messages', group: 'feature-api', url: `${adminBe}/api/chat/monitor-probe`, headers: agentHeaders, validate: aliveValidator, timeout: T_NORMAL }),
    probe({ id: 'feat-abe-chat-count', name: 'admin-be: GET Chat Message Count', group: 'feature-api', url: `${adminBe}/api/chat/monitor-probe/count`, headers: agentHeaders, validate: aliveValidator, timeout: T_NORMAL }),

    // ── admin-be (Missing Probes) ──────────────────────────────────────
    probe({ id: 'feat-abe-cproc-status', name: 'admin-be: GET Complaint Proc. Status', group: 'feature-api', url: `${adminBe}/api/complaint/processing/status`, validate: aliveValidator, timeout: T_NORMAL }),
    probe({ id: 'feat-abe-cproc-trigger', name: 'admin-be: POST Complaint Proc. Trigger', group: 'feature-api', url: `${adminBe}/api/complaint/processing`, method: 'POST', validate: aliveValidator, timeout: T_BLOCKCHAIN }),
    probe({ id: 'feat-abe-user-comps', name: 'admin-be: GET User Complaints', group: 'feature-api', url: `${adminBe}/api/users/00000000-0000-0000-0000-000000000000/complaints`, headers: agentHeaders, validate: aliveValidator, timeout: T_NORMAL }),
    probe({ id: 'feat-abe-comp-trends', name: 'admin-be: GET Complaint Trends', group: 'feature-api', url: `${adminBe}/api/complaints/stats/trends`, headers: agentHeaders, validate: aliveValidator, timeout: T_HEAVY }),
    probe({ id: 'feat-abe-comp-dept', name: 'admin-be: GET Complaint Dept Stats', group: 'feature-api', url: `${adminBe}/api/complaints/stats/department`, headers: agentHeaders, validate: aliveValidator, timeout: T_HEAVY }),
    probe({ id: 'feat-abe-comp-by-id', name: 'admin-be: GET Complaint By ID', group: 'feature-api', url: `${adminBe}/api/complaints/00000000-0000-0000-0000-000000000000`, headers: agentHeaders, validate: aliveValidator, timeout: T_NORMAL }),
    probe({ id: 'feat-abe-comp-timeline', name: 'admin-be: GET Complaint Timeline', group: 'feature-api', url: `${adminBe}/api/complaints/00000000-0000-0000-0000-000000000000/timeline`, headers: agentHeaders, validate: aliveValidator, timeout: T_NORMAL }),


    // ── comp-queue (6 probes) ──────────────────────────────────────────
    probe({ id: 'feat-cq-status', name: 'comp-queue: GET Processing Status', group: 'feature-api', url: `${compQueue}/api/processing/status`, validate: aliveValidator, timeout: T_NORMAL }),
    probe({ id: 'feat-cq-process', name: 'comp-queue: POST Process Single', group: 'feature-api', url: `${compQueue}/api/processing`, method: 'POST', validate: aliveValidator, timeout: T_BLOCKCHAIN }),
    probe({ id: 'feat-cq-start', name: 'comp-queue: POST Start Polling', group: 'feature-api', url: `${compQueue}/api/processing/start`, method: 'POST', validate: aliveValidator, timeout: T_NORMAL }),
    probe({ id: 'feat-cq-stop', name: 'comp-queue: POST Stop Polling', group: 'feature-api', url: `${compQueue}/api/processing/stop`, method: 'POST', validate: aliveValidator, timeout: T_NORMAL }),
    probe({ id: 'feat-cq-blockchain', name: 'comp-queue: GET Blockchain Queue', group: 'feature-api', url: `${compQueue}/api/auto-assign/blockchain-queue-status`, validate: aliveValidator, timeout: T_BLOCKCHAIN, severity: 'WARNING' }),
    // Re-start polling after stop test
    probe({ id: 'feat-cq-restart', name: 'comp-queue: POST Restart Polling', group: 'feature-api', url: `${compQueue}/api/processing/start`, method: 'POST', validate: aliveValidator, timeout: T_NORMAL }),
  ];

  const checks = await runWithConcurrency(probeDefinitions, 10);

  return checks.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : {
        id: 'feat-unknown',
        name: 'Feature Probe Error',
        group: 'feature-api' as const,
        status: 'DOWN' as const,
        responseTimeMs: 0,
        message: (r as PromiseRejectedResult).reason?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
        severity: 'CRITICAL' as const,
      }
  );
}

