import { config } from '../config';
import { httpCheck, aliveValidator, okValidator } from './httpChecker';
import type { CheckResult } from '../types';

/**
 * 14 frontend API probes -Next.js /api route handlers for user-fe and admin-fe.
 */
export async function runFrontendProbes(): Promise<CheckResult[]> {
  const { userFe, adminFe } = config.urls;

  const checks = await Promise.allSettled([
    // ── user-fe (9 probes) ────────────────────────────────────────────
    httpCheck({ id: 'fe-ufe-health', name: 'user-fe: GET Health', group: 'frontend-api', url: `${userFe}/api/health`, validate: okValidator, timeout: 20000 }),
    httpCheck({ id: 'fe-ufe-complaint-get', name: 'user-fe: GET Complaint Get', group: 'frontend-api', url: `${userFe}/api/complaint/get`, validate: aliveValidator, timeout: 20000 }),
    httpCheck({ id: 'fe-ufe-trending', name: 'user-fe: GET Feed Trending', group: 'frontend-api', url: `${userFe}/api/complaint/feed/trending`, validate: aliveValidator, timeout: 20000 }),
    httpCheck({ id: 'fe-ufe-recent', name: 'user-fe: GET Feed Recent', group: 'frontend-api', url: `${userFe}/api/complaint/feed/recent`, validate: aliveValidator, timeout: 20000 }),
    httpCheck({ id: 'fe-ufe-badges', name: 'user-fe: GET Badges', group: 'frontend-api', url: `${userFe}/api/badges`, validate: aliveValidator, timeout: 20000 }),
    httpCheck({ id: 'fe-ufe-badges-stats', name: 'user-fe: GET Badges Stats', group: 'frontend-api', url: `${userFe}/api/badges/stats`, validate: aliveValidator, timeout: 20000 }),
    httpCheck({ id: 'fe-ufe-image-validate', name: 'user-fe: GET Image Validate', group: 'frontend-api', url: `${userFe}/api/image/validate`, validate: aliveValidator, timeout: 20000 }),

    httpCheck({ id: 'fe-ufe-categories', name: 'user-fe: GET Categories', group: 'frontend-api', url: `${userFe}/api/categories`, validate: aliveValidator, timeout: 20000 }),
    httpCheck({ id: 'fe-ufe-districts', name: 'user-fe: GET Districts', group: 'frontend-api', url: `${userFe}/api/districts`, validate: aliveValidator, timeout: 20000 }),
    httpCheck({ id: 'fe-ufe-chat', name: 'user-fe: GET Chat proxy', group: 'frontend-api', url: `${userFe}/api/chat`, validate: aliveValidator, timeout: 20000 }),

    // ── admin-fe (5 probes) ───────────────────────────────────────────
    httpCheck({ id: 'fe-afe-health', name: 'admin-fe: GET Health', group: 'frontend-api', url: `${adminFe}/api/health`, validate: okValidator, timeout: 15000 }),
    httpCheck({ id: 'fe-afe-auth-verify', name: 'admin-fe: GET Auth Verify', group: 'frontend-api', url: `${adminFe}/api/auth/verify`, validate: aliveValidator, timeout: 15000 }),
    httpCheck({ id: 'fe-afe-complaints-all', name: 'admin-fe: GET Complaints All', group: 'frontend-api', url: `${adminFe}/api/complaints/all`, validate: aliveValidator, timeout: 15000 }),
    httpCheck({ id: 'fe-afe-complaints-locs', name: 'admin-fe: GET Complaints Locations', group: 'frontend-api', url: `${adminFe}/api/complaints/locations`, validate: aliveValidator, timeout: 15000 }),
    httpCheck({ id: 'fe-afe-complaints-liked', name: 'admin-fe: GET Most-Liked', group: 'frontend-api', url: `${adminFe}/api/complaints/most-liked`, validate: aliveValidator, timeout: 15000 }),
  ]);

  return checks.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : {
        id: 'fe-unknown',
        name: 'Frontend Probe Error',
        group: 'frontend-api' as const,
        status: 'DOWN' as const,
        responseTimeMs: 0,
        message: (r as PromiseRejectedResult).reason?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
        severity: 'CRITICAL' as const,
      }
  );
}
