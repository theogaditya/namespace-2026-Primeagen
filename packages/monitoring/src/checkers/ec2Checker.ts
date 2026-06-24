import { EC2Client, DescribeInstanceStatusCommand, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { config } from '../config';
import type { CheckResult } from '../types';
import * as net from 'net';
import { exec } from 'child_process';
import * as path from 'path';

export async function runEc2Checks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const ec2 = new EC2Client({
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  });

  // First, discover the instance(s)
  let instanceId: string | null = null;
  let publicIp: string | null = null;

  const descStart = Date.now();
  try {
    const descResp = await ec2.send(new DescribeInstancesCommand({
      Filters: [{ Name: 'instance-state-name', Values: ['running'] }],
    }));

    const instances = descResp.Reservations?.flatMap((r) => r.Instances || []) || [];
    if (instances.length > 0) {
      instanceId = instances[0]!.InstanceId || null;
      publicIp = instances[0]!.PublicIpAddress || null;
    }
  } catch (err: any) {
    results.push({
      id: 'ec2-status', name: 'EC2 Instance Status', group: 'ec2', status: 'DOWN',
      responseTimeMs: Date.now() - descStart,
      message: `Failed to describe instances: ${err.message}`,
      timestamp: new Date().toISOString(), severity: 'CRITICAL',
    });
    return results;
  }

  if (!instanceId) {
    results.push({
      id: 'ec2-status', name: 'EC2 Instance Status', group: 'ec2', status: 'DOWN',
      responseTimeMs: Date.now() - descStart,
      message: 'No running EC2 instances found',
      timestamp: new Date().toISOString(), severity: 'CRITICAL',
    });
    return results;
  }

  // Check 1: Instance status
  const statusStart = Date.now();
  try {
    const statusResp = await ec2.send(new DescribeInstanceStatusCommand({
      InstanceIds: [instanceId],
    }));
    const statuses = statusResp.InstanceStatuses || [];
    if (statuses.length > 0) {
      const s = statuses[0]!;
      const instanceCheck = s.InstanceStatus?.Status;
      const systemCheck = s.SystemStatus?.Status;

      // Check 1: Instance running
      results.push({
        id: 'ec2-status', name: 'EC2 Instance Status', group: 'ec2',
        status: s.InstanceState?.Name === 'running' ? 'UP' : 'DOWN',
        responseTimeMs: Date.now() - statusStart,
        message: `Instance ${instanceId}: ${s.InstanceState?.Name}`,
        timestamp: new Date().toISOString(), severity: 'CRITICAL',
        details: { instanceId, publicIp, state: s.InstanceState?.Name },
      });

      // Check 2: System & instance checks
      const bothPassed = instanceCheck === 'ok' && systemCheck === 'ok';
      results.push({
        id: 'ec2-checks', name: 'EC2 System/Instance Checks', group: 'ec2',
        status: bothPassed ? 'UP' : 'WARNING',
        responseTimeMs: Date.now() - statusStart,
        message: `Instance: ${instanceCheck}, System: ${systemCheck}`,
        timestamp: new Date().toISOString(), severity: 'CRITICAL',
        details: { instanceCheck, systemCheck },
      });
    } else {
      results.push({
        id: 'ec2-status', name: 'EC2 Instance Status', group: 'ec2', status: 'WARNING',
        responseTimeMs: Date.now() - statusStart,
        message: `No status data for ${instanceId} (may be initializing)`,
        timestamp: new Date().toISOString(), severity: 'WARNING',
      });
      results.push({
        id: 'ec2-checks', name: 'EC2 System/Instance Checks', group: 'ec2', status: 'UNKNOWN',
        responseTimeMs: 0, message: 'No status data available',
        timestamp: new Date().toISOString(), severity: 'WARNING',
      });
    }
  } catch (err: any) {
    results.push({
      id: 'ec2-status', name: 'EC2 Instance Status', group: 'ec2', status: 'DOWN',
      responseTimeMs: Date.now() - statusStart,
      message: `Status check failed: ${err.message}`,
      timestamp: new Date().toISOString(), severity: 'CRITICAL',
    });
  }

  // Check 3: SSH reachability (Using actual SSH login)
  let sshSuccessful = false;
  if (publicIp) {
    const sshResult = await sshPing(publicIp);
    sshSuccessful = sshResult.ok;
    results.push({
      id: 'ec2-ssh', name: 'EC2 SSH Reachability', group: 'ec2',
      status: sshResult.ok ? 'UP' : 'DOWN',
      responseTimeMs: sshResult.elapsed,
      message: sshResult.ok ? `Successfully SSHed into ${publicIp}` : `SSH failed: ${sshResult.error}`,
      timestamp: new Date().toISOString(), severity: 'CRITICAL',
      details: { publicIp },
    });
  } else {
    results.push({
      id: 'ec2-ssh', name: 'EC2 SSH Reachability', group: 'ec2', status: 'WARNING',
      responseTimeMs: 0, message: 'No public IP available',
      timestamp: new Date().toISOString(), severity: 'WARNING',
    });
  }

  if (sshSuccessful) {
    for (const r of results) {
      if (r.id !== 'ec2-ssh') {
         r.status = 'UP';
         r.message = '[Overridden by SSH Success] ' + r.message;
      }
    }
  }

  return results;
}

function sshPing(host: string): Promise<{ ok: boolean; elapsed: number; error?: string }> {
  const start = Date.now();
  return new Promise((resolve) => {
    // Resolve the key path relative to the project root
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
