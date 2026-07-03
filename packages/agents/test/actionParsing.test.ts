import { describe, it, expect } from "vitest";

/**
 * Tests for action detection logic used in sentientAI output parsing.
 * We test the regex and JSON parsing logic in isolation.
 */

function detectActions(messages: Array<{ content: string }>) {
  let complaintDraft: any;
  let navigationPath: string | undefined;

  for (const msg of messages) {
    const content = typeof msg.content === "string" ? msg.content : "";
    if (content.includes('"action"')) {
      try {
        const parsed = JSON.parse(content);
        if (parsed.action === "COMPLAINT_DRAFT_READY" && parsed.draft) {
          complaintDraft = parsed.draft;
        } else if (parsed.action === "NAVIGATE" && parsed.path) {
          navigationPath = parsed.path;
        }
      } catch {
        const jsonMatch = content.match(/\{"action"\s*:\s*"(?:COMPLAINT_DRAFT_READY|NAVIGATE)"[^}]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.action === "COMPLAINT_DRAFT_READY") {
              complaintDraft = parsed.draft;
            } else if (parsed.action === "NAVIGATE") {
              navigationPath = parsed.path;
            }
          } catch { /* ignore */ }
        }
      }
    }
  }

  return { complaintDraft, navigationPath };
}

function cleanResponse(text: string): string {
  return text
    .replace(/\[ESCALATE_TO_HELP_AI\]/g, "")
    .replace(/\[START_COMPLAINT_FLOW\]/g, "")
    .replace(/\[System context:.*?\]/g, "")
    .replace(/\{"action"\s*:\s*"(?:COMPLAINT_DRAFT_READY|NAVIGATE)".*?\}(?:\})?/g, "")
    .trim();
}

describe("action detection", () => {
  it("detects COMPLAINT_DRAFT_READY from tool output", () => {
    const messages = [
      { content: "I'll file that complaint for you." },
      { content: JSON.stringify({ action: "COMPLAINT_DRAFT_READY", draft: { description: "Garbage", category: "Environment", district: "Jaipur", urgency: "MEDIUM" } }) },
    ];
    const { complaintDraft, navigationPath } = detectActions(messages);
    expect(complaintDraft).toBeDefined();
    expect(complaintDraft.category).toBe("Environment");
    expect(navigationPath).toBeUndefined();
  });

  it("detects NAVIGATE from tool output", () => {
    const messages = [
      { content: JSON.stringify({ action: "NAVIGATE", path: "/dashboard/complaints", reason: "Track complaints" }) },
    ];
    const { complaintDraft, navigationPath } = detectActions(messages);
    expect(navigationPath).toBe("/dashboard/complaints");
    expect(complaintDraft).toBeUndefined();
  });

  it("handles mixed text with embedded JSON", () => {
    const messages = [
      { content: 'Here are your results: {"action":"NAVIGATE","path":"/dashboard/feed","reason":"Community feed"} Let me know if you need more.' },
    ];
    const { navigationPath } = detectActions(messages);
    expect(navigationPath).toBe("/dashboard/feed");
  });

  it("returns nothing when no actions present", () => {
    const messages = [
      { content: "Hello! How can I help you today?" },
      { content: "I found 3 complaints in your area." },
    ];
    const { complaintDraft, navigationPath } = detectActions(messages);
    expect(complaintDraft).toBeUndefined();
    expect(navigationPath).toBeUndefined();
  });

  it("detects both actions from multiple messages", () => {
    const messages = [
      { content: JSON.stringify({ action: "COMPLAINT_DRAFT_READY", draft: { description: "Pothole", category: "Roads", district: "Delhi", urgency: "HIGH" } }) },
      { content: JSON.stringify({ action: "NAVIGATE", path: "/regComplaint", reason: "Filing" }) },
    ];
    const { complaintDraft, navigationPath } = detectActions(messages);
    expect(complaintDraft).toBeDefined();
    expect(complaintDraft.category).toBe("Roads");
    expect(navigationPath).toBe("/regComplaint");
  });
});

describe("cleanResponse", () => {
  it("strips COMPLAINT_DRAFT_READY JSON from response text", () => {
    const text = 'I\'ll file that for you. {"action":"COMPLAINT_DRAFT_READY","draft":{"category":"Water"}} Done!';
    const result = cleanResponse(text);
    // The nested JSON may not be fully stripped by simple regex -just verify no action key remains
    expect(result).not.toContain('"action"');
    expect(result).toContain("I'll file that for you.");
    expect(result).toContain("Done!");
  });

  it("strips NAVIGATE JSON from response text", () => {
    const text = 'Navigating you now {"action":"NAVIGATE","path":"/dashboard"} there you go';
    expect(cleanResponse(text)).toBe("Navigating you now  there you go");
  });

  it("strips all markers", () => {
    const text = "[ESCALATE_TO_HELP_AI] [START_COMPLAINT_FLOW] [System context: user=abc] Hello!";
    expect(cleanResponse(text)).toBe("Hello!");
  });
});
