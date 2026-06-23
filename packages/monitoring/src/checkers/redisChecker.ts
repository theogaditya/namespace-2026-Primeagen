import Redis from 'ioredis';
import { config } from '../config';
import type { CheckResult } from '../types';

const QUEUE_KEYS = [
  'user_queue',
  'complaint_queue',
  'processed_complaint_queue',
  'blockchain_queue',
  'assign_queue',
];

export async function runRedisChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  let redis: Redis | null = null;

  // Check 1: Redis PING
  const pingStart = Date.now();
  try {
    redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      connectTimeout: 5000,
      lazyConnect: true,
    });
    await redis.connect();
    const pong = await redis.ping();

    if (pong === 'PONG') {
      results.push({
        id: 'redis-ping',
        name: 'Redis PING',
        group: 'redis',
        status: 'UP',
        responseTimeMs: Date.now() - pingStart,
        message: 'PONG received',
        timestamp: new Date().toISOString(),
        severity: 'CRITICAL',
      });
    } else {
      results.push({
        id: 'redis-ping',
        name: 'Redis PING',
        group: 'redis',
        status: 'DOWN',
        responseTimeMs: Date.now() - pingStart,
        message: `Unexpected response: ${pong}`,
        timestamp: new Date().toISOString(),
        severity: 'CRITICAL',
      });
    }

    // Check 2: Queue backlog monitoring
    let totalBacklog = 0;
    const queueDetails: Record<string, number> = {};

    for (const key of QUEUE_KEYS) {
      try {
        const len = await redis.llen(key);
        queueDetails[key] = len;
        totalBacklog += len;
      } catch {
        queueDetails[key] = -1;
      }
    }

    const isBacklog = totalBacklog > config.queueBacklogThreshold;
    results.push({
      id: 'redis-queues',
      name: 'Redis Queue Backlog',
      group: 'redis',
      status: isBacklog ? 'WARNING' : 'UP',
      responseTimeMs: Date.now() - pingStart,
      message: isBacklog
        ? `Queue backlog: ${totalBacklog} (threshold: ${config.queueBacklogThreshold})`
        : `Total queue length: ${totalBacklog}`,
      timestamp: new Date().toISOString(),
      severity: 'WARNING',
      details: queueDetails,
    });
  } catch (err: any) {
    results.push({
      id: 'redis-ping',
      name: 'Redis PING',
      group: 'redis',
      status: 'DOWN',
      responseTimeMs: Date.now() - pingStart,
      message: err.message || 'Redis connection failed',
      timestamp: new Date().toISOString(),
      severity: 'CRITICAL',
    });
    results.push({
      id: 'redis-queues',
      name: 'Redis Queue Backlog',
      group: 'redis',
      status: 'DOWN',
      responseTimeMs: 0,
      message: 'Cannot check queues — Redis down',
      timestamp: new Date().toISOString(),
      severity: 'WARNING',
    });
  } finally {
    if (redis) {
      try { await redis.quit(); } catch { /* ignore */ }
    }
  }

  return results;
}
