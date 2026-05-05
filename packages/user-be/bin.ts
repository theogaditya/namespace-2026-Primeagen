import { Server } from "./index";
import dotenv from "dotenv";
import {prisma} from "./lib/prisma";
import { retrieveAndInjectSecrets } from "./middleware/retriveSecrets";
import { userQueueService } from "./lib/userQueueService";

// Load local .env file first (for development)
dotenv.config();

// Main async function to handle secrets retrieval
async function bootstrap() {
  try {
    // Retrieve secrets from AWS Secrets Manager
    // This will inject secrets into process.env
    await retrieveAndInjectSecrets();

    // Initialize Redis queue service for blockchain integration
    await userQueueService.connect();
    console.log('User queue service initialized');

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
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM. Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});