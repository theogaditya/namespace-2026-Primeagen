import { Server } from "./index";
import dotenv from "dotenv";
import { getPrisma } from "./lib/prisma";
import { initializeGCP } from "./lib/gcp/gcp";
import { redisClient, RedisClientforComplaintQueue } from './lib/redis/redisClient';

// Load local .env file first (for development)
dotenv.config();

// Main async function to handle secrets retrieval
async function bootstrap() {
  try {
    // Retrieve secrets from AWS Secrets Manager
    // This will inject secrets into process.env

    const prisma = getPrisma();
    console.log('Prisma client initialized');

    // Initialize Redis clients once and log a single sanitized message
    try {
      await redisClient.connect();
      const complaintClient = new RedisClientforComplaintQueue();
      await complaintClient.connect();

      const rawUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      // mask credentials if present
      const sanitized = rawUrl.replace(/:\/\/.*@/, '://<redacted>@');
      console.log(`[Redis] connected to ${sanitized}`);
    } catch (redisInitErr) {
      console.warn('Failed to initialize Redis clients:', redisInitErr);
    }

    // // Helper: non-blocking pop from complaint queue
    // const client = complaintQueueService['redisClient'].getClient();
    // // simple non-blocking pop
    // const raw = await client.lPop('complaint:registration:queue');
    // if (!raw) return null;
    // const complaint = JSON.parse(raw);

    // // Clear out the processedComplaintQueue on server start
    // // Uncomment the following lines to enable queue clearing
    // try {
    //   const complaintClient = new RedisClientforComplaintQueue();
    //   await complaintClient.connect();
    //   const client = complaintClient.getClient();
    //   const PROCESSED_QUEUE = 'complaint:processed:queue';
    //   const deleted = await client.del(PROCESSED_QUEUE);
    //   console.log(`[Redis] Cleared ${PROCESSED_QUEUE} - deleted ${deleted} key(s)`);
    // } catch (clearErr) {
    //   console.warn('[Redis] Failed to clear processed complaint queue:', clearErr);
    // }

    // Initialize GCP Vertex AI client
    const gcpConfig = await initializeGCP();
    console.log('GCP Vertex AI client initialized');
    console.log(`  Endpoint: ${gcpConfig.endpointId}`);

    // Now that secrets are loaded, initialize server
    const server = new Server(prisma);
    const app = server.getApp();

    const PORT = process.env.ADMIN_BE_PORT || 4000;

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the application
bootstrap();

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("SIGINT", async () => {
  console.log("Received SIGINT. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM. Shutting down gracefully...");
  process.exit(0);
});