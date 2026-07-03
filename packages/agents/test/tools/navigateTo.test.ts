import { describe, it, expect } from "vitest";

/**
 * Tests for navigateTo tool.
 * Pure function -returns structured NAVIGATE action.
 */

import { createNavigateToTool } from "../../lib/tools/navigateTo";

describe("navigateTo", () => {
  const tool = createNavigateToTool();

  it("has correct name", () => {
    expect(tool.name).toBe("navigateTo");
  });

  it("returns NAVIGATE action with correct path for dashboard", async () => {
    const result = await tool.func({ page: "dashboard", reason: "User wants to go home" });
    const parsed = JSON.parse(result);
    expect(parsed.action).toBe("NAVIGATE");
    expect(parsed.path).toBe("/dashboard");
    expect(parsed.reason).toBe("User wants to go home");
  });

  it("returns correct path for regComplaint", async () => {
    const result = await tool.func({ page: "regComplaint", reason: "Filing a complaint" });
    const parsed = JSON.parse(result);
    expect(parsed.path).toBe("/regComplaint");
  });

  it("returns correct path for myComplaints", async () => {
    const result = await tool.func({ page: "myComplaints", reason: "Track complaints" });
    const parsed = JSON.parse(result);
    expect(parsed.path).toBe("/dashboard/complaints");
  });

  it("returns correct path for communityFeed", async () => {
    const result = await tool.func({ page: "communityFeed", reason: "See community" });
    const parsed = JSON.parse(result);
    expect(parsed.path).toBe("/dashboard/feed");
  });

  it("returns correct path for profile", async () => {
    const result = await tool.func({ page: "profile", reason: "Check profile" });
    const parsed = JSON.parse(result);
    expect(parsed.path).toBe("/dashboard/profile");
  });

  it("schema does not include _userId", () => {
    const shape = (tool.schema as any).shape;
    expect(shape._userId).toBeUndefined();
  });
});
