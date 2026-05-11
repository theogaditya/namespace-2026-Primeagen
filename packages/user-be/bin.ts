import { Server } from "./index";
import dotenv from "dotenv";
// import {prisma} from "./lib/prisma";
import { getPrisma } from "./lib/prisma";
import { retrieveAndInjectSecrets } from "./middleware/retriveSecrets";
import { userQueueService } from "./lib/redis/userQueueService";
import { complaintQueueService } from "./lib/redis/complaintQueueService";
import { initializeGCP } from "./lib/gcp/gcp";

// Load local .env file first (for development)
dotenv.config();

// Main async function to handle secrets retrieval
async function bootstrap() {
  try {   
    // Retrieve secrets from AWS Secrets Manager
    // This will inject secrets into process.env
    await retrieveAndInjectSecrets();

    const prisma = getPrisma();
    console.log('Prisma client initialized');
    
    // Initialize Redis queue services
    await userQueueService.connect();
    console.log('User queue service initialized');
    
    await complaintQueueService.connect();
    console.log('Complaint queue service initialized');

    // // Helper: non-blocking pop from complaint queue
    // const client = complaintQueueService['redisClient'].getClient();
    // // simple non-blocking pop
    // const raw = await client.lPop('complaint:registration:queue');
    // if (!raw) return null;
    // const complaint = JSON.parse(raw);

    // Initialize GCP Vertex AI client
    const gcpConfig = await initializeGCP();
    console.log('GCP Vertex AI client initialized');
    console.log(`  Endpoint: ${gcpConfig.endpointId}`);

    // Now that secrets are loaded, initialize server
    const server = new Server(prisma);
    const app = server.getApp();

    const PORT = process.env.PORT;

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