// apps/api/admin-be/src/workers/complaintAssignmentWorker.ts

import http from 'http';
import { redisService } from '../services/redisService';
import { queueNames } from '../config/redis.config';


class ComplaintAssignmentWorker {
  private isRunning: boolean = false;

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Worker is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Complaint Assignment Worker started');
    // Main worker loop
    while (this.isRunning) {
      try {
        console.log('🔎 Polling queue for complaints (non-blocking)...');

        const complaint = await redisService.pollAndPop(queueNames.COMPLAINT_ASSIGNMENT);

        if (complaint) {
          console.log(`📥 Polled & popped complaint: ${complaint.id}`);
          await this.assignComplaint(complaint);
          console.log(`✅ Processed complaint: ${complaint.id}`);
        } else {
          // nothing to do right now — sleep a bit before polling again
          await this.sleep(10000);
        }
      } catch (error) {
        console.error('❌ Error in worker loop:', error);
        await this.sleep(5000);
      }
    }
  }

  private assignComplaint(complaint: any): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🌐 Making HTTP request to auto-assign...');
      console.log(`📍 Complaint municipality: ${complaint.municipality}`);
      
      const postData = JSON.stringify(complaint);
      
      const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/api/agent/complaints/auto-assign',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          console.log(`📨 Response status: ${res.statusCode}`);
          console.log(`📨 Response body: ${data}`);
          resolve();
        });
      });

      req.on('error', (error) => {
        console.error('❌ HTTP request error:', error);
        reject(error);
      });

      req.setTimeout(5000, () => {
        console.error('❌ Request timeout');
        req.destroy();
        reject(new Error('Timeout'));
      });

      req.write(postData);
      req.end();
    });
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping worker...');
    this.isRunning = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const complaintWorker = new ComplaintAssignmentWorker();

process.on('SIGTERM', async () => {
  console.log('\n⚠️  SIGTERM received');
  await complaintWorker.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n⚠️  SIGINT received');
  await complaintWorker.stop();
  process.exit(0);
});