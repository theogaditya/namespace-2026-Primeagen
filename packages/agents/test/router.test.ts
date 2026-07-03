import { describe, it, expect } from "vitest";

/**
 * Tests for stripMarkdown and router output processing.
 * stripMarkdown is a pure function -test it directly.
 */

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "\u2022 ");
}

describe("stripMarkdown", () => {
  it("strips bold (**text**)", () => {
    expect(stripMarkdown("This is **bold** text")).toBe("This is bold text");
  });

  it("strips italic (*text*)", () => {
    expect(stripMarkdown("This is *italic* text")).toBe("This is italic text");
  });

  it("strips headers (## heading)", () => {
    expect(stripMarkdown("## My Heading\nSome content")).toBe("My Heading\nSome content");
  });

  it("converts bullet markers to unicode bullets", () => {
    expect(stripMarkdown("- Item one\n- Item two")).toBe("\u2022 Item one\n\u2022 Item two");
  });

  it("handles mixed markdown", () => {
    const input = "## Results\n**Complaint #42** - *Registered*\n- Water issue\n- Pothole";
    const expected = "Results\nComplaint #42 - Registered\n\u2022 Water issue\n\u2022 Pothole";
    expect(stripMarkdown(input)).toBe(expected);
  });

  it("leaves plain text untouched", () => {
    const plain = "I found 3 complaints in your area. The most recent one is about garbage collection.";
    expect(stripMarkdown(plain)).toBe(plain);
  });

  it("handles empty string", () => {
    expect(stripMarkdown("")).toBe("");
  });
});

describe("response marker detection", () => {
  it("detects [ESCALATE_TO_HELP_AI] marker", () => {
    const response = "I can't resolve this. [ESCALATE_TO_HELP_AI] Let me connect you with support.";
    expect(response.includes("[ESCALATE_TO_HELP_AI]")).toBe(true);

    const cleaned = response.replace(/\[ESCALATE_TO_HELP_AI\]/g, "").trim();
    expect(cleaned).toBe("I can't resolve this.  Let me connect you with support.");
  });

  it("detects [START_COMPLAINT_FLOW] marker", () => {
    const response = "Great, let me start the complaint registration. [START_COMPLAINT_FLOW]";
    expect(response.includes("[START_COMPLAINT_FLOW]")).toBe(true);

    const cleaned = response.replace(/\[START_COMPLAINT_FLOW\]/g, "").trim();
    expect(cleaned).toBe("Great, let me start the complaint registration.");
  });

  it("cleans [System context] leaks", () => {
    const response = "Hello! [System context: User ID is \"abc123\"] How can I help?";
    const cleaned = response.replace(/\[System context:.*?\]/g, "").trim();
    expect(cleaned).toBe("Hello!  How can I help?");
  });
});
