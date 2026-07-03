import { describe, it, expect, vi } from "vitest";

/**
 * Tests for upvoteComplaint tool -tests the logic without a real DB.
 * We mock PrismaClient to verify query behavior.
 */

import { createUpvoteComplaintTool } from "../../lib/tools/upvoteComplaint";

function createMockDb(overrides: any = {}) {
  return {
    complaint: {
      findUnique: overrides.findUnique ?? vi.fn().mockResolvedValue(null),
    },
    upvote: {
      findUnique: overrides.upvoteFindUnique ?? vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: overrides.transaction ?? vi.fn().mockResolvedValue([]),
  } as any;
}

describe("upvoteComplaint", () => {
  it("requires _userId", async () => {
    const db = createMockDb();
    const tool = createUpvoteComplaintTool(db);
    const result = await tool.func({ _userId: null, complaintNumber: 1 });
    const parsed = JSON.parse(result);
    expect(parsed.error).toContain("logged in");
  });

  it("returns error for non-existent complaint", async () => {
    const db = createMockDb({
      findUnique: vi.fn().mockResolvedValue(null),
    });
    const tool = createUpvoteComplaintTool(db);
    const result = await tool.func({ _userId: "user1", complaintNumber: 999 });
    const parsed = JSON.parse(result);
    expect(parsed.error).toContain("#999");
  });

  it("returns error for non-public complaint", async () => {
    const db = createMockDb({
      findUnique: vi.fn().mockResolvedValue({ id: "c1", isPublic: false, seq: 5, upvoteCount: 3 }),
    });
    const tool = createUpvoteComplaintTool(db);
    const result = await tool.func({ _userId: "user1", complaintNumber: 5 });
    const parsed = JSON.parse(result);
    expect(parsed.error).toContain("not public");
  });

  it("detects already-upvoted complaint", async () => {
    const db = createMockDb({
      findUnique: vi.fn().mockResolvedValue({ id: "c1", isPublic: true, seq: 5, upvoteCount: 10 }),
      upvoteFindUnique: vi.fn().mockResolvedValue({ id: "upvote1" }),
    });
    const tool = createUpvoteComplaintTool(db);
    const result = await tool.func({ _userId: "user1", complaintNumber: 5 });
    const parsed = JSON.parse(result);
    expect(parsed.message).toContain("already upvoted");
    expect(parsed.currentUpvotes).toBe(10);
  });

  it("successfully upvotes and returns new count", async () => {
    const db = createMockDb({
      findUnique: vi.fn().mockResolvedValue({ id: "c1", isPublic: true, seq: 5, upvoteCount: 10 }),
      upvoteFindUnique: vi.fn().mockResolvedValue(null),
      transaction: vi.fn().mockResolvedValue([]),
    });
    // Also need complaint.update (called inside $transaction array)
    db.complaint.update = vi.fn().mockResolvedValue({});
    const tool = createUpvoteComplaintTool(db);
    const result = await tool.func({ _userId: "user1", complaintNumber: 5 });
    const parsed = JSON.parse(result);
    expect(parsed.message).toContain("successfully");
    expect(parsed.newUpvoteCount).toBe(11);
    expect(db.$transaction).toHaveBeenCalled();
  });

  it("has _userId in schema (for bindUserId)", () => {
    const db = createMockDb();
    const tool = createUpvoteComplaintTool(db);
    const shape = (tool.schema as any).shape;
    expect(shape._userId).toBeDefined();
  });
});
