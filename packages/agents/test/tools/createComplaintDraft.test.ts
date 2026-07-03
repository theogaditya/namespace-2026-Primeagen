import { describe, it, expect } from "vitest";

/**
 * Tests for createComplaintDraft tool.
 * This is a pure function that returns structured JSON -no DB needed.
 */

import { createComplaintDraftTool } from "../../lib/tools/createComplaintDraft";

describe("createComplaintDraft", () => {
  const tool = createComplaintDraftTool();

  it("has correct name and description", () => {
    expect(tool.name).toBe("createComplaintDraft");
    expect(tool.description).toContain("complaint draft");
  });

  it("returns COMPLAINT_DRAFT_READY action with all fields", async () => {
    const result = await tool.func({
      description: "Garbage pile under flyover near Amber Restaurant",
      category: "Environment",
      subCategory: "Waste Management",
      district: "Bangalore Urban",
      city: "Bangalore",
      locality: "Koramangala",
      urgency: "MEDIUM",
    });

    const parsed = JSON.parse(result);
    expect(parsed.action).toBe("COMPLAINT_DRAFT_READY");
    expect(parsed.draft.description).toBe("Garbage pile under flyover near Amber Restaurant");
    expect(parsed.draft.category).toBe("Environment");
    expect(parsed.draft.urgency).toBe("MEDIUM");
    expect(parsed.draft.district).toBe("Bangalore Urban");
  });

  it("handles optional nullable fields", async () => {
    const result = await tool.func({
      description: "Water supply issue",
      category: "Water",
      district: "Jaipur",
      urgency: "HIGH",
      subCategory: null,
      city: null,
      locality: null,
    });

    const parsed = JSON.parse(result);
    expect(parsed.action).toBe("COMPLAINT_DRAFT_READY");
    expect(parsed.draft.subCategory).toBeNull();
    expect(parsed.draft.city).toBeNull();
  });

  it("schema does not include _userId", () => {
    const shape = (tool.schema as any).shape;
    expect(shape._userId).toBeUndefined();
  });
});
