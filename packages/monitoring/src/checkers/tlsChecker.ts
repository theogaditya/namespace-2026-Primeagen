import * as tls from 'tls';
import { config } from '../config';
import type { CheckResult } from '../types';

/**
 * TLS certificate expiry checks for all HTTPS domains.
 */
export async function runTlsChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const httpsDomains = config.domains.filter((d) => d !== 'redis-swaraj.adityahota.online');

  for (const domain of httpsDomains) {
    const result = await checkCertExpiry(domain);
    results.push(result);
  }

  return results;
}

function checkCertExpiry(domain: string): Promise<CheckResult> {
  const start = Date.now();

  return new Promise((resolve) => {
    const socket = tls.connect(443, domain, { servername: domain, timeout: 5000 }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();

      if (!cert || !cert.valid_to) {
        resolve({
          id: `tls-${domain.replace(/\./g, '-')}`,
          name: `TLS: ${domain}`,
          group: 'dns-tls',
          status: 'WARNING',
          responseTimeMs: Date.now() - start,
          message: 'Could not read certificate',
          timestamp: new Date().toISOString(),
          severity: 'NOTICE',
        });
        return;
      }

      const expiry = new Date(cert.valid_to);
      const now = new Date();
      const daysLeft = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isWarning = daysLeft < config.tlsExpiryWarnDays;
      const isExpired = daysLeft < 0;

      resolve({
        id: `tls-${domain.replace(/\./g, '-')}`,
        name: `TLS: ${domain}`,
        group: 'dns-tls',
        status: isExpired ? 'DOWN' : isWarning ? 'WARNING' : 'UP',
        responseTimeMs: Date.now() - start,
        message: isExpired
          ? `Certificate EXPIRED ${Math.abs(daysLeft)} days ago`
          : `Certificate valid for ${daysLeft} days (expires ${expiry.toISOString().split('T')[0]})`,
        timestamp: new Date().toISOString(),
        severity: isExpired ? 'CRITICAL' : 'NOTICE',
        details: { validTo: cert.valid_to, daysLeft, issuer: cert.issuer?.O },
      });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({
        id: `tls-${domain.replace(/\./g, '-')}`,
        name: `TLS: ${domain}`,
        group: 'dns-tls',
        status: 'DOWN',
        responseTimeMs: Date.now() - start,
        message: 'TLS connection timed out',
        timestamp: new Date().toISOString(),
        severity: 'WARNING',
      });
    });

    socket.on('error', (err) => {
      resolve({
        id: `tls-${domain.replace(/\./g, '-')}`,
        name: `TLS: ${domain}`,
        group: 'dns-tls',
        status: 'DOWN',
        responseTimeMs: Date.now() - start,
        message: `TLS error: ${err.message}`,
        timestamp: new Date().toISOString(),
        severity: 'WARNING',
      });
    });
  });
}
