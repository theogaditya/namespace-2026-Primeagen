import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies before imports
vi.mock('../lib/redis/tokenBlacklistService', () => ({
  tokenBlacklistService: {
    blacklistToken: vi.fn().mockResolvedValue(undefined),
    isBlacklisted: vi.fn().mockResolvedValue(false),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  }
}));

vi.mock('../lib/redis/likeCounterService', () => ({
  getLikeCounterService: vi.fn().mockReturnValue({
    isReady: vi.fn().mockReturnValue(false),
    connect: vi.fn().mockResolvedValue(undefined),
    getUserLikes: vi.fn().mockResolvedValue([]),
    addUserLike: vi.fn().mockResolvedValue(undefined),
    removeUserLike: vi.fn().mockResolvedValue(undefined),
    incrementLikeCount: vi.fn().mockResolvedValue(1),
    decrementLikeCount: vi.fn().mockResolvedValue(0),
    publishUpdate: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { WsHandler, WsMessageType, createWsHandler } from '../lib/websocket/wsHandler';
import { likeStore } from '../lib/likes/inMemoryLikeStore';
import jwt from 'jsonwebtoken';
import prismaMock from '../lib/_mocks_/prisma';

const JWT_SECRET = 'my123';

// Mock ServerWebSocket
function createMockWs() {
  return {
    data: {
      userId: null,
      isAuthenticated: false,
      subscribedTopics: new Set<string>(),
      lastActivity: Date.now(),
    },
    send: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  } as any;
}

// Mock server for broadcasts
function createMockServer() {
  return {
    publish: vi.fn(),
  };
}

describe('WsHandler', () => {
  let handler: WsHandler;
  let mockWs: ReturnType<typeof createMockWs>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    handler = createWsHandler(prismaMock);
    mockWs = createMockWs();
    mockServer = createMockServer();
    likeStore.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseMessage', () => {
    it('should parse valid JSON string', () => {
      const message = JSON.stringify({ type: 'ping', payload: {} });
      const result = handler.parseMessage(message);
      
      expect(result).toEqual({ type: 'ping', payload: {} });
    });

    it('should parse Buffer message', () => {
      const message = Buffer.from(JSON.stringify({ type: 'ping' }));
      const result = handler.parseMessage(message);
      
      expect(result).toEqual({ type: 'ping' });
    });

    it('should return null for invalid JSON', () => {
      const result = handler.parseMessage('invalid json');
      expect(result).toBeNull();
    });
  });

  describe('createMessage', () => {
    it('should create message with type and payload', () => {
      const message = handler.createMessage(WsMessageType.PONG, { test: true });
      const parsed = JSON.parse(message);
      
      expect(parsed.type).toBe(WsMessageType.PONG);
      expect(parsed.payload).toEqual({ test: true });
      expect(parsed.timestamp).toBeDefined();
    });

    it('should create message without payload', () => {
      const message = handler.createMessage(WsMessageType.PING);
      const parsed = JSON.parse(message);
      
      expect(parsed.type).toBe(WsMessageType.PING);
      expect(parsed.payload).toBeUndefined();
    });
  });

  describe('authenticate', () => {
    it('should reject missing token', async () => {
      const result = await handler.authenticate(mockWs, { token: '' });
      
      expect(result).toBe(false);
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('auth_error'));
    });

    it('should reject invalid token', async () => {
      const result = await handler.authenticate(mockWs, { token: 'invalid-token' });
      
      expect(result).toBe(false);
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('auth_error'));
    });

    it('should authenticate valid token', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', name: 'Test' },
        JWT_SECRET
      );
      
      // Mock user exists
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        status: 'ACTIVE',
      } as any);
      
      // Mock upvotes for loading
      prismaMock.upvote.findMany.mockResolvedValue([]);
      
      const result = await handler.authenticate(mockWs, { token });
      
      expect(result).toBe(true);
      expect(mockWs.data.userId).toBe('user-123');
      expect(mockWs.data.isAuthenticated).toBe(true);
      expect(mockWs.subscribe).toHaveBeenCalledWith('likes:global');
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('auth_success'));
    });

    it('should reject inactive user', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', name: 'Test' },
        JWT_SECRET
      );
      
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        status: 'SUSPENDED',
      } as any);
      
      const result = await handler.authenticate(mockWs, { token });
      
      expect(result).toBe(false);
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('auth_error'));
    });
  });

  describe('handleLike', () => {
    beforeEach(() => {
      mockWs.data.isAuthenticated = true;
      mockWs.data.userId = 'user-123';
    });

    it('should reject unauthenticated user', async () => {
      mockWs.data.isAuthenticated = false;
      mockWs.data.userId = null;
      
      await handler.handleLike(mockWs, { complaintId: 'complaint-1' }, mockServer);
      
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('like_error'));
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('Authentication required'));
    });

    it('should reject invalid complaintId', async () => {
      await handler.handleLike(mockWs, { complaintId: 'invalid-uuid' }, mockServer);
      
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('like_error'));
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('Invalid complaintId'));
    });

    it('should reject missing complaintId', async () => {
      await handler.handleLike(mockWs, { complaintId: '' }, mockServer);
      
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('like_error'));
    });

    it('should successfully like a complaint', async () => {
      const complaintId = '123e4567-e89b-12d3-a456-426614174000';
      
      await handler.handleLike(mockWs, { complaintId }, mockServer);
      
      // Check user was sent the update
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('like_update'));
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentMessage.payload.complaintId).toBe(complaintId);
      expect(sentMessage.payload.liked).toBe(true);
      expect(sentMessage.payload.count).toBe(1);
      
      // Check broadcast was sent
      expect(mockServer.publish).toHaveBeenCalledWith('likes:global', expect.any(String));
      
      // Check like was stored
      expect(likeStore.hasLiked('user-123', complaintId)).toBe(true);
    });

    it('should toggle unlike when already liked', async () => {
      const complaintId = '123e4567-e89b-12d3-a456-426614174000';
      
      // Like first
      await handler.handleLike(mockWs, { complaintId }, mockServer);
      vi.clearAllMocks();
      
      // Unlike
      await handler.handleLike(mockWs, { complaintId }, mockServer);
      
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentMessage.payload.liked).toBe(false);
      expect(sentMessage.payload.count).toBe(0);
      
      expect(likeStore.hasLiked('user-123', complaintId)).toBe(false);
    });
  });

  describe('handleSubscribe', () => {
    it('should subscribe to topic', () => {
      handler.handleSubscribe(mockWs, { topic: 'complaint:123' });
      
      expect(mockWs.subscribe).toHaveBeenCalledWith('complaint:123');
      expect(mockWs.data.subscribedTopics.has('complaint:123')).toBe(true);
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('subscribed'));
    });

    it('should reject empty topic', () => {
      handler.handleSubscribe(mockWs, { topic: '' });
      
      expect(mockWs.subscribe).not.toHaveBeenCalled();
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('error'));
    });
  });

  describe('handleUnsubscribe', () => {
    it('should unsubscribe from topic', () => {
      mockWs.data.subscribedTopics.add('complaint:123');
      
      handler.handleUnsubscribe(mockWs, { topic: 'complaint:123' });
      
      expect(mockWs.unsubscribe).toHaveBeenCalledWith('complaint:123');
      expect(mockWs.data.subscribedTopics.has('complaint:123')).toBe(false);
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('unsubscribed'));
    });
  });

  describe('handlePing', () => {
    it('should respond with pong and update lastActivity', () => {
      const beforeTime = mockWs.data.lastActivity;
      
      handler.handlePing(mockWs);
      
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('pong'));
      expect(mockWs.data.lastActivity).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe('processMessage', () => {
    it('should handle ping message', async () => {
      const message = JSON.stringify({ type: 'ping' });
      
      await handler.processMessage(mockWs, message, mockServer);
      
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('pong'));
    });

    it('should handle invalid message format', async () => {
      await handler.processMessage(mockWs, 'invalid', mockServer);
      
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('error'));
    });

    it('should handle unknown message type', async () => {
      const message = JSON.stringify({ type: 'unknown_type' });
      
      await handler.processMessage(mockWs, message, mockServer);
      
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('error'));
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('Unknown message type'));
    });
  });

  describe('handleClose', () => {
    it('should clean up subscriptions on close', () => {
      mockWs.data.subscribedTopics.add('topic1');
      mockWs.data.subscribedTopics.add('topic2');
      
      handler.handleClose(mockWs);
      
      expect(mockWs.unsubscribe).toHaveBeenCalledWith('topic1');
      expect(mockWs.unsubscribe).toHaveBeenCalledWith('topic2');
      expect(mockWs.data.subscribedTopics.size).toBe(0);
    });
  });

  describe('createUserData', () => {
    it('should create default user data', () => {
      const userData = handler.createUserData();
      
      expect(userData.userId).toBeNull();
      expect(userData.isAuthenticated).toBe(false);
      expect(userData.subscribedTopics).toBeInstanceOf(Set);
      expect(userData.subscribedTopics.size).toBe(0);
      expect(userData.lastActivity).toBeDefined();
    });
  });
});
