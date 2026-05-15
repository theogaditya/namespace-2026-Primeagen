import { RedisClientforUserQueue } from './redisClient';

export class UserQueueService {
    private static instance: UserQueueService;
    private redisClient: RedisClientforUserQueue | null = null;
    private isConnected: boolean = false;
    private readonly QUEUE_NAME = 'user:registration:queue';

    private constructor() {
        // Don't create Redis client here - wait until connect() is called
        // This allows AWS secrets to be loaded first
    }

    public static getInstance(): UserQueueService {
        if (!UserQueueService.instance) {
            UserQueueService.instance = new UserQueueService();
        }
        return UserQueueService.instance;
    }

    public async connect(): Promise<void> {
        if (!this.isConnected) {
            // Create Redis client now (after AWS secrets are loaded)
            this.redisClient = new RedisClientforUserQueue();
            await this.redisClient.connect();
            this.isConnected = true;
            console.log('User Queue Redis client connected successfully');
        }
    }

    public async pushUserToQueue(userData: any): Promise<void> {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            const client = this.redisClient!.getClient();
            
            // Push user data to the queue (right push - RPUSH adds to the end of the list)
            // The blockchain process will pop from the left (LPOP - first in, first out)
            await client.rPush(this.QUEUE_NAME, JSON.stringify(userData));
            
            console.log(`User ${userData.id} pushed to queue successfully`);
        } catch (error) {
            console.error('Error pushing user to queue:', error);
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
            console.error('Error getting queue length:', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        if (this.isConnected && this.redisClient) {
            const client = this.redisClient.getClient();
            await client.quit();
            this.isConnected = false;
            console.log('User Queue Redis client disconnected');
        }
    }
}

export const userQueueService = UserQueueService.getInstance();
