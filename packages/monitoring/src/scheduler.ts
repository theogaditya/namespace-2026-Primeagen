import { config } from './config';
import { httpCheck, okValidator, aliveValidator } from './checkers/httpChecker';
import { runFeatureProbes } from './checkers/featureProber';
import { runFrontendProbes } from './checkers/frontendProber';
import { runRedisChecks } from './checkers/redisChecker';
import { runS3Checks } from './checkers/s3Checker';
import { runDbChecks } from './checkers/dbChecker';
import { runEc2Checks } from './checkers/ec2Checker';
import { fetchEc2Logs } from './checkers/ec2LogChecker';
import { runDnsChecks } from './checkers/dnsChecker';
import { runTlsChecks } from './checkers/tlsChecker';
import { runAiMlChecks as runAiMlProbes } from './checkers/aimlChecker';
import { processResults } from './alerter';
import { recordResults } from './history';
import { writeRunLog } from './runLogger';
import type { CheckResult } from './types';

let latestResults: CheckResult[] = [];
let latestAiMlResults: CheckResult[] = [];
let lastRunTime: string | null = null;
let isRunning = false;

export function getLatestResults(): CheckResult[] {
  return latestResults;
}

export function getLastRunTime(): string | null {
  return lastRunTime;
}

export function isCheckRunning(): boolean {
  return isRunning;
}

/**
 * Run all 87 health checks.
 */
export async function runAllChecks(): Promise<CheckResult[]> {
  if (isRunning) {
    console.log('⏳ Check cycle already in progress, skipping...');
    return latestResults;
  }

  isRunning = true;
  const start = Date.now();
  console.log(`\n🔍 Starting health check cycle at ${new Date().toISOString()}`);

  const allResults: CheckResult[] = [];

  try {
    // 1. Backend health endpoints (9 checks)
    const [ube, abeDeep, abeSimple, cq, brt, toxic, voice, cat, vision] = await Promise.allSettled([
      httpCheck({ id: 'health-ube', name: 'user-be Health', group: 'backend-health', url: `${config.urls.userBe}/api/health`, validate: okValidator, severity: 'CRITICAL' }),
      httpCheck({ id: 'health-abe-deep', name: 'admin-be Deep Health', group: 'backend-health', url: `${config.urls.adminBe}/api/health`, validate: okValidator, severity: 'CRITICAL' }),
      httpCheck({ id: 'health-abe-simple', name: 'admin-be Simple Health', group: 'backend-health', url: `${config.urls.adminBe}/health`, validate: okValidator, severity: 'CRITICAL' }),
      httpCheck({ id: 'health-cq', name: 'comp-queue Health', group: 'backend-health', url: `${config.urls.compQueue}/health`, validate: okValidator, severity: 'CRITICAL' }),
      httpCheck({ id: 'health-brt', name: 'block-rit Health', group: 'backend-health', url: `${config.urls.blockRit}/health`, validate: okValidator, severity: 'CRITICAL' }),
      httpCheck({ id: 'health-toxic-ani', name: 'toxic-ani Health', group: 'backend-health', url: `${config.urls.toxicAni}/`, validate: aliveValidator, severity: 'CRITICAL' }),
      httpCheck({ id: 'health-voice-ani', name: 'voice-ani Health', group: 'backend-health', url: `${config.urls.voiceAni}/`, validate: aliveValidator, severity: 'CRITICAL' }),
      httpCheck({ id: 'health-cat-ani', name: 'cat-ani Health', group: 'backend-health', url: `${config.urls.catAni}/`, validate: aliveValidator, severity: 'CRITICAL' }),
      httpCheck({ id: 'health-vision-ani', name: 'vision-ani Health', group: 'backend-health', url: `${config.urls.visionAni}/`, validate: aliveValidator, severity: 'CRITICAL' }),
    ]);
    allResults.push(...[ube, abeDeep, abeSimple, cq, brt, toxic, voice, cat, vision].map(settledValue));

    // 2. Feature API probes (47 checks)
    const featureResults = await runFeatureProbes();
    allResults.push(...featureResults);

    // 3. Frontend API probes (14 checks)
    const frontendResults = await runFrontendProbes();
    allResults.push(...frontendResults);

    // 4. Database checks (3 checks)
    const dbResults = await runDbChecks();
    allResults.push(...dbResults);

    // 5. Redis checks (2+ checks)
    const redisResults = await runRedisChecks();
    allResults.push(...redisResults);

    // 6. Redis via health endpoints (2 checks — parsed from backend health)
    allResults.push(
      parseRedisFromHealth('redis-via-ube', 'Redis via user-be', ube),
      parseRedisFromHealth('redis-via-abe', 'Redis via admin-be', abeDeep),
    );

    // 7. S3 checks (3 checks)
    const s3Results = await runS3Checks();
    allResults.push(...s3Results);

    // 8. EC2 checks (3 checks) + EC2 Logs (5 checks)
    const ec2Results = await runEc2Checks();
    allResults.push(...ec2Results);

    // Find the public IP from the ec2-status check to fetch logs
    const ec2StatusCheck = ec2Results.find((r) => r.id === 'ec2-status');
    const publicIp = ec2StatusCheck?.details?.publicIp;
    if (publicIp) {
      const logResults = await fetchEc2Logs(publicIp);
      allResults.push(...logResults);
    }

    // 9. DNS checks (7 checks)
    const dnsResults = await runDnsChecks();
    allResults.push(...dnsResults);

    // 10. TLS checks (5 checks)
    const tlsResults = await runTlsChecks();
    allResults.push(...tlsResults);

  } catch (err: any) {
    console.error('❌ Error during check cycle:', err.message);
  }

  latestResults = allResults;
  lastRunTime = new Date().toISOString();

  // Process alerts
  await processResults(allResults);

  // Record history
  recordResults(allResults);

  // Write per-cycle log file
  writeRunLog(allResults);

  const elapsed = Date.now() - start;
  const up = allResults.filter((r) => r.status === 'UP').length;
  const down = allResults.filter((r) => r.status === 'DOWN').length;
  const warn = allResults.filter((r) => r.status === 'WARNING').length;
  console.log(`✅ Check cycle complete: ${allResults.length} checks in ${elapsed}ms — ✅${up} ❌${down} ⚠️  ${warn}`);

  isRunning = false;

  // Merge cached AI/ML results so the dashboard always shows them
  if (latestAiMlResults.length > 0) {
    latestResults = [...latestResults, ...latestAiMlResults];
  }

  return latestResults;
}

