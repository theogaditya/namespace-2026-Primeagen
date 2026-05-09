import { complaintQueueService } from '../../lib/redis';

class ComplaintAssignmentWorker {
  private isRunning: boolean = false;
  private readonly ALLOWED_MUNICIPALITIES = ['Ranchi', 'Dhanbad', 'Jamshedpur'];

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Worker is already running');
      return;
    }

    this.isRunning = true;
    console.log('Complaint Assignment Worker started');
    
    // Main worker loop
    while (this.isRunning) {
      try {
        console.log('\nPolling and popping from queue for complaints...');

        const complaint = await complaintQueueService.pollAndPop();
        if (complaint) {
          // Normalize complaint payload: handle string or nested objects
          let parsedComplaint: any = complaint;
          if (typeof complaint === 'string') {
            try {
              parsedComplaint = JSON.parse(complaint);
            } catch (err) {
              // keep original string if parse fails
              parsedComplaint = complaint;
            }
          }

          const rawComplaintId = parsedComplaint?.id || parsedComplaint?.complaintId || parsedComplaint?._id;
          const complaintId = rawComplaintId && typeof rawComplaintId === 'object'
            ? JSON.stringify(rawComplaintId)
            : rawComplaintId !== undefined && rawComplaintId !== null
              ? String(rawComplaintId)
              : undefined;

          try {
            console.log('Popped complaint from queue:', JSON.stringify(parsedComplaint));
          } catch (err) {
            console.log('Popped complaint from queue (non-serializable)');
          }

          const rawMunicipality = parsedComplaint?.location?.city || parsedComplaint?.location?.municipal || parsedComplaint?.municipality;
          const municipality = rawMunicipality !== undefined && rawMunicipality !== null
            ? String(rawMunicipality).trim()
            : '';

          if (!municipality) {
            console.error(`Complaint ${complaintId || '[no-id]'} missing municipality. Moving to malformed queue`);
            try {
              const { redisClient } = await import('../../lib/redis/redisClient');
              const client = redisClient.getClient();
              await client.lpush('complaint:assignment:malformed', JSON.stringify(parsedComplaint));
              console.log('Moved malformed complaint to dead-letter queue');
            } catch (dlqErr) {
              console.error('Failed to move malformed complaint to dead-letter queue:', dlqErr);
            }
            continue;
          }
          
          // Check if municipality is allowed
          if (!this.ALLOWED_MUNICIPALITIES.includes(municipality)) {
            console.warn(`Complaint ${complaintId || '[no-id]'} has invalid municipality: ${municipality}`);
            console.log(`Allowed: ${this.ALLOWED_MUNICIPALITIES.join(', ')}`);
            console.log('Dropping complaint (invalid municipality)');
            continue;
          }

          console.log(`👀 Processing complaint: ${complaintId || '[no-id]'} (${municipality})`);

          try {
            await this.assignComplaint(municipality);
            console.log(`Successfully processed complaint: ${complaintId || '[no-id]'}`);
          } catch (processingError) {
            console.error(`Failed to process complaint ${complaintId || '[no-id]'}:`, processingError);
            console.log('Re-queueing complaint for retry');
            try {
              await complaintQueueService.pushComplaint(parsedComplaint);
              console.log('Re-queued complaint for retry');
            } catch (requeueErr) {
              console.error('Failed to re-queue complaint:', requeueErr);
              try {
                const { redisClient } = await import('../../lib/redis/redisClient');
                const client = redisClient.getClient();
                await client.lpush('complaint:assignment:malformed', JSON.stringify(parsedComplaint));
                console.log('Moved complaint to dead-letter queue as fallback');
              } catch (dlqErr) {
                console.error('Failed to move complaint to dead-letter queue:', dlqErr);
              }
            }

            await this.sleep(30000);
          }
        } else {
          await this.sleep(10000);
        }
      } catch (error) {
        console.error(' Error in worker loop:', error);
        await this.sleep(5000);
      }
    }
  }

  private async assignComplaint(municipality: string): Promise<void> {
    const payload = {
      city: municipality,
    };

    try {
      const response = await fetch('http://localhost:3002/api/agent/complaints/auto-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      console.log(`Response status: ${response.status}`);
      console.log(`Response body:`, JSON.stringify(data));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
      }
    } catch (error: any) {
      console.error('❌ HTTP request error:', error.message);
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log('Stopping worker...');
    this.isRunning = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const complaintWorker = new ComplaintAssignmentWorker();

process.on('SIGTERM', async () => {
  console.log('\nSIGTERM received');
  await complaintWorker.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received');
  await complaintWorker.stop();
  process.exit(0);
});