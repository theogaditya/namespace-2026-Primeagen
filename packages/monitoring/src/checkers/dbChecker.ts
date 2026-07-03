import axios from 'axios';
import { config } from '../config';
import type { CheckResult } from '../types';

/**
 * Database health checks -parsed from backend /api/health endpoints + direct TCP probe.
 */
export async function runDbChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // Check 1: DB via user-be /api/health
  const ube = await checkDbViaHealthEndpoint(
    'db-via-ube',
    'NeonDB via user-be',
    `${config.urls.userBe}/api/health`
  );
  results.push(ube);

  // Check 2: DB via admin-be /api/health
  const abe = await checkDbViaHealthEndpoint(
    'db-via-abe',
    'NeonDB via admin-be',
    `${config.urls.adminBe}/api/health`
  );
  results.push(abe);

  // Check 3: Direct TCP probe to NeonDB (Disabled due to Neon SNI proxy rejecting raw TCP)
  const tcpResult = await tcpProbeDb();
  results.push(tcpResult);

  return results;
}

async function checkDbViaHealthEndpoint(
  id: string,
  name: string,
  url: string
): Promise<CheckResult> {
  const start = Date.now();
  try {
    const resp = await axios.get(url, { timeout: 10000, validateStatus: () => true });
    const elapsed = Date.now() - start;
    const data = resp.data;

    // Parse database status from health endpoint
    if (data?.database === 'ok' || data?.database === 'connected' || data?.status === 'OK') {
      return {
        id, name, group: 'database', status: 'UP', responseTimeMs: elapsed,
        message: 'Database connected', timestamp: new Date().toISOString(),
        severity: 'CRITICAL', details: data,
      };
    } else if (resp.status === 200) {
      // Health endpoint is up but maybe db field is different
      const dbStatus = data?.database || data?.db || 'unknown';
      return {
        id, name, group: 'database',
        status: dbStatus === 'ok' || dbStatus === 'connected' ? 'UP' : 'WARNING',
        responseTimeMs: elapsed,
        message: `Database status: ${dbStatus}`,
        timestamp: new Date().toISOString(), severity: 'CRITICAL', details: data,
      };
    } else {
      return {
        id, name, group: 'database', status: 'DOWN', responseTimeMs: elapsed,
        message: `Health endpoint returned ${resp.status}`,
        timestamp: new Date().toISOString(), severity: 'CRITICAL',
      };
    }
  } catch (err: any) {
    return {
      id, name, group: 'database', status: 'DOWN', responseTimeMs: Date.now() - start,
      message: err.message || 'Health endpoint unreachable',
      timestamp: new Date().toISOString(), severity: 'CRITICAL',
    };
  }
}

async function tcpProbeDb(): Promise<CheckResult> {
  const start = Date.now();
  const net = await import('net');

  return new Promise((resolve) => {
    // NeonDB typically uses Postgres port 5432 on their hosts
    // We check connectivity via a TCP connection attempt
    // The host is extracted from DATABASE_URL if available, or we check via health endpoints
    const socket = new net.Socket();
    const timeout = 5000;
    let resolved = false;

    const done = (status: 'UP' | 'DOWN' | 'WARNING', message: string, severity: 'CRITICAL' | 'WARNING' | 'NOTICE' = 'CRITICAL') => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve({
        id: 'db-tcp-probe',
        name: 'NeonDB TCP Probe',
        group: 'database',
        status,
        responseTimeMs: Date.now() - start,
        message,
        timestamp: new Date().toISOString(),
        severity,
      });
    };

    socket.setTimeout(timeout);
    socket.on('connect', () => done('UP', 'TCP connection to NeonDB successful'));
    socket.on('timeout', () => done('WARNING', 'TCP connection timed out (SNI proxy drop)', 'NOTICE'));
    socket.on('error', (err) => done('WARNING', `TCP probe failed: ${err.message || 'Connection abruptly closed by SNI proxy'}`, 'NOTICE'));

    // NeonDB hosts -try connecting to the standard postgres port
    let host = 'ep-curly-recipe-a10u19h8.ap-southeast-1.aws.neon.tech';
    if (config.neonDbUrl) {
      try {
        const url = new URL(config.neonDbUrl);
        host = url.hostname;
      } catch (e) { }
    }
    socket.connect(5432, host);
  });
}