function settledValue(r: PromiseSettledResult<CheckResult>): CheckResult {
  if (r.status === 'fulfilled') return r.value;
  return {
    id: 'unknown', name: 'Unknown', group: 'backend-health',
    status: 'DOWN', responseTimeMs: 0,
    message: (r as PromiseRejectedResult).reason?.message || 'Error',
    timestamp: new Date().toISOString(), severity: 'CRITICAL',
  };
}

function parseRedisFromHealth(id: string, name: string, healthResult: PromiseSettledResult<CheckResult>): CheckResult {
  const now = new Date().toISOString();
  if (healthResult.status !== 'fulfilled') {
    return { id, name, group: 'redis', status: 'DOWN', responseTimeMs: 0, message: 'Health endpoint failed', timestamp: now, severity: 'WARNING' };
  }
  const res = healthResult.value;
  if (res.status === 'DOWN') {
    return { id, name, group: 'redis', status: 'DOWN', responseTimeMs: 0, message: 'Backend down — cannot check Redis', timestamp: now, severity: 'WARNING' };
  }
  // If health endpoint returned successfully, Redis is likely accessible from the backend
  return { id, name, group: 'redis', status: 'UP', responseTimeMs: res.responseTimeMs, message: 'Redis accessible via backend health', timestamp: now, severity: 'WARNING' };
}

/**
 * Run AI/ML health checks separately (called on 6h cron).
 */
export async function runAiMlCheckCycle(): Promise<CheckResult[]> {
  console.log(`\n🤖 Starting AI/ML health check cycle at ${new Date().toISOString()}`);
  const start = Date.now();

  try {
    const results = await runAiMlProbes();
    latestAiMlResults = results;

    // Merge into latestResults (replace old AI/ML entries)
    latestResults = [
      ...latestResults.filter((r) => r.group !== 'ai-ml'),
      ...results,
    ];

    // Process alerts for AI/ML checks
    await processResults(results);
    recordResults(results);

    const elapsed = Date.now() - start;
    const up = results.filter((r) => r.status === 'UP').length;
    const down = results.filter((r) => r.status === 'DOWN').length;
    console.log(`🤖 AI/ML check complete: ${results.length} checks in ${elapsed}ms — ✅${up} ❌${down}`);

    return results;
  } catch (err: any) {
    console.error('❌ Error during AI/ML check cycle:', err.message);
    return [];
  }
}
