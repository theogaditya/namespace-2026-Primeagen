import { EC2Client, DescribeInstanceStatusCommand, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { config } from '../config';
import type { CheckResult } from '../types';
import * as net from 'net';

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

  // Check 3: SSH reachability (TCP probe to port 22)
  if (publicIp) {
    const sshResult = await tcpProbe(publicIp, 22, 5000);
    results.push({
      id: 'ec2-ssh', name: 'EC2 SSH Reachability', group: 'ec2',
      status: sshResult.ok ? 'UP' : 'WARNING',
      responseTimeMs: sshResult.elapsed,
      message: sshResult.ok ? `SSH port 22 open on ${publicIp}` : `SSH port 22 unreachable: ${sshResult.error}`,
      timestamp: new Date().toISOString(), severity: 'WARNING',
      details: { publicIp },
    });
  } else {
    results.push({
      id: 'ec2-ssh', name: 'EC2 SSH Reachability', group: 'ec2', status: 'WARNING',
      responseTimeMs: 0, message: 'No public IP available',
      timestamp: new Date().toISOString(), severity: 'WARNING',
    });
  }

  return results;
}

function tcpProbe(host: string, port: number, timeout: number): Promise<{ ok: boolean; elapsed: number; error?: string }> {
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const done = (ok: boolean, error?: string) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve({ ok, elapsed: Date.now() - start, error });
    };

    socket.setTimeout(timeout);
    socket.on('connect', () => done(true));
    socket.on('timeout', () => done(false, 'Timeout'));
    socket.on('error', (err) => done(false, err.message));
    socket.connect(port, host);
  });
}
