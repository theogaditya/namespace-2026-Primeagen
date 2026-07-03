import axios from 'axios';
import https from 'https';
import type { CheckResult, ServiceGroup, Severity } from '../types';

interface HttpCheckOptions {
  id: string;
  name: string;
  group: ServiceGroup;
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  severity?: Severity;
  /** If true, skip retries -used for bulk feature probes to keep cycles fast */
  noRetry?: boolean;
  /** Mark UP responses slower than this as "⚠️ Slow" without failing them */
  slowThresholdMs?: number;
  validate?: (status: number, data: any) => string | null;
}

const HTTP_RETRY_COUNT = 2;       // retries for critical health checks
const HTTP_RETRY_DELAY_MS = 1500;
const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_SLOW_THRESHOLD = 8_000; // 8s -responses above this get a ⚠️ Slow tag

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function httpCheck(opts: HttpCheckOptions): Promise<CheckResult> {
  const method = opts.method || 'GET';
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT;
  const slowThreshold = opts.slowThresholdMs ?? DEFAULT_SLOW_THRESHOLD;
  let maxAttempts = opts.noRetry ? 1 : HTTP_RETRY_COUNT + 1;

  let lastError: string | null = null;
  let lastHttpStatus: number | undefined;
  let totalElapsed = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await sleep(HTTP_RETRY_DELAY_MS);

    const start = Date.now();
    try {
      const resp = await axios({
        method,
        url: opts.url,
        headers: opts.headers || {},
        data: opts.body,
        timeout,
        validateStatus: () => true,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      });

      const elapsed = Date.now() - start;
      totalElapsed += elapsed;

      const validator = opts.validate || defaultValidator;
      const error = validator(resp.status, resp.data);

      if (!error) {
        // ── Response Time Grading ──────────────────────────────
        const isSlow = elapsed > slowThreshold;
        const retryNote = attempt > 0
          ? ` (recovered after ${attempt} retr${attempt === 1 ? 'y' : 'ies'})`
          : '';
        const slowNote = isSlow ? `⚠️ Slow (${elapsed}ms) -` : '';

        return {
          id: opts.id,
          name: opts.name,
          group: opts.group,
          status: 'UP',
          responseTimeMs: elapsed,
          message: `${slowNote}${method} ${resp.status} OK${retryNote}`,
          timestamp: new Date().toISOString(),
          severity: opts.severity || 'CRITICAL',
          details: { httpStatus: resp.status, attempts: attempt + 1, slow: isSlow },
        };
      }

      lastError = error;
      lastHttpStatus = resp.status;
    } catch (err: any) {
      const elapsed = Date.now() - start;
      totalElapsed += elapsed;

      if (err.code === 'ECONNABORTED') {
        lastError = `Timeout after ${timeout}ms`;
      } else if (err.code === 'ECONNRESET') {
        lastError = 'Connection reset by peer (ECONNRESET)';
        // Force a retry on ECONNRESET even if noRetry is set to true,
        // as this usually indicates a server-side TCP timeout on a slow DB query.
        if (opts.noRetry && attempt === 0) {
          maxAttempts = 2; // Allow one more try just for this error
        }
      } else {
        lastError = err.message || 'Connection failed';
      }
    }
  }

  // All attempts exhausted
  return {
    id: opts.id,
    name: opts.name,
    group: opts.group,
    status: 'DOWN',
    responseTimeMs: totalElapsed,
    message: maxAttempts > 1
      ? `${lastError} (failed after ${maxAttempts} attempts)`
      : `${lastError}`,
    timestamp: new Date().toISOString(),
    severity: opts.severity || 'CRITICAL',
    details: { httpStatus: lastHttpStatus, attempts: maxAttempts },
  };
}

function defaultValidator(status: number, _data: any): string | null {
  if (status >= 500) return `Server error: ${status}`;
  return null;
}

/** Validate response is 200 and contains success: true */
export function successJsonValidator(status: number, data: any): string | null {
  if (status >= 500) return `Server error: ${status}`;
  if (status !== 200) return `Unexpected status: ${status}`;
  if (data && data.success === false) return `API returned success: false`;
  return null;
}

/** Validate response is not 5xx (401/403/404 = server is alive, just auth required or route missing) */
export function aliveValidator(status: number, _data: any): string | null {
  if (status >= 500) return `Server error: ${status}`;
  return null;
}

/** Validate 200 OK gracefully (fallback to aliveValidator for FE) */
export function okValidator(status: number, _data: any): string | null {
  if (status >= 500) return `Server error: ${status}`;
  if (status !== 200 && status !== 404) return `Expected 200/404, got ${status}`;
  return null;
}
