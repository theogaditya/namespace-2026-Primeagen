/**
 * Bun Native WebSocket Server
 * 
 * Ultra-fast WebSocket server using Bun's built-in WebSocket support.
 * Handles real-time like updates with topics for efficient broadcasting.
 */

import type { Server, ServerWebSocket } from "bun";
import { PrismaClient } from "../../prisma/generated/client/client";
import { createWsHandler, WsHandler, WsUserData } from "./wsHandler";
import { getLikeCounterService } from "../redis/likeCounterService";
import { createLikeSyncWorker, LikeSyncWorker } from "../likes/likeSyncWorker";
import { likeStore } from "../likes/inMemoryLikeStore";

export interface BunWsServerConfig {
  port: number;
  db: PrismaClient;
}

export class BunWsServer {
  private server: Server<WsUserData> | null = null;
  private wsHandler: WsHandler;
  private syncWorker: LikeSyncWorker;
  private db: PrismaClient;
  private port: number;
  
  constructor(config: BunWsServerConfig) {
    this.db = config.db;
    this.port = config.port;
    this.wsHandler = createWsHandler(config.db);
    this.syncWorker = createLikeSyncWorker(config.db);
  }
  
  /**
   * Start the WebSocket server
   */
  async start(): Promise<Server<WsUserData>> {
    // Initialize Redis like counter service
    try {
      const redisService = getLikeCounterService();
      await redisService.connect();
      
      // Subscribe to Redis pub/sub for multi-instance sync
      await redisService.subscribeToUpdates((data) => {
        // Update local memory store
        likeStore.setLikeCount(data.complaintId, data.newCount);
        
        // Broadcast to all connected clients
        if (this.server) {
          this.server.publish("likes:global", JSON.stringify({
            type: "like_update",
            payload: {
              complaintId: data.complaintId,
              count: data.newCount,
            },
            timestamp: data.timestamp,
          }));
        }
      });
    } catch (error) {
      console.warn("⚠️ Redis not available, running in memory-only mode:", error);
    }
    
    // Start sync worker
    this.syncWorker.start();
    
    // Create Bun WebSocket server
    const wsHandler = this.wsHandler;
    
    this.server = Bun.serve<WsUserData>({
      port: this.port,
      
      fetch(req, server) {
        // Handle WebSocket upgrade
        const url = new URL(req.url);
        
        if (url.pathname === "/ws" || url.pathname === "/ws/") {
          const upgraded = server.upgrade(req, {
            data: wsHandler.createUserData(),
          });
          
          if (upgraded) {
            return undefined; // Upgrade successful
          }
          
          return new Response("WebSocket upgrade failed", { status: 400 });
        }
        
        // Health check endpoint
        if (url.pathname === "/health" || url.pathname === "/ws/health") {
          return new Response(JSON.stringify({
            status: "healthy",
            type: "websocket",
            connections: likeStore.getStats().totalUsers,
            timestamp: new Date().toISOString(),
          }), {
            headers: { "Content-Type": "application/json" },
          });
        }
        
        // Stats endpoint
        if (url.pathname === "/stats" || url.pathname === "/ws/stats") {
          return new Response(JSON.stringify({
            ...likeStore.getStats(),
            timestamp: new Date().toISOString(),
          }), {
            headers: { "Content-Type": "application/json" },
          });
        }
        
        return new Response("Not Found", { status: 404 });
      },
      
      websocket: {
        // Called when a message is received
        async message(ws: ServerWebSocket<WsUserData>, message: string | Buffer) {
          try {
            await wsHandler.processMessage(ws, message, ws);
          } catch (error) {
            console.error("WebSocket message error:", error);
            ws.send(JSON.stringify({
              type: "error",
              payload: { error: "Internal server error" },
              timestamp: Date.now(),
            }));
          }
        },
        
        // Called when connection is opened
        open(ws: ServerWebSocket<WsUserData>) {
          console.log(`🔌 WebSocket connected`);
        },
        
        // Called when connection is closed
        close(ws: ServerWebSocket<WsUserData>, code: number, reason: string) {
          console.log(`🔌 WebSocket disconnected: ${code} - ${reason}`);
          wsHandler.handleClose(ws);
        },
        
        // Called on drain (when backpressure is relieved)
        drain(ws: ServerWebSocket<WsUserData>) {
          // Can be used for flow control if needed
        },
        
        // Settings for stable connections
        perMessageDeflate: false, // Disable compression for lower latency
        maxPayloadLength: 64 * 1024, // 64KB max message size
        idleTimeout: 0, // Disable idle timeout - we handle keepalive ourselves
        sendPings: true, // Enable Bun's automatic ping/pong
        closeOnBackpressureLimit: false, // Don't close on backpressure
      },
    });
    
    console.log(`🚀 WebSocket server running on ws://localhost:${this.port}/ws`);
    
    return this.server;
  }
  
  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    // Force sync pending likes before shutdown
    await this.syncWorker.forceSync();
    this.syncWorker.stop();
    
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
    
    // Disconnect Redis
    try {
      const redisService = getLikeCounterService();
      await redisService.disconnect();
    } catch (error) {
      console.warn("Error disconnecting Redis:", error);
    }
    
    console.log("🛑 WebSocket server stopped");
  }
  
  /**
   * Get server instance
   */
  getServer(): Server<WsUserData> | null {
    return this.server;
  }
  
  /**
   * Broadcast message to a topic
   */
  broadcast(topic: string, message: string): void {
    if (this.server) {
      this.server.publish(topic, message);
    }
  }
}

// Factory function
export function createBunWsServer(config: BunWsServerConfig): BunWsServer {
  return new BunWsServer(config);
}
