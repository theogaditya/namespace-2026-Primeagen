import { RedisClientforComplaintQueue } from './redisClient';

export class ProcessedComplaintQueueService {
    private static instance: ProcessedComplaintQueueService;
    private redisClient: RedisClientforComplaintQueue;
    private isConnected: boolean = false;
    private readonly QUEUE_NAME = 'complaint:processed:queue';

    private constructor() {
        this.redisClient = new RedisClientforComplaintQueue();
    }

    public static getInstance(): ProcessedComplaintQueueService {
        if (!ProcessedComplaintQueueService.instance) {
            ProcessedComplaintQueueService.instance = new ProcessedComplaintQueueService();
        }
        return ProcessedComplaintQueueService.instance;
    }

    public async connect(): Promise<void> {
        if (!this.isConnected) {
            await this.redisClient.connect();
            this.isConnected = true;
            console.log('Processed Complaint Queue Redis client connected successfully');
        }
    }

    public async pushToQueue(complaintData: {
        id: string;
        seq: number;
        status: string;
        complainantId: string;
        categoryId: string;
        subCategory: string;
        assignedDepartment: string;
        city: string;
        district: string;
    }): Promise<void> {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            const client = this.redisClient.getClient();
            
            // Push processed complaint to queue for auto-assignment and blockchain processing
            await client.rPush(this.QUEUE_NAME, JSON.stringify(complaintData));
            // Log queue length immediately after push for debugging
            try {
                const newLen = await client.lLen(this.QUEUE_NAME);
                console.log(`Processed complaint pushed to queue: id=${complaintData.id}, seq=${complaintData.seq}, queueLength=${newLen}`);
            } catch (lenErr) {
                console.log(`Processed complaint pushed to queue: id=${complaintData.id}, seq=${complaintData.seq} (failed to read length)`, lenErr);
            }
        } catch (error) {
            console.error('Error pushing processed complaint to queue:', error);
            throw error;
        }
    }

    public async getQueueLength(): Promise<number> {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            const client = this.redisClient.getClient();
            return await client.lLen(this.QUEUE_NAME);
        } catch (error) {
            console.error('Error getting processed complaint queue length:', error);
            throw error;
        }
    }

    public async peekQueue(): Promise<any | null> {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            const client = this.redisClient.getClient();
            const raw = await client.lIndex(this.QUEUE_NAME, 0);
            if (!raw) return null;
            try {
                return JSON.parse(raw);
            } catch (err) {
                // if not JSON, return raw string
                return raw;
            }
        } catch (error) {
            console.error('Error peeking processed complaint queue:', error);
            throw error;
        }
    }

    public async popFromQueue(): Promise<any | null> {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            const client = this.redisClient.getClient();
            const raw = await client.lPop(this.QUEUE_NAME);
            if (!raw) return null;
            try {
                return JSON.parse(raw);
            } catch (err) {
                return raw;
            }
        } catch (error) {
            console.error('Error popping from processed complaint queue:', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        if (this.isConnected) {
            const client = this.redisClient.getClient();
            await client.quit();
            this.isConnected = false;
            console.log('Processed Complaint Queue Redis client disconnected');
        }
    }
}

export const processedComplaintQueueService = ProcessedComplaintQueueService.getInstance();
