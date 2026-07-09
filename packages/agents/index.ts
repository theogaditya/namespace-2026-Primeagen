import express, { type RequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import type { PrismaClient } from "./prisma/generated/client/client";
import { createAuthMiddleware } from "./middleware/auth";
import { createChatRoutes } from "./routes/chat";
import { createVoiceRoutes } from "./routes/voice";
import { createHealthRoutes } from "./routes/health";
import { createDedupRouter } from "./routes/dedup";
import { createModerateRouter } from "./routes/moderate";
import { createModerateTestRouter } from "./routes/moderateTest";
import { createQualityRouter } from "./routes/quality";
import { createReportRouter } from "./routes/report";
import { createImageRouter } from "./routes/image";
import { createMatchRouter } from "./routes/match";

export function createApp(db: PrismaClient) {
  const app = express();

  // Security & parsing
  app.use(helmet());
  app.use(cors() as unknown as RequestHandler);
  app.use(express.json({ limit: "10mb" })); // 10mb for voice audio payloads

  // Public routes
  app.use("/api/health", createHealthRoutes());

  // Service-to-service routes (internal API key auth, not user JWT)
  app.use("/api/moderate", createModerateRouter());

  // Public test endpoint for abuse moderation (no auth, rate-limited)
  app.use("/api/moderate/test", createModerateTestRouter());

  // Vision AI routes (image analysis & matching — no user JWT, callable by other services & frontends)
  app.use("/api/image", createImageRouter());
  app.use("/api/match", createMatchRouter());

  // Protected routes (user JWT auth)
  const auth = createAuthMiddleware(db);
  app.use("/api/chat", auth, createChatRoutes(db));
  app.use("/api/voice", auth, createVoiceRoutes(db));
  app.use("/api/dedup", auth, createDedupRouter(db));
  app.use("/api/quality-score", auth, createQualityRouter());
  app.use("/api/report", auth, createReportRouter(db));

  return app;
}
