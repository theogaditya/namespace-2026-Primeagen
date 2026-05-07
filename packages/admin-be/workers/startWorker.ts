// apps/api/admin-be/src/workers/startWorker.ts
// Separate entry point to run the worker

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { complaintWorker } from './complaintAssignmentWorker';
import { redisService } from '../services/redisService';
import { queueNames } from '../config/redis.config';

// Load env file (mirrors server behavior)
const host = process.env.REDIS_HOST;
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'production' ? '.env.prod' : '.env.local';
try {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('Loaded env from', envPath);
  } else {
    // try relative to this file
    const alt = path.resolve(__dirname, '..', '..', '..', envFile);
    if (fs.existsSync(alt)) {
      dotenv.config({ path: alt });
      console.log('Loaded env from', alt);
    } else {
      console.warn('Could not find', envFile, '— relying on process.env');
    }
  }
} catch (e) {
  console.warn('Failed to load env file:', e);
}

async function main() {
  console.log('🔧 Initializing Complaint Assignment Worker...');
  console.log('📋 Queue:', process.env.REDIS_QUEUE_KEY || queueNames.COMPLAINT_ASSIGNMENT);
  console.log('🌐 Redis Host:', host);
  // Wait for Redis to be ready
  let retries = 0;
  while (!redisService.isReady() && retries < 10) {
    console.log('⏳ Waiting for Redis connection...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    retries++;
  }

  if (!redisService.isReady()) {
    console.error('❌ Failed to connect to Redis after 10 retries');
    process.exit(1);
  }

  // Start the worker
  await complaintWorker.start();
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});