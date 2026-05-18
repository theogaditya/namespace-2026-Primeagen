import { RedisClientforComplaintQueue } from './redisClient';

export interface BlockchainQueueData {
    id: string;
    seq: number;
    status: string;
    categoryId: string;
    subCategory: string;
    assignedDepartment: string;
    city: string;
    district: string;
    assignedTo: {
        type: 'agent' | 'municipal_admin';
        id: string;
        name: string;
    };
    assignedAt: string; // ISO timestamp
}

export class BlockchainQueueService {
    private static instance: BlockchainQueueService;
    private redisClient: RedisClientforComplaintQueue;
    private isConnected: boolean = false;
    private readonly QUEUE_NAME = 'complaint:blockchain:queue';

    private constructor() {
        this.redisClient = new RedisClientforComplaintQueue();
    }

    public static getInstance(): BlockchainQueueService {
        if (!BlockchainQueueService.instance) {
            BlockchainQueueService.instance = new BlockchainQueueService();
        }
        return BlockchainQueueService.instance;
    }

    public async connect(): Promise<void> {
        if (!this.isConnected) {
            await this.redisClient.connect();
            this.isConnected = true;
            console.log('Blockchain Queue Redis client connected successfully');
        }
    }

    public async pushToQueue(complaintData: BlockchainQueueData): Promise<void> {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            const client = this.redisClient.getClient();
            
            // Push assigned complaint to blockchain queue for immutable record
            await client.rPush(this.QUEUE_NAME, JSON.stringify(complaintData));
            
            // Log queue length immediately after push for debugging
            try {
                const newLen = await client.lLen(this.QUEUE_NAME);
                console.log(`Complaint pushed to blockchain queue: id=${complaintData.id}, seq=${complaintData.seq}, assignedTo=${complaintData.assignedTo.type}:${complaintData.assignedTo.id}, queueLength=${newLen}`);
            } catch (lenErr) {
                console.log(`Complaint pushed to blockchain queue: id=${complaintData.id}, seq=${complaintData.seq} (failed to read length)`, lenErr);
            }
        } catch (error) {
            console.error('Error pushing complaint to blockchain queue:', error);
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
            console.error('Error getting blockchain queue length:', error);
            throw error;
        }
    }

    public async peekQueue(): Promise<BlockchainQueueData | null> {
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
                // if not JSON, return null
                return null;
            }
        } catch (error) {
            console.error('Error peeking blockchain queue:', error);
            throw error;
        }
    }

    public async popFromQueue(): Promise<BlockchainQueueData | null> {
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
                return null;
            }
        } catch (error) {
            console.error('Error popping from blockchain queue:', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        if (this.isConnected) {
            const client = this.redisClient.getClient();
            await client.quit();
            this.isConnected = false;
            console.log('Blockchain Queue Redis client disconnected');
        }
    }
}

export const blockchainQueueService = BlockchainQueueService.getInstance();
