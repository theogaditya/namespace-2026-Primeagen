import { createClient, RedisClientType } from '@redis/client';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL; 

export class RedisPublishClient {
    private Publishclient: RedisClientType;
    constructor() {
        this.Publishclient = createClient({
            url: REDIS_URL,
        });
        this.Publishclient.on('error', (err) => console.log('Redis Client Error', err));
    }
    public async connect() {
        if (!this.Publishclient.isOpen) {
            await this.Publishclient.connect();
        }
    }

    public getClient(): RedisClientType {
        return this.Publishclient;
    }
}

export class RedisSubscribeClient {
    private Subscribeclient: RedisClientType;
    constructor() {
        this.Subscribeclient = createClient({
            url: REDIS_URL,
        });
        this.Subscribeclient.on('error', (err) => console.log('Redis Client Error', err));
    }
    public async connect() {
        if (!this.Subscribeclient.isOpen) {
            await this.Subscribeclient.connect();
        }
    }

    public getClient(): RedisClientType {
        return this.Subscribeclient;
    }
}   

export class generaleClientforCaching{
    private generalClient: RedisClientType;
    constructor() {
        this.generalClient = createClient({
            url: REDIS_URL,
        });
        this.generalClient.on('error', (err) => console.log('Redis Client Error', err));
    }
    public async connect() {
        if (!this.generalClient.isOpen) {
            await this.generalClient.connect();
        }
    }

    public getClient(): RedisClientType {
        return this.generalClient;
    }
}

export class RedisClientforUserQueue {
    private UserqueueClient: RedisClientType;
    constructor() {
        this.UserqueueClient = createClient({
            url: REDIS_URL,
        });
        this.UserqueueClient.on('error', (err) => console.log('Redis Client Error', err));
    }
    public async connect() {
        if (!this.UserqueueClient.isOpen) {
            await this.UserqueueClient.connect();
        }
    }

    public getClient(): RedisClientType {
        return this.UserqueueClient;
    }
}


export class RedisClientforComplaintQueue{
    private complaintClient: RedisClientType;
    constructor() {
        this.complaintClient = createClient({
            url: REDIS_URL,
        });
        this.complaintClient.on('error', (err) => console.log('Redis Client Error', err));
    }  
    public async connect() {
        if (!this.complaintClient.isOpen) {
            await this.complaintClient.connect();
        }
    }

    public getClient(): RedisClientType {
        return this.complaintClient;
    }
}