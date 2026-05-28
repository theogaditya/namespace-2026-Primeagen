/**
 * WebSocket Message Types and Handlers
 * 
 * Defines the protocol for WebSocket communication and handles
 * authentication and message processing.
 */

import jwt from "jsonwebtoken";
import { PrismaClient } from "../../prisma/generated/client/client";
import { tokenBlacklistService } from "../redis/tokenBlacklistService";
import { likeStore } from "../likes/inMemoryLikeStore";
import { getLikeCounterService, LikeUpdateMessage } from "../redis/likeCounterService";
import type { ServerWebSocket } from "bun";

const JWT_SECRET = process.env.JWT_SECRET || "my123";

// ============================================
// WebSocket Message Types
// ============================================

export enum WsMessageType {
  // Client → Server
  AUTH = "auth",
  LIKE = "like",
  SUBSCRIBE = "subscribe",
  UNSUBSCRIBE = "unsubscribe",
  PING = "ping",
  
  // Server → Client
  AUTH_SUCCESS = "auth_success",
  AUTH_ERROR = "auth_error",
  LIKE_UPDATE = "like_update",
  LIKE_ERROR = "like_error",
  SUBSCRIBED = "subscribed",
  UNSUBSCRIBED = "unsubscribed",
  PONG = "pong",
  ERROR = "error",
}

export interface WsMessage {
  type: WsMessageType;
  payload?: any;
  timestamp?: number;
}

export interface AuthPayload {
  token: string;
}

export interface LikePayload {
  complaintId: string;
}

export interface SubscribePayload {
  topic: string; // e.g., "complaint:123" or "feed:trending"
}

export interface LikeUpdatePayload {
  complaintId: string;
  count: number;
  liked?: boolean; // Only included for the user who triggered the action
}

// ============================================
// WebSocket Data attached to each connection
// ============================================

export interface WsUserData {
  userId: string | null;
  isAuthenticated: boolean;
  subscribedTopics: Set<string>;
  lastActivity: number;
}

// ============================================
// JWT Payload Interface
// ============================================

interface JwtPayload {
  userId: string;
  email: string;
  name: string;
}

// ============================================
// WebSocket Handler Class
// ============================================

export class WsHandler {
  private db: PrismaClient;
  
  constructor(db: PrismaClient) {
    this.db = db;
  }
  
  /**
   * Parse incoming WebSocket message
   */
  parseMessage(message: string | Buffer): WsMessage | null {
    try {
      const data = typeof message === 'string' 
        ? message 
        : message.toString('utf-8');
      return JSON.parse(data) as WsMessage;
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      return null;
    }
  }
  
  /**
   * Create a WebSocket response message
   */
  createMessage(type: WsMessageType, payload?: any): string {
    const message: WsMessage = {
      type,
      payload,
      timestamp: Date.now(),
    };
    return JSON.stringify(message);
  }
  
