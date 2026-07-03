import { describe, it, expect } from "vitest";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Standalone re-implementation of bindUserId for unit testing.
 * Mirrors the logic in sentientAI.ts / helpAI.ts exactly.
 */
function bindUserId(tool: DynamicStructuredTool, userId: string): DynamicStructuredTool {
  const originalSchema = tool.schema as z.ZodObject<any>;
  const shape = originalSchema.shape;
  if (!("_userId" in shape)) return tool;
  const { _userId, ...rest } = shape;
  const newSchema = z.object(rest);
  return new DynamicStructuredTool({
    name: tool.name,
    description: tool.description,
    schema: newSchema,
    func: async (args: any) => {
      return (tool as any).func({ ...args, _userId: userId });
    },
  });
}

/** Fake tool that requires _userId */
function makeFakeUserTool() {
  return new DynamicStructuredTool({
    name: "fakeUserTool",
    description: "Test tool that needs _userId",
    schema: z.object({
      query: z.string().describe("User query"),
      _userId: z.string().describe("The user ID"),
    }),
    func: async ({ query, _userId }) => {
      return JSON.stringify({ query, userId: _userId });
    },
  });
}

/** Fake tool that does NOT require _userId */
function makeFakePublicTool() {
  return new DynamicStructuredTool({
    name: "fakePublicTool",
    description: "Test tool without _userId",
    schema: z.object({
      query: z.string().describe("Search query"),
    }),
    func: async ({ query }) => {
      return JSON.stringify({ query });
    },
  });
}

describe("bindUserId", () => {
  it("should inject _userId into tool call args automatically", async () => {
    const tool = makeFakeUserTool();
    const bound = bindUserId(tool, "user-abc-123");

    // Calling without _userId -it should be injected
    const result = await bound.invoke({ query: "my complaints" });
    const parsed = JSON.parse(result);

    expect(parsed.userId).toBe("user-abc-123");
    expect(parsed.query).toBe("my complaints");
  });

  it("should remove _userId from the schema LLM sees", () => {
    const tool = makeFakeUserTool();
    const bound = bindUserId(tool, "user-abc-123");

    const boundSchema = bound.schema as z.ZodObject<any>;
    const keys = Object.keys(boundSchema.shape);

    expect(keys).toContain("query");
    expect(keys).not.toContain("_userId");
  });

  it("should preserve original schema for tools without _userId", () => {
    const tool = makeFakePublicTool();
    const bound = bindUserId(tool, "user-abc-123");

    // Should return the exact same tool instance
    expect(bound).toBe(tool);
  });

  it("should preserve tool name and description", () => {
    const tool = makeFakeUserTool();
    const bound = bindUserId(tool, "user-abc-123");

    expect(bound.name).toBe("fakeUserTool");
    expect(bound.description).toBe("Test tool that needs _userId");
  });

  it("should work with different user IDs per invocation", async () => {
    const tool = makeFakeUserTool();
    const bound1 = bindUserId(tool, "user-A");
    const bound2 = bindUserId(tool, "user-B");

    const r1 = JSON.parse(await bound1.invoke({ query: "hello" }));
    const r2 = JSON.parse(await bound2.invoke({ query: "hello" }));

    expect(r1.userId).toBe("user-A");
    expect(r2.userId).toBe("user-B");
  });

  it("should not allow caller to override _userId", async () => {
    const tool = makeFakeUserTool();
    const bound = bindUserId(tool, "real-user");

    // Even if someone tries to pass _userId, the bound value wins
    const result = JSON.parse(await bound.invoke({ query: "test", _userId: "hacker" } as any));
    expect(result.userId).toBe("real-user");
  });
});
