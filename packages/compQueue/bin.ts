import { Server } from "./index";
import dotenv from "dotenv";
import { getPrisma } from "./lib/prisma";
import { initializeGCP } from "./lib/gcp/gcp";
import { redisClient, RedisClientforComplaintQueue } from './lib/redis/redisClient';
import { retrieveAndInjectSecrets } from './middleware/retriveSecrets';

// Load local .env file first (for development)
dotenv.config();

// Main async function to handle initialization
async function bootstrap() {
  try {
    console.log('Starting Complaint Queue Microservice...');

    // Retrieve secrets first (AWS Secrets Manager)
    try {
      await retrieveAndInjectSecrets();
      console.log('Secrets loaded');
    } catch (sErr) {
      console.warn('Secrets retrieval failed (continuing if in dev):', sErr);
    }

    const prisma = getPrisma();
    console.log('Prisma client initialized');

    try {
      await redisClient.connect();
      const complaintClient = new RedisClientforComplaintQueue();
      await complaintClient.connect();
      console.log('Redis clients initialized');
    } catch (redisInitErr) {
      console.warn('Failed to initialize Redis clients:', redisInitErr);
    }

    // Initialize GCP Vertex AI client (optional - for AI standardization)
    try {
      const gcpConfig = await initializeGCP();
      console.log('GCP Vertex AI client initialized');
      console.log(`  Endpoint: ${gcpConfig.endpointId}`);
    } catch (gcpErr) {
      console.warn('GCP initialization failed (non-blocking):', gcpErr);
    }

    // Initialize server
    const server = new Server(prisma);
    const app = server.getApp();

    const PORT = process.env.COMP_QUEUE_PORT || 3005;

    app.listen(PORT, () => {
      console.log(`Complaint Queue Service is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error("Failed to start Complaint Queue Service:", error);
    process.exit(1);
  }
}

// Start the application
bootstrap();
