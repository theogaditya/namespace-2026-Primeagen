import cors from 'cors';
import express from 'express';
import type { Express } from 'express';
import { PrismaClient } from './prisma/generated/client/client';
import { 
  processNextComplaint, 
  startComplaintPolling, 
  stopComplaintPolling, 
  getPollingStatus,
  getQueueStatus 
} from './services/complaintProcessor';

export class Server {
  private app: Express;
  private db: PrismaClient;

  constructor(db: PrismaClient) {
    this.app = express();
    this.db = db;
    this.setupMiddleware();
    this.setupRoutes();
    this.startPolling();
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use(
      cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        preflightContinue: false,
        optionsSuccessStatus: 200,
      })
    );
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        service: 'comp-queue',
        timestamp: new Date().toISOString() 
      });
    });

    // Manual trigger endpoint - process single complaint
    this.app.post("/api/processing", async (req, res) => {
      const result = await processNextComplaint(this.db);

      if (!result.processed && !result.error) {
        return res.status(204).json({
          success: false,
          message: "No complaints in queue",
        });
      }

      if (result.error) {
        return res.status(400).json({
          success: false,
          message: result.error,
        });
      }

      return res.status(201).json({
        success: true,
        message: "Complaint created successfully",
        data: result.result,
      });
    });

    // Start polling endpoint
    this.app.post("/api/processing/start", (req, res) => {
      startComplaintPolling(this.db);
      return res.status(200).json({
        success: true,
        message: "Complaint polling started",
      });
    });

    // Stop polling endpoint
    this.app.post("/api/processing/stop", (req, res) => {
      stopComplaintPolling();
      return res.status(200).json({
        success: true,
        message: "Complaint polling stopped",
      });
    });

    // Polling status endpoint
    this.app.get("/api/processing/status", async (req, res) => {
      try {
        const queueStatus = await getQueueStatus();
        return res.status(200).json({
          success: true,
          isPolling: getPollingStatus(),
          queues: queueStatus,
        });
      } catch (error) {
        return res.status(200).json({
          success: true,
          isPolling: getPollingStatus(),
          queues: null,
          error: 'Failed to get queue status',
        });
      }
    });
  }

  private startPolling() {
    // Auto-start polling when server starts
    startComplaintPolling(this.db);
  }

  public getApp(): Express {
    return this.app;
  }
}
