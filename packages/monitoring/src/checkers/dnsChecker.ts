import { config } from '../config';
import type { CheckResult } from '../types';

// Domains to verify via Cloudflare DNS
const BACKEND_DOMAINS = [
  'iit-bbsr-swaraj-user-be.adityahota.online',
  'iit-bbsr-swaraj-admin-be.adityahota.online',
  'iit-bbsr-swaraj-comp-queue.adityahota.online',
];

/**
 * DNS checks using Cloudflare API for authoritative records.
 */
export async function runDnsChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const cfIps: Record<string, string[]> = {};

  for (const domain of BACKEND_DOMAINS) {
    const start = Date.now();
    try {
      const addresses = await resolveViaCloudflareDns(domain);
      cfIps[domain] = addresses;
      results.push({
        id: `dns-${domain.replace(/\./g, '-')}`,
        name: `DNS: ${domain}`,
        group: 'dns-tls',
        status: addresses.length > 0 ? 'UP' : 'DOWN',
        responseTimeMs: Date.now() - start,
        message: addresses.length > 0
          ? `Cloudflare DNS resolved to: ${addresses.join(', ')}`
          : 'No A records found',
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
        message: `Cloudflare DNS lookup failed: ${err.message}`,
        timestamp: new Date().toISOString(),
        severity: 'WARNING',
      });
    }
  }

  // Cross-check: all backends should resolve to the same IPs
  const allIpSets = BACKEND_DOMAINS.map((d) => (cfIps[d] || []).sort().join(','));
  const nonEmpty = allIpSets.filter(Boolean);
  const consistent = nonEmpty.length > 0 && new Set(nonEmpty).size <= 1;

  results.push({
    id: 'dns-ip-crosscheck',
    name: 'DNS → EC2 IP Cross-Check',
    group: 'dns-tls',
    status: nonEmpty.length === 0 ? 'WARNING' : consistent ? 'UP' : 'WARNING',
    responseTimeMs: 0,
    message: nonEmpty.length === 0
      ? 'No domains resolved -cannot cross-check IPs'
      : consistent
        ? `All backends resolve to consistent IPs via Cloudflare`
        : `Inconsistent IPs detected: ${JSON.stringify(Object.fromEntries(BACKEND_DOMAINS.map((d) => [d, cfIps[d] || []])))}`,
    timestamp: new Date().toISOString(),
    severity: 'NOTICE',
    details: { resolvedIps: cfIps },
  });

  return results;
}

/**
 * Resolve a domain's A records using the Cloudflare DNS API (authoritative).
 */
async function resolveViaCloudflareDns(domain: string): Promise<string[]> {
  const zoneId = config.cloudflare.zoneId;
  const apiToken = config.cloudflare.apiToken;
  const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=A&name=${domain}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Cloudflare API error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json() as { success: boolean; result: Array<{ content: string }> };
  if (!json.success) {
    throw new Error('Cloudflare API returned success=false');
  }

  return json.result.map((r) => r.content);
}
