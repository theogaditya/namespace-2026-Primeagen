import { Server } from "./index";
import dotenv from "dotenv";
import {prisma} from "./lib/prisma";

dotenv.config();

const server = new Server(prisma);
const app = server.getApp();

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

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