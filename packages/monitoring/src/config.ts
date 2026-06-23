import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // SMTP
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  alertTo: process.env.ALERT_TO || '',

  // AWS
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'ap-south-2',
    s3Bucket: process.env.S3_BUCKET || 'sih-swaraj',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'redis-swaraj.adityahota.online',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },

  // Databases
  neonDbUrl: process.env.NEONDB_URL || '',

  // Service URLs
  urls: {
    userBe: process.env.USER_BE_URL || 'https://iit-bbsr-swaraj-user-be.adityahota.online',
    adminBe: process.env.ADMIN_BE_URL || 'https://iit-bbsr-swaraj-admin-be.adityahota.online',
    compQueue: process.env.COMP_QUEUE_URL || 'https://iit-bbsr-swaraj-comp-queue.adityahota.online',
    blockRit: process.env.BLOCK_RIT_URL || 'https://block-rit.adityahota.online',
    userFe: process.env.USER_FE_URL || 'https://iit-bbsr-swaraj-user-fe.adityahota.online',
    adminFe: process.env.ADMIN_FE_URL || 'https://admin.swarajdesk.co.in',
  },

  // Domains for DNS/TLS checks
  domains: [
    'iit-bbsr-swaraj-user-be.adityahota.online',
    'iit-bbsr-swaraj-admin-be.adityahota.online',
    'iit-bbsr-swaraj-comp-queue.adityahota.online',
    'block-rit.adityahota.online',
    'redis-swaraj.adityahota.online',
    'cat-ani.adityahota.online',
  ],

  // Dashboard
  dashboardPort: parseInt(process.env.DASHBOARD_PORT || '4000'),
  checkIntervalSeconds: parseInt(process.env.CHECK_INTERVAL_SECONDS || '900'),

  // Thresholds
  queueBacklogThreshold: parseInt(process.env.QUEUE_BACKLOG_THRESHOLD || '100'),
  tlsExpiryWarnDays: parseInt(process.env.TLS_EXPIRY_WARN_DAYS || '14'),

  // Alert cooldown in ms (5 min)
  alertCooldownMs: 5 * 60 * 1000,

  // EC2 SSH for log retrieval
  ec2Ssh: {
    keyPath: process.env.EC2_SSH_KEY || '../../ec2/.key/ec2-iit-pair',
    user: process.env.EC2_SSH_USER || 'ubuntu',
  },
};
