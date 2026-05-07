import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import type { Express } from 'express';
import { PrismaClient } from './prisma/generated/client/client';

export class Server {
  private app: Express;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.app = express();
    this.prisma = prisma;
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use(cookieParser());
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3003',
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
    const superAdminRoutes = require('./routes/superAdminRoutes').default(this.prisma);
    const stateAdminRoutes = require('./routes/stateAdminRoutes').default(this.prisma);
    const municipalAdminRoutes = require('./routes/municipalAdminRoutes').default(this.prisma);
    const agentRoutes = require('./routes/agent').default(this.prisma);

    this.app.use('/api/super-admin', superAdminRoutes);
    this.app.use('/api/state-admin', stateAdminRoutes);
    this.app.use('/api/municipal-admin', municipalAdminRoutes);
    this.app.use('/api/agent', agentRoutes);

    this.app.get('/health', (req, res) => {
      res.status(200).send('OK');
    });
  }

  public getApp(): Express {
    return this.app;
  }
}