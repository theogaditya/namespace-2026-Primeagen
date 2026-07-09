import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for SessionMemoryStore in-memory fallback.
 *
 * We can't easily import the singleton because it auto-connects to Redis.
 * Instead we test the in-memory fallback logic by patching the module.
 * We mock @redis/client so Redis is never actually used.
 */

// Mock Redis before importing
vi.mock("@redis/client", () => ({
  createClient: () => ({
    on: vi.fn(),
    connect: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    quit: vi.fn(),
    isOpen: false,
    get: vi.fn(),
    set: vi.fn(),
    lRange: vi.fn(),
    rPush: vi.fn(),
    lTrim: vi.fn(),
    expire: vi.fn(),
    del: vi.fn(),
  }),
}));

// Now import after mocking
const { sessionMemory } = await import("../lib/memory/sessionMemory");

describe("SessionMemoryStore -in-memory fallback", () => {
  beforeEach(async () => {
    // Connect with Redis unavailable -should fall back to in-memory
    await sessionMemory.connect();
  });

  afterEach(async () => {
    // Clear sessions between tests
    await sessionMemory.clearSession("user1", "sess1");
    await sessionMemory.clearSession("user1", "sess2");
    await sessionMemory.disconnect();
  });

  it("returns empty history for new session", async () => {
    const history = await sessionMemory.getHistory("user1", "sess1");
    expect(history).toEqual([]);
  });

  it("stores and retrieves messages in-memory when Redis is down", async () => {
    await sessionMemory.addMessage("user1", "sess1", "human", "Hello");
    await sessionMemory.addMessage("user1", "sess1", "ai", "Hi there!");

    const history = await sessionMemory.getHistory("user1", "sess1");
    expect(history).toHaveLength(2);
    expect(history[0]!.content).toBe("Hello");
    expect(history[1]!.content).toBe("Hi there!");
  });

  it("keeps sessions isolated by sessionId", async () => {
    await sessionMemory.addMessage("user1", "sess1", "human", "Message A");
    await sessionMemory.addMessage("user1", "sess2", "human", "Message B");

    const h1 = await sessionMemory.getHistory("user1", "sess1");
    const h2 = await sessionMemory.getHistory("user1", "sess2");

    expect(h1).toHaveLength(1);
    expect(h1[0]!.content).toBe("Message A");
    expect(h2).toHaveLength(1);
    expect(h2[0]!.content).toBe("Message B");
  });

  it("caps messages at MAX_MESSAGES (50)", async () => {
    // Add 55 messages
    for (let i = 0; i < 55; i++) {
      await sessionMemory.addMessage("user1", "sess1", "human", `msg-${i}`);
    }

    const history = await sessionMemory.getHistory("user1", "sess1");
    expect(history).toHaveLength(50);
    // Should keep the last 50 (5-54)
    expect(history[0]!.content).toBe("msg-5");
    expect(history[49]!.content).toBe("msg-54");
  });

  it("clearSession removes all messages for a session", async () => {
    await sessionMemory.addMessage("user1", "sess1", "human", "Hello");
    await sessionMemory.addMessage("user1", "sess1", "ai", "Hi");

    await sessionMemory.clearSession("user1", "sess1");
    const history = await sessionMemory.getHistory("user1", "sess1");
    expect(history).toEqual([]);
  });

  it("stores and retrieves complaint state in-memory when Redis is down", async () => {
    await sessionMemory.setComplaintState("user1", "sess1", {
      active: true,
      description: "Overflowing drain near market",
      urgency: "HIGH",
      lastUpdatedAt: Date.now(),
    });

    const complaintState = await sessionMemory.getComplaintState("user1", "sess1");
    expect(complaintState).toBeDefined();
    expect(complaintState?.description).toBe("Overflowing drain near market");
    expect(complaintState?.urgency).toBe("HIGH");
  });

  it("returns correct BaseMessage types (HumanMessage / AIMessage)", async () => {
    await sessionMemory.addMessage("user1", "sess1", "human", "question");
    await sessionMemory.addMessage("user1", "sess1", "ai", "answer");

    const history = await sessionMemory.getHistory("user1", "sess1");
    // LangChain BaseMessage _getType()
    expect(history[0]!._getType()).toBe("human");
    expect(history[1]!._getType()).toBe("ai");
  });
});
