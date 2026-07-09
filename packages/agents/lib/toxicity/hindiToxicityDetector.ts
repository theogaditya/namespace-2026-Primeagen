/**
 * Hindi / Hinglish Toxicity Detection using Hate-speech-CNERG/hindi-abusive-MuRIL
 *
 * This model is specifically trained on Hindi social-media text and provides
 * reliable hate-speech / offensive-language detection for Devanagari +
 * romanised Hindi (Hinglish) content.
 *
 * Model: https://huggingface.co/Hate-speech-CNERG/hindi-abusive-MuRIL
 *
 * The detector mirrors the interface of RobertaToxicityDetector so the
 * downstream abuseAI pipeline can swap detectors transparently.
 */

import { HfInference } from "@huggingface/inference";
import type { ToxicityClassification, ToxicityResult } from "./robertaToxicityDetector";

const HF_TOKEN = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;

const HINDI_MODEL_ID =
  process.env.HINDI_TOXICITY_MODEL_ID || "Hate-speech-CNERG/hindi-abusive-MuRIL";

const HINDI_ENDPOINT_URL =
  process.env.HINDI_TOXICITY_ENDPOINT_URL ||
  `https://router.huggingface.co/hf-inference/models/${HINDI_MODEL_ID}`;

const DETECTOR_COOLDOWN_MS = Number(process.env.HINDI_TOXICITY_COOLDOWN_MS || 10 * 60 * 1000);
const FATAL_COOLDOWN_MS = Number(process.env.HINDI_TOXICITY_FATAL_COOLDOWN_MS || 60 * 60 * 1000);
const MAX_RETRIES = Number(process.env.HINDI_TOXICITY_MAX_RETRIES || 1);

/**
 * Thresholds — the MuRIL model typically returns labels like
 * "abusive" / "not abusive" (or "hate" / "not hate") with confidence scores.
 * We treat anything above 0.5 as hostile.
 */
const THRESHOLD = 0.5;

/**
 * Map model labels to our internal category vocabulary.
 * Different Hindi models use slightly different label names — we normalise here.
 */
const LABEL_MAP: Record<string, string> = {
  abusive: "toxic",
  "not abusive": "not_toxic",
  "not-abusive": "not_toxic",
  hate: "identity_hate",
  offensive: "insult",
  "not offensive": "not_toxic",
  "not-offensive": "not_toxic",
  "non-hostile": "not_toxic",
  hostile: "toxic",
  normal: "not_toxic",
};

function normaliseLabel(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return LABEL_MAP[lower] ?? lower;
}

interface HfTextClassificationClient {
  textClassification(args: {
    model?: string;
    endpointUrl?: string;
    inputs: string;
  }): Promise<ToxicityClassification[]>;
}

interface HindiToxicityDetectorOptions {
  client?: HfTextClassificationClient | null;
  cooldownMs?: number;
  fatalCooldownMs?: number;
  maxRetries?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export class HindiToxicityDetector {
  private hf: HfTextClassificationClient | null = null;
  private isAvailable = false;
  private disabledUntil: number | null = null;
  private readonly cooldownMs: number;
  private readonly fatalCooldownMs: number;
  private readonly maxRetries: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: HindiToxicityDetectorOptions = {}) {
    this.cooldownMs = options.cooldownMs ?? DETECTOR_COOLDOWN_MS;
    this.fatalCooldownMs = options.fatalCooldownMs ?? FATAL_COOLDOWN_MS;
    this.maxRetries = Math.max(1, options.maxRetries ?? MAX_RETRIES);
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));

    if (options.client) {
      this.hf = options.client;
      this.isAvailable = true;
    } else if (HF_TOKEN) {
      this.hf = new HfInference(HF_TOKEN);
      this.isAvailable = true;
    } else {
      console.warn(
        "[HindiToxicityDetector] HUGGINGFACE_API_KEY not set — Hindi detection will use fallback"
      );
      this.isAvailable = false;
    }
  }

  public available(): boolean {
    if (this.disabledUntil && this.now() >= this.disabledUntil) {
      this.disabledUntil = null;
    }
    if (this.disabledUntil && this.now() < this.disabledUntil) {
      return false;
    }
    return this.isAvailable;
  }

  async detect(text: string, retries: number = this.maxRetries): Promise<ToxicityResult> {
    if (!this.isAvailable || !this.hf) {
      throw new Error("HindiToxicityDetector is not available — HUGGINGFACE_API_KEY not configured");
    }
    if (this.disabledUntil && this.now() < this.disabledUntil) {
      throw new Error("HindiToxicityDetector temporarily disabled after repeated HF failures");
    }

    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const raw = await this.hf.textClassification({
          model: HINDI_MODEL_ID,
          endpointUrl: HINDI_ENDPOINT_URL,
          inputs: text,
        });

        const classifications: ToxicityClassification[] = (raw as ToxicityClassification[]).map(
          (c) => ({
            label: normaliseLabel(c.label),
            score: c.score,
          })
        );

        // Determine toxicity
        const toxicLabels = classifications.filter(
          (c) => c.label !== "not_toxic" && c.score >= THRESHOLD
        );
        const isToxic = toxicLabels.length > 0;
        const maxScore = isToxic
          ? Math.max(...toxicLabels.map((c) => c.score))
          : Math.max(...classifications.map((c) => c.score), 0);

        const categories = toxicLabels.map((c) => c.label);
        const severity = this.calculateSeverity(maxScore, isToxic);

        return { isToxic, maxScore, classifications, severity, categories };
      } catch (error: any) {
        lastError = error;

        if (this.isRetryableLoadingError(error)) {
          console.log(
            `[HindiToxicityDetector] HF model not ready (attempt ${attempt}/${retries}), retrying in ${attempt * 2}s…`
          );
          if (attempt < retries) {
            await this.sleep(attempt * 2000);
            continue;
          }
        }

        this.disableTemporarily(error);
        console.error(
          `[HindiToxicityDetector] HF API error: ${this.getErrorMessage(error)}`
        );
        throw error;
      }
    }

    this.disableTemporarily(lastError);
    throw lastError;
  }

  /* ---------- helpers ---------- */

  private calculateSeverity(maxScore: number, isToxic: boolean): "none" | "low" | "medium" | "high" {
    if (!isToxic) return "none";
    if (maxScore < 0.7) return "low";
    if (maxScore < 0.85) return "medium";
    return "high";
  }

  private isRetryableLoadingError(error: any): boolean {
    const msg = this.getErrorMessage(error);
    return msg.includes("currently loading") || msg.includes('"estimated_time"');
  }

  private disableTemporarily(error: unknown) {
    const ms = this.getCooldownMs(error);
    this.disabledUntil = this.now() + ms;
    console.warn(
      `[HindiToxicityDetector] Disabled for ${Math.round(ms / 1000)}s: ${this.getErrorMessage(error)}`
    );
  }

  private getCooldownMs(error: unknown): number {
    const msg = this.getErrorMessage(error).toLowerCase();
    if (
      msg.includes("fetching the blob") ||
      msg.includes("unauthorized") ||
      msg.includes("forbidden") ||
      msg.includes("not found")
    ) {
      return this.fatalCooldownMs;
    }
    return this.cooldownMs;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error && error.message ? error.message : String(error);
  }
}

/* ---------- singleton ---------- */

let instance: HindiToxicityDetector | null = null;

export function getHindiToxicityDetector(): HindiToxicityDetector {
  if (!instance) {
    instance = new HindiToxicityDetector();
  }
  return instance;
}
