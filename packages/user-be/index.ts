import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import { PrismaClient } from './prisma/generated/client/client';

//routes
import { helthPoint } from "./routes/helth";
import { addUserRouter } from "./routes/adduser";
import { loginUserRouter } from "./routes/loginUser";
import { logoutUserRouter } from "./routes/logoutUser";
import { createComplaintRouter } from "./routes/createComplaint";
import { getComplaintRouter } from "./routes/getComplaint";
import { districtsRouter } from "./routes/districts";
import { categoriesRouter } from "./routes/categories";
import { createAuthMiddleware } from "./middleware/authRoute";
import { chatRouter } from "./routes/chat";
import { createBadgeRouter } from "./routes/badges";
import { createUserProfileRouter } from "./routes/userProfile";
import { createUserStatsRouter } from "./routes/userStats";
import { createAnnouncementsRouter } from "./routes/announcements";
import { createUpdateProfileRouter } from "./routes/updateProfile";
import { createSurveysRouter, createProtectedSurveysRouter } from "./routes/surveys";

dotenv.config();

export class Server {
  private app: Express;
  private db: PrismaClient;
  private readonly frontEndUser?: string;
  private readonly frontEndUserAlt?: string;
  private readonly backEndUser?: string;
  private readonly worker?: string;
  private readonly frontEndAdmin?: string;
  private readonly backEndAdmin?: string;

  constructor(db: PrismaClient) {
    this.app = express();
    this.db = db;

    this.frontEndUser = process.env.frontend;
    this.frontEndUserAlt = process.env.frontend_alt; // Alternative frontend URL (e.g., Vercel)
    this.backEndUser = process.env.backend;
    this.worker = process.env.worker;
    this.frontEndAdmin = process.env.frontend_admin;
    this.backEndAdmin = process.env.backend_admin;

    this.initializeMiddlewares();
    this.initializeRoutes();
  }

  private initializeMiddlewares(): void {

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
    // CORS must come BEFORE other middleware
    const corsOptions = {
      origin: (origin: string | undefined, callback: Function) => {
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
    this.app.use(cors(corsOptions));
    this.app.options('/{*path}', cors(corsOptions));

    this.app.use(express.json());
    this.app.use(helmet());
    this.app.use(compression());
  }

  private initializeRoutes(): void {
    // Auth middleware      this.app.use('/api/complaints/get', authMiddleware, getComplaintRouter(this.db));
    const authMiddleware = createAuthMiddleware(this.db);

    // Public routes (no auth required)
    this.app.use('/api', helthPoint(this.db));
    this.app.use('/api/users', addUserRouter(this.db));
    this.app.use('/api/users', loginUserRouter(this.db));
    this.app.use('/api/districts', districtsRouter(this.db));
    this.app.use('/api/categories', categoriesRouter(this.db));
    this.app.use('/api/user', createUserProfileRouter(this.db)); // Public user profile route
    this.app.use('/api/surveys', createSurveysRouter(this.db)); // Public surveys listing

    // Protected routes (auth required)
    this.app.use('/api/users', logoutUserRouter(this.db));
    this.app.use('/api/complaints', authMiddleware, createComplaintRouter(this.db));
    this.app.use('/api/complaints/get', authMiddleware, getComplaintRouter(this.db));
    // User chat routes (authenticated)
    this.app.use('/api/chat', authMiddleware, chatRouter(this.db));
    // Badge routes (authenticated)
    this.app.use('/api/badges', authMiddleware, createBadgeRouter());
    // User stats route (authenticated)
    this.app.use('/api/users', authMiddleware, createUserStatsRouter(this.db));
    // Announcements route (authenticated)
    this.app.use('/api/announcements', authMiddleware, createAnnouncementsRouter(this.db));
    // Profile update route (authenticated)
    this.app.use('/api/users', authMiddleware, createUpdateProfileRouter(this.db));
    // Protected surveys routes (authenticated)
    this.app.use('/api/surveys', authMiddleware, createProtectedSurveysRouter(this.db));
  }

  public getApp(): Express {
    return this.app;
  }

}
