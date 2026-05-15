import { RedisClientforComplaintQueue } from './redisClient';

export class ComplaintQueueService {
    private static instance: ComplaintQueueService;
    private redisClient: RedisClientforComplaintQueue | null = null;
    private isConnected: boolean = false;
    private readonly QUEUE_NAME = 'complaint:registration:queue';

    private constructor() {
        // Don't create Redis client here - wait until connect() is called
        // This allows AWS secrets to be loaded first
    }

    public static getInstance(): ComplaintQueueService {
        if (!ComplaintQueueService.instance) {
            ComplaintQueueService.instance = new ComplaintQueueService();
        }
        return ComplaintQueueService.instance;
    }

    public async connect(): Promise<void> {
        if (!this.isConnected) {
            // Create Redis client now (after AWS secrets are loaded)
            this.redisClient = new RedisClientforComplaintQueue();
            await this.redisClient.connect();
            this.isConnected = true;
            console.log('Complaint Queue Redis client connected successfully');
        }
    }

    public async pushComplaintToQueue(complaintData: any): Promise<void> {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            const client = this.redisClient!.getClient();
            
            // Push complaint data to the queue (right push - RPUSH adds to the end of the list)
            // The processing service will pop from the left (LPOP - first in, first out)
            await client.rPush(this.QUEUE_NAME, JSON.stringify(complaintData));
            
            console.log(`Complaint pushed to queue successfully`);
        } catch (error) {
            console.error('Error pushing complaint to queue:', error);
            throw error;
        }
    }

    public async getQueueLength(): Promise<number> {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            const client = this.redisClient!.getClient();
            return await client.lLen(this.QUEUE_NAME);
        } catch (error) {
            console.error('Error getting complaint queue length:', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        if (this.isConnected && this.redisClient) {
            const client = this.redisClient.getClient();
            await client.quit();
            this.isConnected = false;
            console.log('Complaint Queue Redis client disconnected');
        }
    }
}

export const complaintQueueService = ComplaintQueueService.getInstance();
