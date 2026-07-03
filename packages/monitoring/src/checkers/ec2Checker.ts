import { config } from '../config';
import type { CheckResult } from '../types';
import { exec } from 'child_process';
import * as path from 'path';

/**
 * EC2 checks using only direct SSH -no AWS SDK / no AWS credentials needed.
 * Instance IPs are read from EC2_INSTANCE_IPS in .env (comma-separated).
 */
export async function runEc2Checks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const ips = config.ec2.instanceIps;
  const now = new Date().toISOString();

  if (ips.length === 0) {
    results.push({
      id: 'ec2-status', name: 'EC2 Instance Status', group: 'ec2',
      status: 'WARNING', responseTimeMs: 0,
      message: 'EC2_INSTANCE_IPS not set in .env -skipping EC2 checks',
      timestamp: now, severity: 'WARNING',
    });
    results.push({
      id: 'ec2-checks', name: 'EC2 System/Instance Checks', group: 'ec2',
      status: 'UNKNOWN', responseTimeMs: 0,
      message: 'No IPs configured',
      timestamp: now, severity: 'WARNING',
    });
    results.push({
      id: 'ec2-ssh', name: 'EC2 SSH Reachability', group: 'ec2',
      status: 'UNKNOWN', responseTimeMs: 0,
      message: 'No IPs configured',
      timestamp: now, severity: 'WARNING',
    });
    return results;
  }

  // Use the first IP as the primary instance (typical single-instance setup)
  const primaryIp = ips[0];

  // Check 1 + 2: SSH ping doubles as both "instance running" and "system check"
  const sshResult = await sshPing(primaryIp);

  results.push({
    id: 'ec2-status', name: 'EC2 Instance Status', group: 'ec2',
    status: sshResult.ok ? 'UP' : 'DOWN',
    responseTimeMs: sshResult.elapsed,
    message: sshResult.ok
      ? `Instance reachable via SSH at ${primaryIp}`
      : `Instance unreachable: ${sshResult.error}`,
    timestamp: new Date().toISOString(), severity: 'CRITICAL',
    details: { publicIp: primaryIp, allIps: ips },
  });

  results.push({
    id: 'ec2-checks', name: 'EC2 System/Instance Checks', group: 'ec2',
    status: sshResult.ok ? 'UP' : 'DOWN',
    responseTimeMs: sshResult.elapsed,
    message: sshResult.ok
      ? `SSH handshake OK -instance healthy`
      : `SSH failed: ${sshResult.error}`,
    timestamp: new Date().toISOString(), severity: 'CRITICAL',
    details: { publicIp: primaryIp },
  });

  results.push({
    id: 'ec2-ssh', name: 'EC2 SSH Reachability', group: 'ec2',
    status: sshResult.ok ? 'UP' : 'DOWN',
    responseTimeMs: sshResult.elapsed,
    message: sshResult.ok
      ? `SSH OK: ${primaryIp}`
      : `SSH failed: ${sshResult.error}`,
    timestamp: new Date().toISOString(), severity: 'CRITICAL',
    details: { publicIp: primaryIp },
  });

  return results;
}

function sshPing(host: string): Promise<{ ok: boolean; elapsed: number; error?: string }> {
  const start = Date.now();
  return new Promise((resolve) => {
    const keyPath = config.ec2Ssh.keyPath.startsWith('/')
      ? config.ec2Ssh.keyPath
      : path.join(process.cwd(), config.ec2Ssh.keyPath);

    const sshCmd = `ssh -i ${keyPath} -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o BatchMode=yes ${config.ec2Ssh.user}@${host} "echo ok"`;

    exec(sshCmd, { timeout: 15000 }, (error, stdout, stderr) => {
      const elapsed = Date.now() - start;
      if (error && !stdout) {
        resolve({ ok: false, elapsed, error: error.message || stderr || 'SSH command failed' });
        return;
      }
      resolve({ ok: true, elapsed });
    });
  });
}

