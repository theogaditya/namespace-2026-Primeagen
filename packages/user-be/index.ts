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

dotenv.config();

export class Server {
  private app: Express;
  private db: PrismaClient;
  private readonly frontEndUser?: string;
  private readonly backEndUser?: string;
  private readonly worker?: string;
  private readonly frontEndAdmin?: string;
  private readonly backEndAdmin?: string;

  constructor(db: PrismaClient) {
    this.app = express();
    this.db = db;
    this.app.use(helmet());
    this.app.use(compression());

    this.backEndUser = process.env.frontend;
    this.backEndUser = process.env.backend;
    this.worker = process.env.worker;
    this.frontEndAdmin = process.env.frontend_admin;
    this.backEndAdmin = process.env.backend_admin;

    this.initializeMiddlewares();
    this.initializeRoutes();
  }

    private initializeMiddlewares(): void {
    this.app.use(express.json());
    this.app.use(helmet());
    this.app.use(compression());

    const devWhitelist = [this.frontEndUser, this.backEndUser, this.worker, this.frontEndAdmin, this.backEndAdmin]
    //const devWhitelist = ["*"]

    const corsOptions = {
      origin: (origin: any, cb: any) => {
        console.log("[CORS] incoming Origin:", origin);
        if (!origin) return cb(null, true);
        if (process.env.NODE_ENV !== "production") {
          if (devWhitelist.includes(origin)) return cb(null, true);
          return cb(null, true);
        }
        return cb(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
      optionsSuccessStatus: 204,
    };

    this.app.use(cors(corsOptions));
  }

    private initializeRoutes(): void {
      // Auth middleware      this.app.use('/api/complaints/get', authMiddleware, getComplaintRouter(this.db));
      const authMiddleware = createAuthMiddleware(this.db);
      
      // Public routes (no auth required)
      this.app.use('/api',helthPoint(this.db));
      this.app.use('/api/users', addUserRouter(this.db));
      this.app.use('/api/users', loginUserRouter(this.db));
      this.app.use('/api/districts', districtsRouter(this.db));
      this.app.use('/api/categories', categoriesRouter(this.db));
      this.app.use('/api/user', createUserProfileRouter(this.db)); // Public user profile route
      
      // Protected routes (auth required)
      this.app.use('/api/users', logoutUserRouter(this.db));
      this.app.use('/api/complaints', authMiddleware, createComplaintRouter(this.db));
      this.app.use('/api/complaints/get', authMiddleware, getComplaintRouter(this.db));
      // User chat routes (authenticated)
      this.app.use('/api/chat', authMiddleware, chatRouter(this.db));
      // Badge routes (authenticated)
      this.app.use('/api/badges', authMiddleware, createBadgeRouter());
    }

  public getApp(): Express {
    return this.app;
  }

}

