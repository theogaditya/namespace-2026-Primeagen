import http from 'http';
import { complaintQueueService } from '../lib/redis';

class ComplaintAssignmentWorker {
  private isRunning: boolean = false;
  private readonly ALLOWED_MUNICIPALITIES = ['Ranchi', 'Dhanbad', 'Jamshedpur'];

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️Worker is already running');
      return;
    }

    this.isRunning = true;
    console.log('Complaint Assignment Worker started');
    console.log('📍 Allowed municipalities:', this.ALLOWED_MUNICIPALITIES.join(', '));
    
    // Main worker loop
    while (this.isRunning) {
      try {
        console.log('🔎 Peeking at queue for complaints...');

        const complaint = await complaintQueueService.peekComplaint();

        if (complaint) {
          // Validate complaint has required fields
          const complaintId = complaint.id || complaint.complaintId || complaint._id;
                    
          // Extract municipality
          const municipality = complaint.location?.city || complaint.location?.municipal || complaint.municipality;
          
          if (!municipality) {
            console.error(`❌ Complaint ${complaintId} missing municipality, removing from queue`);
            await complaintQueueService.removeFirstComplaint();
            continue;
          }
          
          // Check if municipality is allowed
          if (!this.ALLOWED_MUNICIPALITIES.includes(municipality)) {
            console.warn(`⚠️ Complaint ${complaintId} has invalid municipality: ${municipality}`);
            console.log(`📍 Allowed: ${this.ALLOWED_MUNICIPALITIES.join(', ')}`);
            console.log('🗑️ Removing from queue');
            await complaintQueueService.removeFirstComplaint();
            continue;
          }
          
          console.log(`👀 Peeked complaint: ${complaintId} (${municipality})`);
          
          try {
            // Try to process the complaint
            await this.assignComplaint(complaint, complaintId, municipality);
            
            // Only remove from queue if processing was successful
            await complaintQueueService.removeFirstComplaint();
            console.log(`✅ Successfully processed and removed complaint: ${complaintId}`);
          } catch (processingError) {
            console.error(`❌ Failed to process complaint ${complaintId}:`, processingError);
            console.log('⏭ Complaint remains in queue for retry');
            // Wait longer before retry to avoid hammering the system
            await this.sleep(30000);
          }
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

  private assignComplaint(complaint: any, complaintId: string, municipality: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Making HTTP request to auto-assign...');
      
      // Extract municipality from complaint.location based on schema
      const municipality = complaint.location?.city || complaint.location?.municipal || complaint.municipality;
      
      if (!municipality) {
        console.error('No municipality found in complaint');
        reject(new Error('Municipality not found in complaint data'));
        return;
      }
      
      console.log(`📍 Complaint municipality: ${municipality}`);
      
      const postData = JSON.stringify({
        id: complaint.id,
        municipality: municipality,
        department: complaint.assignedDepartment || complaint.department
      });
      
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
          
          // Only resolve if response was successful (2xx status)
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
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