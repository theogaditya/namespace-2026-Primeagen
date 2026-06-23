import * as dns from 'dns';
import { config } from '../config';
import type { CheckResult } from '../types';

/**
 * DNS resolution checks for all monitored domains.
 */
export async function runDnsChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const resolvedIps: Record<string, string[]> = {};

  for (const domain of config.domains) {
    const start = Date.now();
    try {
      const addresses = await dnsResolve(domain);
      resolvedIps[domain] = addresses;
      results.push({
        id: `dns-${domain.replace(/\./g, '-')}`,
        name: `DNS: ${domain}`,
        group: 'dns-tls',
        status: addresses.length > 0 ? 'UP' : 'DOWN',
        responseTimeMs: Date.now() - start,
        message: addresses.length > 0
          ? `Resolved to: ${addresses.join(', ')}`
          : 'No addresses returned',
        timestamp: new Date().toISOString(),
        severity: 'NOTICE',
        details: { addresses },
      });
    } catch (err: any) {
      results.push({
        id: `dns-${domain.replace(/\./g, '-')}`,
        name: `DNS: ${domain}`,
        group: 'dns-tls',
        status: 'DOWN',
        responseTimeMs: Date.now() - start,
        message: `DNS resolution failed: ${err.message}`,
        timestamp: new Date().toISOString(),
        severity: 'WARNING',
      });
    }
  }

  // Cross-check: all backend domains should resolve to the same EC2 IP
  const backendDomains = config.domains.filter((d) => d !== 'redis-swaraj.adityahota.online' && d !== 'cat-ani.adityahota.online');
  const allIps = new Set<string>();
  backendDomains.forEach((d) => {
    (resolvedIps[d] || []).forEach((ip) => allIps.add(ip));
  });

  const consistent = allIps.size <= 1;
  results.push({
    id: 'dns-ip-crosscheck',
    name: 'DNS → EC2 IP Cross-Check',
    group: 'dns-tls',
    status: consistent ? 'UP' : 'WARNING',
    responseTimeMs: 0,
    message: consistent
      ? `All backends resolve to: ${[...allIps].join(', ') || 'N/A'}`
      : `Inconsistent IPs detected: ${JSON.stringify(Object.fromEntries(backendDomains.map((d) => [d, resolvedIps[d] || []])))}`,
    timestamp: new Date().toISOString(),
    severity: 'NOTICE',
    details: { resolvedIps },
  });

  return results;
}

function dnsResolve(domain: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    dns.resolve4(domain, (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses);
    });
  });
}
