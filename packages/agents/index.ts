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

  const ALLOWED_ORIGINS = [
    "https://gsc-admin-fe.abhasbehera.in",
    "https://gsc-user-fe.abhasbehera.in",
    "https://gsc-user-be.abhasbehera.in",
    "https://gsc-ws-user-be.abhasbehera.in",
    "https://gsc-admin-be.abhasbehera.in",
    "https://gsc-comp-queue.abhasbehera.in",
    "https://gsc-agents-be.abhasbehera.in",
    "https://gsc-blockchain-be.abhasbehera.in",
    "https://gsc-report-ai.abhasbehera.in",
    "https://gsc-monitoring.abhasbehera.in",
    "https://gsc-kuma.abhasbehera.in",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:4000",
    "http://localhost:8000",
    "http://localhost:8001",
  ];

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  };

  // Security & parsing
  app.use(helmet());
  app.use(cors(corsOptions) as unknown as RequestHandler);
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