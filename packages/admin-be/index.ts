import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import type { Express } from 'express';
import { PrismaClient } from './prisma/generated/client/client';
import agentRoutes from './routes/agent';
import authRoutes from './routes/auth';
import municipalAdminRoutes from './routes/municipalAdminRoutes';
import stateAdminRoutes from './routes/stateAdminRoutes';
import superAdminRoutes from './routes/superAdminRoutes';
import chatRoutes from './routes/chat';
import civicPartnerAuthRoutes from './routes/civicPartnerAuth';
import civicPartnerSurveyRoutes from './routes/civicPartnerSurveys';
import civicPartnerAnalyticsRoutes from './routes/civicPartnerAnalytics';
import publicSurveyRoutes from './routes/publicSurveyRoutes';
import complaintRoutes from './routes/complaint';
// import { complaintProcessingRouter, startComplaintPolling } from './routes/complaintProcessing';
// import { userComplaintsRouter } from './routes/userComplaints';
import { healthPoint } from './routes/health';
import autoAssignRouter, { startAutoAssignPolling } from './routes/autoAssign';
import { startSlaCron } from './lib/slaCron';
import publicAnnouncementRoutes from './routes/publicAnnouncementRoutes';
import aiAgentCTARoutes from './routes/aiAgentCTARoutes';
import blockchainRoutes from './routes/blockchainRoutes';


export class Server {
  private app: Express;
  private db: PrismaClient;

  constructor(db: PrismaClient) {
    this.app = express();
    this.db = db;
    this.setupMiddleware();
    this.setupRoutes();
  }
  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use(cookieParser());

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
  }

  private setupRoutes() {
    // Blockchain Verification Route (High Priority)
    this.app.use('/api/blockchain', blockchainRoutes(this.db));

    this.app.use('/api/auth', authRoutes(this.db));
    this.app.use('/api/super-admin', superAdminRoutes(this.db));
    this.app.use('/api/state-admin', stateAdminRoutes(this.db));


    // CivicPartner feature
    this.app.use('/api/civic-partner/auth', civicPartnerAuthRoutes(this.db));
    this.app.use('/api/civic-partner/surveys', civicPartnerSurveyRoutes(this.db));
    this.app.use('/api/civic-partner/analytics', civicPartnerAnalyticsRoutes(this.db));
    // Public survey endpoints consumed by user-fe (no auth required)
    this.app.use('/api/surveys', publicSurveyRoutes(this.db));
    // Public announcements consumed by user-fe (no auth required)
    this.app.use('/api/public', publicAnnouncementRoutes(this.db));
    this.app.use('/api/municipal-admin', municipalAdminRoutes(this.db));
    this.app.use('/api/agent', agentRoutes(this.db));
    this.app.use('/api/chat', chatRoutes(this.db));
    // Complaint endpoints (re-enabled) — required by admin-fe
    this.app.use('/api/complaints', complaintRoutes(this.db));
    // this.app.use('/api/complaint', complaintProcessingRouter(this.db));
    // this.app.use('/api/users', userComplaintsRouter(this.db));
    this.app.use('/api/auto-assign', autoAssignRouter);

    // AI Agent CTA routes — accessible by State Admin & Super Admin
    this.app.use('/api/agent-cta', aiAgentCTARoutes(this.db));




    this.app.use('/api', healthPoint(this.db));
    this.app.get('/health', (req, res) => {
      res.status(200).send('OK');
    });

    // startComplaintPolling(this.db);
    startAutoAssignPolling();
    startSlaCron(this.db);
  }

  public getApp(): Express {
    return this.app;
  }
}