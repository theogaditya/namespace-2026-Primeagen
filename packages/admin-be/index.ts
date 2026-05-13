import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import type { Express } from 'express';
import { PrismaClient } from './prisma/generated/client/client';
import agentRoutes from './routes/agent';
import municipalAdminRoutes from './routes/municipalAdminRoutes';
import stateAdminRoutes from './routes/stateAdminRoutes';
import superAdminRoutes from './routes/superAdminRoutes';
import { complaintProcessingRouter, startComplaintPolling } from './routes/complaintProcessing';
import { userComplaintsRouter } from './routes/userComplaints';
import { healthPoint } from './routes/health';
import autoAssignRouter, { startAutoAssignPolling } from './routes/autoAssign';

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
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3003',
      'http://localhost:3001',
      'https://admin.swarajdesk.co.in'
    ];

    this.app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
          }
          console.warn('Blocked CORS request from origin:', origin);
          return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        preflightContinue: false,
        optionsSuccessStatus: 200,
      })
    );
  }

  private setupRoutes() {
    this.app.use('/api/super-admin', superAdminRoutes(this.db));
    this.app.use('/api/state-admin', stateAdminRoutes(this.db));
    this.app.use('/api/municipal-admin', municipalAdminRoutes(this.db));
    this.app.use('/api/agent', agentRoutes(this.db));
    this.app.use('/api/complaint', complaintProcessingRouter(this.db));
    this.app.use('/api/users', userComplaintsRouter(this.db));
    this.app.use('/api/auto-assign', autoAssignRouter);
  
    this.app.use('/api', healthPoint(this.db));
    this.app.get('/health', (req, res) => {
      res.status(200).send('OK');
    });

    startComplaintPolling(this.db);
    startAutoAssignPolling();
  }

  public getApp(): Express {
    return this.app;
  }
}