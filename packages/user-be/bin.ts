import { Server } from "./index";
import dotenv from "dotenv";
// import {prisma} from "./lib/prisma";
import { getPrisma } from "./lib/prisma";
import { retrieveAndInjectSecrets } from "./middleware/retriveSecrets";
import { userQueueService } from "./lib/redis/userQueueService";
import { complaintQueueService } from "./lib/redis/complaintQueueService";
import { createBunWsServer, BunWsServer } from "./lib/websocket";

// Load local .env file first (for development) - this is optional
// The app can work with just .env.bootstrap + AWS Secrets
dotenv.config();

// WebSocket server instance (for graceful shutdown)
let wsServer: BunWsServer | null = null;

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

    // Now that secrets are loaded, initialize server
    const server = new Server(prisma);
    const app = server.getApp();

    const PORT = process.env.PORT;

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Start WebSocket server on a different port
    const WS_PORT = parseInt(process.env.WS_PORT || '3001', 10);
    wsServer = createBunWsServer({
      port: WS_PORT,
      db: prisma,
    });
    
    await wsServer.start();
    console.log(`WebSocket server is running on port ${WS_PORT}`);
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
  if (wsServer) {
    await wsServer.stop();
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM. Shutting down gracefully...");
  if (wsServer) {
    await wsServer.stop();
  }
  process.exit(0);
});