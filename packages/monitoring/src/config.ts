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

  // AWS -kept for legacy/fallback if needed elsewhere
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'ap-south-2',
    s3Bucket: process.env.S3_BUCKET || 'sih-swaraj',
  },

  // S3 -may be on a DIFFERENT AWS account from EC2
  // Falls back to the generic AWS_* vars if S3-specific ones are not set
  s3: {
    accessKeyId: process.env.S3_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.S3_AWS_REGION || process.env.AWS_REGION || 'ap-south-2',
    bucket: process.env.S3_BUCKET || 'sih-swaraj',
  },

  // EC2 -static instance IPs, no AWS SDK needed
  // Comma-separated list e.g. EC2_INSTANCE_IPS=13.233.x.x,15.207.x.x
  ec2: {
    instanceIps: (process.env.EC2_INSTANCE_IPS || '').split(',').map(s => s.trim()).filter(Boolean),
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'redis-swaraj.adityahota.online',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },

  // Databases
  neonDbUrl: (process.env.NEONDB_URL || '').trim(),

  // Service URLs
  urls: {
    userBe: process.env.USER_BE_URL || 'https://iit-bbsr-swaraj-user-be.adityahota.online',
    adminBe: process.env.ADMIN_BE_URL || 'https://iit-bbsr-swaraj-admin-be.adityahota.online',
    compQueue: process.env.COMP_QUEUE_URL || 'https://iit-bbsr-swaraj-comp-queue.adityahota.online',
    blockRit: process.env.BLOCK_RIT_URL || 'https://block-rit.adityahota.online',
    userFe: process.env.USER_FE_URL || 'https://iit-bbsr-swaraj-user-fe.adityahota.online',
    adminFe: process.env.ADMIN_FE_URL || 'https://admin.swarajdesk.co.in',
    toxicAni: process.env.TOXIC_ANI_URL || 'https://toxic-ani.adityahota.online',
    voiceAni: process.env.VOICE_ANI_URL || 'https://voice-ani.adityahota.online',
    catAni: process.env.CAT_ANI_URL || 'https://cat-ani.adityahota.online',
    visionAni: process.env.VISION_ANI_URL || 'https://vision-ani.adityahota.online',
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

  //  ###################################
  //  CHECK INTERVAL SECONDS            #
  //  ###################################
  //  15 Minutes = 900 seconds
  //  30 Minutes = 1800 seconds
  //  60 Minutes = 3600 seconds
  //  75 Minutes = 4500 seconds
  //  90 Minutes = 5400 seconds
  //  180 Minutes = 10800 seconds
  //  360 Minutes = 21600 seconds
  //  720 Minutes = 43200 seconds
  //  ###################################

  // HEALTH CHECK REFRESH INTERVAL
  // Dashboard
  dashboardPort: parseInt(process.env.DASHBOARD_PORT || '4000'),
  checkIntervalSeconds: parseInt(process.env.CHECK_INTERVAL_SECONDS || '5400'),

  // Thresholds
  queueBacklogThreshold: parseInt(process.env.QUEUE_BACKLOG_THRESHOLD || '100'),
  tlsExpiryWarnDays: parseInt(process.env.TLS_EXPIRY_WARN_DAYS || '14'),

  // Alert cooldown in ms (5 min)
  alertCooldownMs: 5 * 60 * 1000,

  // EC2 SSH for log retrieval
  ec2Ssh: {
    // Default to baked-in path inside the container. Can be overridden by EC2_SSH_KEY env.
    keyPath: process.env.EC2_SSH_KEY || '/ec2-keys/ec2-iit-pair',
    user: process.env.EC2_SSH_USER || 'ubuntu',
  },

  // AI/ML model URLs
  aiml: {
    catAni: (process.env.CAT_ANI_URL || 'https://cat-ani.adityahota.online').trim(),
    voiceAni: (process.env.VOICE_ANI_URL || 'https://voice-ani.adityahota.online').trim(),
    toxicAni: (process.env.TOXIC_ANI_URL || 'https://toxic-ani.adityahota.online').trim(),
    visionAni: (process.env.VISION_ANI_URL || 'https://vision-ani.adityahota.online').trim(),
    checkIntervalHours: parseInt(process.env.AI_CHECK_INTERVAL_HOURS || '6'),
  },

  // Cloudflare
  cloudflare: {
    apiToken: process.env.CF_API_TOKEN || '',
    zoneId: process.env.CF_ZONE_ID || '',
  },
};
