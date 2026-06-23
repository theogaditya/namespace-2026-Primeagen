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
  // Validate response — return null if OK, error message if not
  validate?: (status: number, data: any) => string | null;
}

export async function httpCheck(opts: HttpCheckOptions): Promise<CheckResult> {
  const start = Date.now();
  const method = opts.method || 'GET';
  const timeout = opts.timeout || 10000;

  try {
    const resp = await axios({
      method,
      url: opts.url,
      headers: opts.headers || {},
      data: opts.body,
      timeout,
      validateStatus: () => true, // don't throw on non-2xx
      httpsAgent: new https.Agent({ rejectUnauthorized: false }), // Ignore expired certs
    });

    const elapsed = Date.now() - start;
    const validator = opts.validate || defaultValidator;
    const error = validator(resp.status, resp.data);

    if (error) {
      return {
        id: opts.id,
        name: opts.name,
        group: opts.group,
        status: 'DOWN',
        responseTimeMs: elapsed,
        message: error,
        timestamp: new Date().toISOString(),
        severity: opts.severity || 'CRITICAL',
        details: { httpStatus: resp.status },
      };
    }

    return {
      id: opts.id,
      name: opts.name,
      group: opts.group,
      status: 'UP',
      responseTimeMs: elapsed,
      message: `${method} ${resp.status} OK`,
      timestamp: new Date().toISOString(),
      severity: opts.severity || 'CRITICAL',
      details: { httpStatus: resp.status },
    };
  } catch (err: any) {
    return {
      id: opts.id,
      name: opts.name,
      group: opts.group,
      status: 'DOWN',
      responseTimeMs: Date.now() - start,
      message: err.code === 'ECONNABORTED' ? 'Timeout' : (err.message || 'Connection failed'),
      timestamp: new Date().toISOString(),
      severity: opts.severity || 'CRITICAL',
    };
  }
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
  // We accept 404 for frontends because some routes are just missing but the Next instance is UP
  if (status >= 500) return `Server error: ${status}`;
  if (status !== 200 && status !== 404) return `Expected 200/404, got ${status}`;
  return null;
}
