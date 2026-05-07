// apps/api/admin-be/src/config/redis.config.ts

export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

export const queueNames = {
  COMPLAINT_ASSIGNMENT: 'complaint:assignment:queue',
  DEPLOYED_QUEUE: 'complaint:registration:queue',
  // Add more queues here as you scale
  // NOTIFICATION_QUEUE: 'notification:queue',
  // ANALYTICS_QUEUE: 'analytics:queue',
} as const;