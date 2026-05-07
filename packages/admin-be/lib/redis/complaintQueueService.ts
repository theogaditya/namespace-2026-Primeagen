import { redisClient } from './redisClient';

export const QUEUE_NAMES = {
  COMPLAINT_REGISTRATION: 'complaint:registration:queue', // Queue where user-be pushes complaints
  COMPLAINT_ASSIGNMENT: 'complaint:assignment:queue',     // Queue for internal assignment (if needed)
  MALFORMED: 'complaint:assignment:malformed',
} as const;

class ComplaintQueueService {
  /**
   * Push a complaint to the queue
   */
  async pushComplaint(complaint: any): Promise<void> {
    const client = redisClient.getClient();
    await client.rpush(
      QUEUE_NAMES.COMPLAINT_REGISTRATION,
      JSON.stringify(complaint)
    );
    console.log(`📨 Complaint ${complaint.id} pushed to queue`);
  }

  /**
   * Non-blocking poll and pop from queue
   * Returns null if queue is empty
   */
  async pollAndPop(): Promise<any | null> {
    try {
      const client = redisClient.getClient();
      const len = await client.llen(QUEUE_NAMES.COMPLAINT_REGISTRATION);
      
      console.log(`📊 Queue length: ${len}`);
      
      if (!len || len <= 0) {
        return null;
      }

      const complaintJson = await client.lpop(QUEUE_NAMES.COMPLAINT_REGISTRATION);
      if (!complaintJson) {
        return null;
      }

      try {
        return JSON.parse(complaintJson);
      } catch (err: any) {
        console.error(
          '❌ Failed to parse complaint JSON:',
          err?.message || err,
          '\nRaw payload:',
          complaintJson
        );
        
        // Move to dead-letter queue
        try {
          await client.lpush(QUEUE_NAMES.MALFORMED, complaintJson);
          console.log('📮 Malformed complaint moved to dead-letter queue');
        } catch (dlqErr) {
          console.error('❌ Failed to move to dead-letter queue:', dlqErr);
        }
        
        return null;
      }
    } catch (err: any) {
      console.error('❌ Redis pollAndPop error:', err?.message || err);
      return null;
    }
  }

  /**
   * Blocking pop - waits for complaints
   */
  async blockingPop(timeout: number = 0): Promise<any | null> {
    try {
      const client = redisClient.getClient();
      const result = await client.brpop(QUEUE_NAMES.COMPLAINT_REGISTRATION, timeout);
      
      if (result) {
        const [, complaintJson] = result;
        try {
          return JSON.parse(complaintJson);
        } catch (err: any) {
          console.error(
            '❌ Failed to parse complaint JSON:',
            err?.message || err,
            '\nRaw payload:',
            complaintJson
          );
          
          // Move to dead-letter queue
          try {
            await client.lpush(QUEUE_NAMES.MALFORMED, complaintJson);
            console.log('📮 Malformed complaint moved to dead-letter queue');
          } catch (dlqErr) {
            console.error('❌ Failed to move to dead-letter queue:', dlqErr);
          }
          
          return null;
        }
      }
      
      return null;
    } catch (err: any) {
      console.error('❌ Redis blockingPop error:', err?.message || err);
      return null;
    }
  }

  /**
   * Get current queue length
   */
  async getQueueLength(): Promise<number> {
    try {
      const client = redisClient.getClient();
      return await client.llen(QUEUE_NAMES.COMPLAINT_REGISTRATION);
    } catch (err) {
      console.error('❌ Failed to get queue length:', err);
      return 0;
    }
  }

  /**
   * Peek at the first item in queue without removing it
   * Returns null if queue is empty
   */
  async peekComplaint(): Promise<any | null> {
    try {
      const client = redisClient.getClient();
      const len = await client.llen(QUEUE_NAMES.COMPLAINT_REGISTRATION);
      
      console.log(`📊 Queue length: ${len}`);
      
      if (!len || len <= 0) {
        return null;
      }

      // Get first item without removing (index 0)
      const complaintJson = await client.lindex(QUEUE_NAMES.COMPLAINT_REGISTRATION, 0);
      if (!complaintJson) {
        return null;
      }

      try {
        return JSON.parse(complaintJson);
      } catch (err: any) {
        console.error(
          '❌ Failed to parse complaint JSON:',
          err?.message || err,
          '\nRaw payload:',
          complaintJson
        );
        
        // Remove malformed item and move to dead-letter queue
        await this.removeFirstComplaint();
        try {
          await client.lpush(QUEUE_NAMES.MALFORMED, complaintJson);
          console.log('📮 Malformed complaint moved to dead-letter queue');
        } catch (dlqErr) {
          console.error('❌ Failed to move to dead-letter queue:', dlqErr);
        }
        
        return null;
      }
    } catch (err: any) {
      console.error('❌ Redis peek error:', err?.message || err);
      return null;
    }
  }

  /**
   * Remove the first complaint from queue (left pop)
   * Only call this after successful processing
   */
  async removeFirstComplaint(): Promise<void> {
    try {
      const client = redisClient.getClient();
      await client.lpop(QUEUE_NAMES.COMPLAINT_REGISTRATION);
      console.log('✅ Complaint removed from queue after successful processing');
    } catch (err: any) {
      console.error('❌ Redis remove error:', err?.message || err);
      throw err;
    }
  }
}

export const complaintQueueService = new ComplaintQueueService();
