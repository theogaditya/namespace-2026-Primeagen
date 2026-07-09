import { beforeEach, describe, expect, it, vi } from "vitest";
import { RobertaToxicityDetector } from "../../lib/toxicity/robertaToxicityDetector";

describe("RobertaToxicityDetector", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not retry blob fetch failures and applies the fatal cooldown", async () => {
    const textClassification = vi
      .fn()
      .mockRejectedValue(new Error("An error occurred while fetching the blob"));

    let now = 1_000;
    const detector = new RobertaToxicityDetector({
      client: { textClassification },
      cooldownMs: 10_000,
      fatalCooldownMs: 60_000,
      maxRetries: 3,
      now: () => now,
      sleep: vi.fn().mockResolvedValue(undefined),
    });

    await expect(detector.detect("bad input")).rejects.toThrow("fetching the blob");
    expect(textClassification).toHaveBeenCalledTimes(1);
    expect(detector.available()).toBe(false);

    now += 59_999;
    expect(detector.available()).toBe(false);

    now += 1;
    expect(detector.available()).toBe(true);
  });

  it("retries model-loading errors before succeeding", async () => {
    const textClassification = vi
      .fn()
      .mockRejectedValueOnce(new Error('{"error":"Model is currently loading","estimated_time":1.2}'))
      .mockResolvedValue([
        { label: "toxic", score: 0.91 },
        { label: "insult", score: 0.14 },
      ]);

    const sleep = vi.fn().mockResolvedValue(undefined);
    const detector = new RobertaToxicityDetector({
      client: { textClassification },
      maxRetries: 2,
      sleep,
    });

    const result = await detector.detect("bad input");

    expect(textClassification).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2_000);
    expect(result.isToxic).toBe(true);
    expect(result.severity).toBe("high");
  });
});
