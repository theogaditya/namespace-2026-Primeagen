import { config } from '../config';
import { httpCheck, aliveValidator, successJsonValidator, okValidator } from './httpChecker';
import type { CheckResult } from '../types';

/**
 * 47 feature-level API deep probes across user-be, admin-be and comp-queue.
 */
export async function runFeatureProbes(): Promise<CheckResult[]> {
  const { userBe, adminBe, compQueue } = config.urls;

  const checks = await Promise.allSettled([
    // ── user-be (16 probes) ──────────────────────────────────────────
    httpCheck({ id: 'feat-ube-categories', name: 'user-be: GET Categories', group: 'feature-api', url: `${userBe}/api/categories`, validate: aliveValidator }),
    httpCheck({ id: 'feat-ube-districts', name: 'user-be: GET Districts', group: 'feature-api', url: `${userBe}/api/districts`, validate: aliveValidator }),
    httpCheck({ id: 'feat-ube-complaints-get', name: 'user-be: GET Complaints', group: 'feature-api', url: `${userBe}/api/complaints/get`, validate: aliveValidator }),
    httpCheck({ id: 'feat-ube-badges', name: 'user-be: GET Badges', group: 'feature-api', url: `${userBe}/api/badges`, validate: aliveValidator }),
    httpCheck({ id: 'feat-ube-login', name: 'user-be: POST User Login', group: 'feature-api', url: `${userBe}/api/users/login`, method: 'POST', body: { email: '_MONITOR_TEST_@test.com', password: 'test' }, validate: aliveValidator }),
    httpCheck({ id: 'feat-ube-register', name: 'user-be: POST User Register', group: 'feature-api', url: `${userBe}/api/users/register`, method: 'POST', body: { name: '_MONITOR_TEST_User', email: '_MONITOR_TEST_@test.com', password: 'testpass123', phoneNumber: '0000000000' }, validate: aliveValidator }),
    httpCheck({ id: 'feat-ube-profile', name: 'user-be: GET User Profile', group: 'feature-api', url: `${userBe}/api/user/profile`, validate: aliveValidator }),
    httpCheck({ id: 'feat-ube-chat', name: 'user-be: GET Chat', group: 'feature-api', url: `${userBe}/api/chat`, validate: aliveValidator }),
    httpCheck({ id: 'feat-ube-feed-trending', name: 'user-be: GET Feed Trending', group: 'feature-api', url: `${userBe}/api/complaints/get/trending`, validate: aliveValidator }),
    httpCheck({ id: 'feat-ube-feed-recent', name: 'user-be: GET Feed Recent', group: 'feature-api', url: `${userBe}/api/complaints/get/recent`, validate: aliveValidator }),
    httpCheck({ id: 'feat-ube-feed-foryou', name: 'user-be: GET Feed For-You', group: 'feature-api', url: `${userBe}/api/complaints/get/for-you`, validate: aliveValidator }),
    httpCheck({ id: 'feat-ube-feed-heatmap', name: 'user-be: GET Feed Heatmap', group: 'feature-api', url: `${userBe}/api/complaints/get/heatmap`, validate: aliveValidator }),
    httpCheck({ id: 'feat-ube-feed-search', name: 'user-be: GET Feed Search', group: 'feature-api', url: `${userBe}/api/complaints/get/search?q=test`, validate: aliveValidator }),
    httpCheck({ id: 'feat-ube-validate-pin', name: 'user-be: GET Validate PIN', group: 'feature-api', url: `${userBe}/api/complaints/validate-pin?pin=834001`, validate: aliveValidator }),
    httpCheck({ id: 'feat-ube-submit', name: 'user-be: POST Submit Complaint', group: 'feature-api', url: `${userBe}/api/complaints`, method: 'POST', body: {}, validate: aliveValidator }),
    httpCheck({ id: 'feat-ube-logout', name: 'user-be: POST User Logout', group: 'feature-api', url: `${userBe}/api/users/logout`, method: 'POST', validate: aliveValidator }),

    // ── admin-be (25 probes) ─────────────────────────────────────────
    httpCheck({ id: 'feat-abe-auth-login', name: 'admin-be: POST Auth Login', group: 'feature-api', url: `${adminBe}/api/auth/login`, method: 'POST', body: { officialEmail: 'test@test.com', password: 'test', adminType: 'AGENT' }, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-auth-verify', name: 'admin-be: GET Auth Verify', group: 'feature-api', url: `${adminBe}/api/auth/verify`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-super-admins', name: 'admin-be: GET All Admins', group: 'feature-api', url: `${adminBe}/api/super-admin/admins`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-super-complaints', name: 'admin-be: GET Super Complaints', group: 'feature-api', url: `${adminBe}/api/super-admin/complaints`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-super-profile', name: 'admin-be: GET Super Profile', group: 'feature-api', url: `${adminBe}/api/super-admin/profile`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-super-my', name: 'admin-be: GET Super My-Complaints', group: 'feature-api', url: `${adminBe}/api/super-admin/my-complaints`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-state-admins', name: 'admin-be: GET State Admins', group: 'feature-api', url: `${adminBe}/api/state-admin/state-admins`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-state-complaints', name: 'admin-be: GET State Complaints', group: 'feature-api', url: `${adminBe}/api/state-admin/complaints`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-state-my', name: 'admin-be: GET State My-Complaints', group: 'feature-api', url: `${adminBe}/api/state-admin/my-complaints`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-state-municipal', name: 'admin-be: GET State Municipal-Admins', group: 'feature-api', url: `${adminBe}/api/state-admin/municipal-admins`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-muni-agents', name: 'admin-be: GET Municipal All Agents', group: 'feature-api', url: `${adminBe}/api/municipal-admin/all`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-muni-complaints', name: 'admin-be: GET Municipal Complaints', group: 'feature-api', url: `${adminBe}/api/municipal-admin/complaints`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-muni-my', name: 'admin-be: GET Municipal My-Complaints', group: 'feature-api', url: `${adminBe}/api/municipal-admin/my-complaints`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-create-agent', name: 'admin-be: POST Create Agent', group: 'feature-api', url: `${adminBe}/api/municipal-admin/create/agent`, method: 'POST', body: { fullName: '_MONITOR_TEST_Agent', officialEmail: '_monitor_test_agent@test.com', password: 'monitortest123', department: 'INFRASTRUCTURE', municipality: 'Test' }, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-agent-login', name: 'admin-be: POST Agent Login', group: 'feature-api', url: `${adminBe}/api/agent/login`, method: 'POST', body: { officialEmail: 'test@test.com', password: 'test' }, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-agent-me', name: 'admin-be: GET Agent Me', group: 'feature-api', url: `${adminBe}/api/agent/me`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-agent-complaints', name: 'admin-be: GET Agent Complaints', group: 'feature-api', url: `${adminBe}/api/agent/complaints`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-agent-my', name: 'admin-be: GET Agent My-Complaints', group: 'feature-api', url: `${adminBe}/api/agent/my-complaints`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-complaint-list', name: 'admin-be: GET Complaint List', group: 'feature-api', url: `${adminBe}/api/complaints/list`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-complaint-stats', name: 'admin-be: GET Complaint Stats', group: 'feature-api', url: `${adminBe}/api/complaints/stats/overview`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-complaint-all', name: 'admin-be: GET All Complaints', group: 'feature-api', url: `${adminBe}/api/complaints/all-complaints`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-complaint-locs', name: 'admin-be: GET Complaint Locations', group: 'feature-api', url: `${adminBe}/api/complaints/locations`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-complaint-liked', name: 'admin-be: GET Most-Liked', group: 'feature-api', url: `${adminBe}/api/complaints/most-liked`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-autoassign-queue', name: 'admin-be: GET Queue Status', group: 'feature-api', url: `${adminBe}/api/auto-assign/queue-status`, validate: aliveValidator }),
    httpCheck({ id: 'feat-abe-autoassign-poll', name: 'admin-be: GET Polling Status', group: 'feature-api', url: `${adminBe}/api/auto-assign/polling/status`, validate: aliveValidator }),

    // ── comp-queue (6 probes) ────────────────────────────────────────
    httpCheck({ id: 'feat-cq-status', name: 'comp-queue: GET Processing Status', group: 'feature-api', url: `${compQueue}/api/processing/status`, validate: aliveValidator }),
    httpCheck({ id: 'feat-cq-process', name: 'comp-queue: POST Process Single', group: 'feature-api', url: `${compQueue}/api/processing`, method: 'POST', validate: aliveValidator }),
    httpCheck({ id: 'feat-cq-start', name: 'comp-queue: POST Start Polling', group: 'feature-api', url: `${compQueue}/api/processing/start`, method: 'POST', validate: aliveValidator }),
    httpCheck({ id: 'feat-cq-stop', name: 'comp-queue: POST Stop Polling', group: 'feature-api', url: `${compQueue}/api/processing/stop`, method: 'POST', validate: aliveValidator }),
    httpCheck({ id: 'feat-cq-blockchain', name: 'comp-queue: GET Blockchain Queue', group: 'feature-api', url: `${compQueue}/api/auto-assign/blockchain-queue-status`, validate: aliveValidator, severity: 'WARNING' }),
    // Re-start polling after stop test
    httpCheck({ id: 'feat-cq-restart', name: 'comp-queue: POST Restart Polling', group: 'feature-api', url: `${compQueue}/api/processing/start`, method: 'POST', validate: aliveValidator }),
  ]);

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
