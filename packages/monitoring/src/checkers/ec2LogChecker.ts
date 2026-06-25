import { exec } from 'child_process';
import * as path from 'path';
import { config } from '../config';
import type { CheckResult } from '../types';

// Services we want logs from on the EC2 instance
const EC2_SERVICES = [
  { name: 'user-be',    logCmd: 'sudo journalctl -u user-be.service    --no-pager -n 100 2>/dev/null || echo "No logs found for user-be.service"' },
  { name: 'admin-be',   logCmd: 'sudo journalctl -u admin-be.service   --no-pager -n 100 2>/dev/null || echo "No logs found for admin-be.service"' },
  { name: 'comp-queue', logCmd: 'sudo journalctl -u comp-queue.service --no-pager -n 100 2>/dev/null || echo "No logs found for comp-queue.service"' },
  { name: 'self',       logCmd: 'sudo journalctl -u self.service       --no-pager -n 100 2>/dev/null || echo "No logs found for self.service"' },
  { name: 'system',     logCmd: 'top -b -n 1 | head -n 50' },
];

// Cache of last fetched logs
let cachedLogs: Record<string, { logs: string; timestamp: string; error?: string }> = {};

export function getCachedLogs(): Record<string, { logs: string; timestamp: string; error?: string }> {
  return cachedLogs;
}

/**
 * Fetch logs from the EC2 instance via SSH for all deployed backends.
 */
export async function fetchEc2Logs(publicIp: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const svc of EC2_SERVICES) {
    const start = Date.now();
    try {
      const logs = await sshExec(publicIp, svc.logCmd);
      cachedLogs[svc.name] = {
        logs: logs.substring(0, 10000), // Cap at 10KB per service
        timestamp: new Date().toISOString(),
      };
      results.push({
        id: `ec2-logs-${svc.name}`,
        name: `EC2 Logs: ${svc.name}`,
        group: 'ec2',
        status: 'UP',
        responseTimeMs: Date.now() - start,
        message: `Retrieved ${logs.length} chars of logs`,
        timestamp: new Date().toISOString(),
        severity: 'NOTICE',
        details: { preview: logs.substring(0, 200) },
      });
    } catch (err: any) {
      cachedLogs[svc.name] = {
        logs: '',
        timestamp: new Date().toISOString(),
        error: err.message,
      };
      results.push({
        id: `ec2-logs-${svc.name}`,
        name: `EC2 Logs: ${svc.name}`,
        group: 'ec2',
        status: 'WARNING',
        responseTimeMs: Date.now() - start,
        message: `Failed to fetch logs: ${err.message}`,
        timestamp: new Date().toISOString(),
        severity: 'NOTICE',
      });
    }
  }

  return results;
}

function sshExec(host: string, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Resolve the key path relative to the project root
    const keyPath = config.ec2Ssh.keyPath.startsWith('/')
      ? config.ec2Ssh.keyPath
      : path.join(process.cwd(), config.ec2Ssh.keyPath);

    const sshCmd = `ssh -i ${keyPath} -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o BatchMode=yes ${config.ec2Ssh.user}@${host} "${command.replace(/"/g, '\\"')}"`;

    exec(sshCmd, { timeout: 30000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error && !stdout) {
        reject(new Error(error.message || stderr || 'SSH command failed'));
        return;
      }
      resolve(stdout || stderr || '');
    });
  });
}
