import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { complaintWorker } from './complaintAssignmentWorker';
import { redisClient, QUEUE_NAMES } from '../lib/redis';

// Load env file
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'production' ? '.env.prod' : '.env.local';

try {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('✅ Loaded env from', envPath);
  } else {
    const alt = path.resolve(__dirname, '..', '..', envFile);
    if (fs.existsSync(alt)) {
      dotenv.config({ path: alt });
      console.log('✅ Loaded env from', alt);
    } else {
      console.warn('⚠️  Could not find', envFile, '— relying on process.env');
    }
  }
} catch (e) {
  console.warn('⚠️  Failed to load env file:', e);
}

async function main() {
  console.log('🔧 Initializing Complaint Assignment Worker...');
  console.log('📋 Queue:', QUEUE_NAMES.COMPLAINT_REGISTRATION);
  console.log('🌐 Redis URL:', process.env.REDIS_URL ? '***configured***' : '❌ NOT SET');
  
  // Wait for Redis to be ready
  let retries = 0;
  while (!redisClient.isReady() && retries < 10) {
    console.log('⏳ Waiting for Redis connection...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    retries++;
  }

  if (!redisClient.isReady()) {
    console.error('❌ Failed to connect to Redis after 10 retries');
    process.exit(1);
  }

  console.log('✅ Redis connection established');
  
  // Start the worker
  await complaintWorker.start();
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});