import { createClient, type RedisClientType } from "@redis/client";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import type { ComplaintFlowState } from "../complaintFlow/state";

/**
 * Redis-backed conversation memory with in-memory fallback.
 * Stores message history per session (userId + sessionId).
 * TTL: 30 minutes of inactivity.
 */

const SESSION_TTL_SECONDS = 30 * 60; // 30 minutes
const MAX_MESSAGES = 50; // Cap conversation length
const MEMORY_TTL_MS = SESSION_TTL_SECONDS * 1000;

interface MemoryEntry {
  messages: { role: "human" | "ai"; content: string; timestamp: number }[];
  complaintState?: ComplaintFlowState | null;
  lastAccess: number;
}

class SessionMemoryStore {
  private client: RedisClientType | null = null;
  private redisAvailable = false;

  /** In-memory fallback when Redis is unavailable */
  private memoryStore = new Map<string, MemoryEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  async connect(): Promise<void> {
    if (!this.client) {
      const url = process.env.REDIS_URL || "redis://localhost:6379";
      this.client = createClient({
        url,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              console.warn("[SessionMemory] Redis reconnect limit reached, falling back to in-memory");
              this.redisAvailable = false;
              return false;
            }
            return Math.min(retries * 500, 3000);
          },
        },
      });
      this.client.on("error", (err) => {
        console.error("[SessionMemory] Redis error:", err.message);
        this.redisAvailable = false;
      });
      this.client.on("ready", () => {
        this.redisAvailable = true;
      });
      try {
        await this.client.connect();
        this.redisAvailable = true;
      } catch {
        this.redisAvailable = false;
        console.warn("[SessionMemory] Redis unavailable, using in-memory fallback");
      }
    }

    // Start periodic cleanup for in-memory store
    if (!this.cleanupTimer) {
      this.cleanupTimer = setInterval(() => this.purgeExpiredMemory(), 60_000);
    }
  }

  private purgeExpiredMemory(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryStore) {
      if (now - entry.lastAccess > MEMORY_TTL_MS) {
        this.memoryStore.delete(key);
      }
    }
  }

  private getKey(userId: string, sessionId: string): string {
    return `agent:session:${userId}:${sessionId}`;
  }

  private getStateKey(userId: string, sessionId: string): string {
    return `agent:session_state:${userId}:${sessionId}`;
  }

  async getHistory(userId: string, sessionId: string): Promise<BaseMessage[]> {
    const key = this.getKey(userId, sessionId);

    // Try Redis first
    if (this.redisAvailable && this.client) {
      try {
        const raw = await this.client.lRange(key, 0, -1);
        if (raw && raw.length > 0) {
          return raw.map((entry) => {
            const parsed = JSON.parse(entry);
            return parsed.role === "human"
              ? new HumanMessage(parsed.content)
              : new AIMessage(parsed.content);
          });
        }
      } catch {
        // Fall through to in-memory
      }
    }

    // In-memory fallback
    const entry = this.memoryStore.get(key);
    if (entry) {
      entry.lastAccess = Date.now();
      return entry.messages.map((m) =>
        m.role === "human" ? new HumanMessage(m.content) : new AIMessage(m.content)
      );
    }

    return [];
  }

  async addMessage(userId: string, sessionId: string, role: "human" | "ai", content: string): Promise<void> {
    const key = this.getKey(userId, sessionId);
    const record = { role, content, timestamp: Date.now() };

    // Try Redis first
    if (this.redisAvailable && this.client) {
      try {
        const entry = JSON.stringify(record);
        await this.client.rPush(key, entry);
        await this.client.lTrim(key, -MAX_MESSAGES, -1);
        await this.client.expire(key, SESSION_TTL_SECONDS);
        return;
      } catch {
        // Fall through to in-memory
      }
    }

    // In-memory fallback
    let entry = this.memoryStore.get(key);
    if (!entry) {
      entry = { messages: [], lastAccess: Date.now() };
      this.memoryStore.set(key, entry);
    }
    entry.messages.push(record);
    if (entry.messages.length > MAX_MESSAGES) {
      entry.messages = entry.messages.slice(-MAX_MESSAGES);
    }
    entry.lastAccess = Date.now();
  }

  async getComplaintState(userId: string, sessionId: string): Promise<ComplaintFlowState | null> {
    const key = this.getKey(userId, sessionId);
    const stateKey = this.getStateKey(userId, sessionId);

    if (this.redisAvailable && this.client) {
      try {
        const raw = await this.client.get(stateKey);
        if (raw) {
          return JSON.parse(raw) as ComplaintFlowState;
        }
      } catch {
        // Fall through to in-memory
      }
    }

    const entry = this.memoryStore.get(key);
    if (entry) {
      entry.lastAccess = Date.now();
      return entry.complaintState || null;
    }

    return null;
  }

  async setComplaintState(
    userId: string,
    sessionId: string,
    complaintState: ComplaintFlowState | null
  ): Promise<void> {
    const key = this.getKey(userId, sessionId);
    const stateKey = this.getStateKey(userId, sessionId);

    if (this.redisAvailable && this.client) {
      try {
        if (complaintState) {
          await this.client.set(stateKey, JSON.stringify(complaintState));
          await this.client.expire(stateKey, SESSION_TTL_SECONDS);
        } else {
          await this.client.del(stateKey);
        }
      } catch {
        // Fall through to in-memory
      }
    }

    let entry = this.memoryStore.get(key);
    if (!entry) {
      entry = { messages: [], lastAccess: Date.now() };
      this.memoryStore.set(key, entry);
    }
    entry.complaintState = complaintState;
    entry.lastAccess = Date.now();
  }

  async clearComplaintState(userId: string, sessionId: string): Promise<void> {
    await this.setComplaintState(userId, sessionId, null);
  }

  async clearSession(userId: string, sessionId: string): Promise<void> {
    const key = this.getKey(userId, sessionId);
    const stateKey = this.getStateKey(userId, sessionId);
    this.memoryStore.delete(key);
    if (this.redisAvailable && this.client) {
      try {
        await this.client.del(key);
        await this.client.del(stateKey);
      } catch (error) {
        console.warn("[SessionMemory] Failed to clear session:", error);
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  getClient(): RedisClientType | null {
    return this.redisAvailable ? this.client : null;
  }
}

export const sessionMemory = new SessionMemoryStore();
