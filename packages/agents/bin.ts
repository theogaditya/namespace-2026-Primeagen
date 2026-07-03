import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });

import { createApp } from "./index";
import { getPrisma } from "./lib/prisma";
import { sessionMemory } from "./lib/memory/sessionMemory";
import { rateLimiter } from "./lib/guardrails/rateLimiter";

async function bootstrap() {
  try {
    // Starting agents (minimal startup logs)

    // Initialize Prisma (read-only)
    const prisma = getPrisma();
    // Prisma client initialized

    // Initialize Redis (for session memory + rate limiting)
    try {
      const redisTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Redis connect timeout (5s)")), 5000)
      );
      await Promise.race([sessionMemory.connect(), redisTimeout]);
    } catch (redisErr) {
      console.warn("Redis connection failed (session memory will use in-memory fallback):", (redisErr as Error).message);
    }

    // Rate limiter Redis (separate, non-critical)
    try {
      await rateLimiter.connect();
    } catch (rlErr) {
      console.warn("Rate limiter Redis failed (rate limiting disabled):", (rlErr as Error).message);
    }

    // Create Express app
    const app = createApp(prisma);

    const PORT = process.env.AGENTS_PORT || 3040;

    app.listen(PORT, () => {
      console.log(`Agents Service running on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      // shutting down
      try {
        await sessionMemory.disconnect();
      } catch {}
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Failed to start Agents Service:", error);
    process.exit(1);
  }
}

bootstrap();
