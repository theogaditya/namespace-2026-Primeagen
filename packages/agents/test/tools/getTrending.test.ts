import { describe, it, expect, vi } from "vitest";
import { createGetTrendingTool } from "../../lib/tools/getTrending";

/**
 * Tests for getTrending progressive time-window fallback.
 * We mock the Prisma client to control what each window returns.
 */

const COMPLAINT_FIXTURE = {
  seq: 42,
  description: "Garbage pile under flyover near Amber restaurant causing health hazard and rat infestation in the neighborhood",
  subCategory: "Solid Waste",
  status: "REGISTERED",
  upvoteCount: 15,
  assignedDepartment: "Municipal Corporation",
  category: { name: "Environment" },
  location: { district: "Jaipur", city: "Jaipur" },
};

function makeMockDb(findManyFn: (...args: any[]) => any) {
  return {
    complaint: {
      findMany: findManyFn,
    },
  } as any;
}

describe("getTrending fallback", () => {
  it("returns 7-day results when available", async () => {
    const findMany = vi.fn().mockResolvedValue([COMPLAINT_FIXTURE]);
    const db = makeMockDb(findMany);
    const tool = createGetTrendingTool(db);

    const result = await tool.invoke({});
    const parsed = JSON.parse(result);

    // Should only call findMany once (7-day window succeeded)
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(parsed.timeWindow).toBe("the last 7 days");
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].complaintNumber).toBe(42);
  });

  it("falls back to 30-day window when 7-day is empty", async () => {
    let callCount = 0;
    const findMany = vi.fn().mockImplementation(() => {
      callCount++;
      // 1st call (7d) → empty, 2nd call (30d) → has data
      return callCount === 1 ? [] : [COMPLAINT_FIXTURE];
    });
    const db = makeMockDb(findMany);
    const tool = createGetTrendingTool(db);

    const result = await tool.invoke({});
    const parsed = JSON.parse(result);

    expect(findMany).toHaveBeenCalledTimes(2);
    expect(parsed.timeWindow).toBe("the last 30 days");
  });

  it("falls back to 90-day window", async () => {
    let callCount = 0;
    const findMany = vi.fn().mockImplementation(() => {
      callCount++;
      return callCount <= 2 ? [] : [COMPLAINT_FIXTURE];
    });
    const db = makeMockDb(findMany);
    const tool = createGetTrendingTool(db);

    const result = await tool.invoke({});
    const parsed = JSON.parse(result);

    expect(findMany).toHaveBeenCalledTimes(3);
    expect(parsed.timeWindow).toBe("the last 90 days");
  });

  it("falls back to all-time window", async () => {
    let callCount = 0;
    const findMany = vi.fn().mockImplementation(() => {
      callCount++;
      return callCount <= 3 ? [] : [COMPLAINT_FIXTURE];
    });
    const db = makeMockDb(findMany);
    const tool = createGetTrendingTool(db);

    const result = await tool.invoke({});
    const parsed = JSON.parse(result);

    expect(findMany).toHaveBeenCalledTimes(4);
    expect(parsed.timeWindow).toBe("all time");
  });

  it("returns no-results string when ALL windows are empty", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const db = makeMockDb(findMany);
    const tool = createGetTrendingTool(db);

    const result = await tool.invoke({});

    expect(findMany).toHaveBeenCalledTimes(4); // tried all 4 windows
    expect(result).toBe("No trending complaints found for the specified filters.");
  });

  it("all-time window does NOT have submissionDate filter", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const db = makeMockDb(findMany);
    const tool = createGetTrendingTool(db);

    await tool.invoke({});

    // 4th call is all-time (days=0) -should only have isPublic
    const fourthCallArgs = findMany.mock.calls[3]![0];
    expect(fourthCallArgs.where.isPublic).toBe(true);
    expect(fourthCallArgs.where.submissionDate).toBeUndefined();
  });

  it("passes category and district filters to all windows", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const db = makeMockDb(findMany);
    const tool = createGetTrendingTool(db);

    await tool.invoke({ district: "Jaipur", category: "Environment" });

    // All 4 calls should include category + district
    for (const call of findMany.mock.calls) {
      expect(call[0].where.category).toBeDefined();
      expect(call[0].where.location).toBeDefined();
    }
  });

  it("respects limit parameter", async () => {
    const findMany = vi.fn().mockResolvedValue([COMPLAINT_FIXTURE]);
    const db = makeMockDb(findMany);
    const tool = createGetTrendingTool(db);

    await tool.invoke({ limit: 5 });

    expect(findMany.mock.calls[0]![0].take).toBe(5);
  });

  it("caps limit at 20", async () => {
    const findMany = vi.fn().mockResolvedValue([COMPLAINT_FIXTURE]);
    const db = makeMockDb(findMany);
    const tool = createGetTrendingTool(db);

    await tool.invoke({ limit: 100 });

    expect(findMany.mock.calls[0]![0].take).toBe(20);
  });
});
