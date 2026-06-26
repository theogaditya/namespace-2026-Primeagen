import express from "express";
import cors from "cors";
import helmet from "helmet";
import type { PrismaClient } from "./prisma/generated/client/client";
import { createAuthMiddleware } from "./middleware/auth";
import { createChatRoutes } from "./routes/chat";
import { createVoiceRoutes } from "./routes/voice";
import { createHealthRoutes } from "./routes/health";
import { createDedupRouter } from "./routes/dedup";
import { createModerateRouter } from "./routes/moderate";
import { createQualityRouter } from "./routes/quality";

export function createApp(db: PrismaClient) {
  const app = express();

  // Security & parsing
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "10mb" })); // 10mb for voice audio payloads

  // Public routes
  app.use("/api/health", createHealthRoutes());

  // Service-to-service routes (internal API key auth, not user JWT)
  app.use("/api/moderate", createModerateRouter());

  // Protected routes (user JWT auth)
  const auth = createAuthMiddleware(db);
  app.use("/api/chat", auth, createChatRoutes(db));
  app.use("/api/voice", auth, createVoiceRoutes(db));
  app.use("/api/dedup", auth, createDedupRouter(db));
  app.use("/api/quality-score", auth, createQualityRouter());

  return app;
}