  /**
   * Authenticate a WebSocket connection
   */
  async authenticate(
    ws: ServerWebSocket<WsUserData>,
    payload: AuthPayload
  ): Promise<boolean> {
    try {
      const { token } = payload;
      
      if (!token) {
        ws.send(this.createMessage(WsMessageType.AUTH_ERROR, {
          error: "Token is required",
        }));
        return false;
      }
      
      // Check if token is blacklisted
      const isBlacklisted = await tokenBlacklistService.isBlacklisted(token);
      if (isBlacklisted) {
        ws.send(this.createMessage(WsMessageType.AUTH_ERROR, {
          error: "Token has been invalidated",
        }));
        return false;
      }
      
      // Verify JWT
      let decoded: JwtPayload;
      try {
        decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      } catch (err) {
        ws.send(this.createMessage(WsMessageType.AUTH_ERROR, {
          error: "Invalid or expired token",
        }));
        return false;
      }
      
      // Verify user exists and is active
      const user = await this.db.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, status: true },
      });
      
      if (!user || user.status !== "ACTIVE") {
        ws.send(this.createMessage(WsMessageType.AUTH_ERROR, {
          error: "User not found or inactive",
        }));
        return false;
      }
      
      // Update WebSocket data
      ws.data.userId = decoded.userId;
      ws.data.isAuthenticated = true;
      ws.data.lastActivity = Date.now();
      
      // Load user's likes into memory
      await this.loadUserLikes(decoded.userId);
      
      // Subscribe to global likes topic
      ws.subscribe("likes:global");
      
      ws.send(this.createMessage(WsMessageType.AUTH_SUCCESS, {
        userId: decoded.userId,
        message: "Authentication successful",
      }));
      
      return true;
    } catch (error) {
      console.error('Authentication error:', error);
      ws.send(this.createMessage(WsMessageType.AUTH_ERROR, {
        error: "Authentication failed",
      }));
      return false;
    }
  }
  
  /**
   * Load user's likes from Redis/DB into memory
   */
  async loadUserLikes(userId: string): Promise<void> {
    try {
      const redisService = getLikeCounterService();
      
      if (redisService.isReady()) {
        // Try Redis first (faster)
        const likedComplaints = await redisService.getUserLikes(userId);
        likeStore.loadUserLikes(userId, likedComplaints);
      } else {
        // Fallback to DB
        const upvotes = await this.db.upvote.findMany({
          where: { userId },
          select: { complaintId: true },
        });
        likeStore.loadUserLikes(userId, upvotes.map(u => u.complaintId));
      }
    } catch (error) {
      console.error('Error loading user likes:', error);
    }
  }
  
  /**
   * Handle like/unlike action
   */
  async handleLike(
    ws: ServerWebSocket<WsUserData>,
    payload: LikePayload,
    server: any // Bun.Server type
  ): Promise<void> {
    if (!ws.data.isAuthenticated || !ws.data.userId) {
      ws.send(this.createMessage(WsMessageType.LIKE_ERROR, {
        error: "Authentication required",
      }));
      return;
    }
    
    const { complaintId } = payload;
    
    if (!complaintId) {
      ws.send(this.createMessage(WsMessageType.LIKE_ERROR, {
        error: "complaintId is required",
      }));
      return;
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(complaintId)) {
      ws.send(this.createMessage(WsMessageType.LIKE_ERROR, {
        error: "Invalid complaintId format",
      }));
      return;
    }
    
    try {
      const userId = ws.data.userId;
      
      // Toggle in memory store (O(1))
      const result = likeStore.toggle(userId, complaintId);
      
      // Also update Redis (async, non-blocking)
      const redisService = getLikeCounterService();
      if (redisService.isReady()) {
        // Fire and forget - don't await
        (async () => {
          try {
            if (result.liked) {
              await redisService.addUserLike(userId, complaintId);
              await redisService.incrementLikeCount(complaintId);
            } else {
              await redisService.removeUserLike(userId, complaintId);
              await redisService.decrementLikeCount(complaintId);
            }
            
            // Publish update for multi-instance sync
            await redisService.publishUpdate({
              type: result.liked ? 'like' : 'unlike',
              userId,
              complaintId,
              newCount: result.count,
              timestamp: Date.now(),
            });
          } catch (err) {
            console.error('Redis update error (non-blocking):', err);
          }
        })();
      }
      
      // Send confirmation to the user who liked
      ws.send(this.createMessage(WsMessageType.LIKE_UPDATE, {
        complaintId,
        count: result.count,
        liked: result.liked,
      }));
      
      // Broadcast to all subscribers (except sender)
      const broadcastMessage = this.createMessage(WsMessageType.LIKE_UPDATE, {
        complaintId,
        count: result.count,
      });
      
      server.publish("likes:global", broadcastMessage);
      
      // Update last activity
      ws.data.lastActivity = Date.now();
      
    } catch (error) {
      console.error('Like error:', error);
      ws.send(this.createMessage(WsMessageType.LIKE_ERROR, {
        error: "Failed to process like",
        complaintId,
      }));
    }
  }
  
  /**
   * Handle topic subscription
   */
  handleSubscribe(
    ws: ServerWebSocket<WsUserData>,
    payload: SubscribePayload
  ): void {
    const { topic } = payload;
    
    if (!topic) {
      ws.send(this.createMessage(WsMessageType.ERROR, {
        error: "Topic is required",
      }));
      return;
    }
    
    ws.subscribe(topic);
    ws.data.subscribedTopics.add(topic);
    
    ws.send(this.createMessage(WsMessageType.SUBSCRIBED, { topic }));
  }
  
  /**
   * Handle topic unsubscription
   */
  handleUnsubscribe(
    ws: ServerWebSocket<WsUserData>,
    payload: SubscribePayload
  ): void {
    const { topic } = payload;
    
    if (!topic) {
      ws.send(this.createMessage(WsMessageType.ERROR, {
        error: "Topic is required",
      }));
      return;
    }
    
    ws.unsubscribe(topic);
    ws.data.subscribedTopics.delete(topic);
    
    ws.send(this.createMessage(WsMessageType.UNSUBSCRIBED, { topic }));
  }
  
  /**
   * Handle ping (for keep-alive)
   */
  handlePing(ws: ServerWebSocket<WsUserData>): void {
    ws.data.lastActivity = Date.now();
    ws.send(this.createMessage(WsMessageType.PONG, {
      serverTime: Date.now(),
    }));
  }
  
  /**
   * Process incoming WebSocket message
   */
  async processMessage(
    ws: ServerWebSocket<WsUserData>,
    message: string | Buffer,
    server: any
  ): Promise<void> {
    const parsed = this.parseMessage(message);
    
    if (!parsed) {
      ws.send(this.createMessage(WsMessageType.ERROR, {
        error: "Invalid message format",
      }));
      return;
    }
    
    switch (parsed.type) {
      case WsMessageType.AUTH:
        await this.authenticate(ws, parsed.payload as AuthPayload);
        break;
        
      case WsMessageType.LIKE:
        await this.handleLike(ws, parsed.payload as LikePayload, server);
        break;
        
      case WsMessageType.SUBSCRIBE:
        this.handleSubscribe(ws, parsed.payload as SubscribePayload);
        break;
        
      case WsMessageType.UNSUBSCRIBE:
        this.handleUnsubscribe(ws, parsed.payload as SubscribePayload);
        break;
        
      case WsMessageType.PING:
        this.handlePing(ws);
        break;
        
      default:
        ws.send(this.createMessage(WsMessageType.ERROR, {
          error: `Unknown message type: ${parsed.type}`,
        }));
    }
  }
  
  /**
   * Handle connection close
   */
  handleClose(ws: ServerWebSocket<WsUserData>): void {
    // Clean up subscriptions
    for (const topic of ws.data.subscribedTopics) {
      ws.unsubscribe(topic);
    }
    ws.data.subscribedTopics.clear();
    
    // Note: We don't clear user likes from memory on disconnect
    // as other connections might still need them
  }
  
  /**
   * Create initial user data for new connections
   */
  createUserData(): WsUserData {
    return {
      userId: null,
      isAuthenticated: false,
      subscribedTopics: new Set(),
      lastActivity: Date.now(),
    };
  }
}

// Factory function
export function createWsHandler(db: PrismaClient): WsHandler {
  return new WsHandler(db);
}
