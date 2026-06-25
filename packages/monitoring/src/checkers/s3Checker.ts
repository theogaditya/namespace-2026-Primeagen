import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config';
import type { CheckResult } from '../types';

export async function runS3Checks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const s3 = new S3Client({
    region: config.s3.region,
    credentials: {
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey,
    },
  });
  const bucket = config.s3.bucket;

  const testKey = `_monitor/healthcheck-${Date.now()}.txt`;
  const testBody = `monitor-health-check-${Date.now()}`;

  // Check 1: S3 PUT (write)
  const writeStart = Date.now();
  try {
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: testBody,
      ContentType: 'text/plain',
    }));
    results.push({
      id: 's3-write', name: 'S3 PUT (Write)', group: 's3', status: 'UP',
      responseTimeMs: Date.now() - writeStart, message: `Wrote ${testKey}`,
      timestamp: new Date().toISOString(), severity: 'CRITICAL',
    });
  } catch (err: any) {
    results.push({
      id: 's3-write', name: 'S3 PUT (Write)', group: 's3', status: 'DOWN',
      responseTimeMs: Date.now() - writeStart, message: err.message || 'S3 write failed',
      timestamp: new Date().toISOString(), severity: 'CRITICAL',
    });
    // If write fails, skip read and cleanup
    return results;
  }

  // Check 2: S3 GET (read)
  const readStart = Date.now();
  try {
    const resp = await s3.send(new GetObjectCommand({
      Bucket: bucket,
      Key: testKey,
    }));
    const bodyStr = await resp.Body?.transformToString();
    const match = bodyStr === testBody;
    results.push({
      id: 's3-read', name: 'S3 GET (Read)', group: 's3',
      status: match ? 'UP' : 'WARNING',
      responseTimeMs: Date.now() - readStart,
      message: match ? `Read verified: ${testKey}` : 'Content mismatch',
      timestamp: new Date().toISOString(), severity: 'CRITICAL',
    });
  } catch (err: any) {
    results.push({
      id: 's3-read', name: 'S3 GET (Read)', group: 's3', status: 'DOWN',
      responseTimeMs: Date.now() - readStart, message: err.message || 'S3 read failed',
      timestamp: new Date().toISOString(), severity: 'CRITICAL',
    });
  }

  // Check 3: S3 DELETE (cleanup)
  const delStart = Date.now();
  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: testKey,
    }));
    results.push({
      id: 's3-cleanup', name: 'S3 DELETE (Cleanup)', group: 's3', status: 'UP',
      responseTimeMs: Date.now() - delStart, message: `Deleted ${testKey}`,
      timestamp: new Date().toISOString(), severity: 'WARNING',
    });
  } catch (err: any) {
    results.push({
      id: 's3-cleanup', name: 'S3 DELETE (Cleanup)', group: 's3', status: 'WARNING',
      responseTimeMs: Date.now() - delStart, message: `Cleanup failed: ${err.message}`,
      timestamp: new Date().toISOString(), severity: 'WARNING',
    });
  }

  return results;
}
