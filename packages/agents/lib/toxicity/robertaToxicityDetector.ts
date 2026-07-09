/**
 * Toxicity Detection using unitary/unbiased-toxic-roberta
 * 
 * This model is specifically trained to detect toxic content and provides
 * more reliable detection than general-purpose LLMs.
 * 
 * Model: https://huggingface.co/unitary/unbiased-toxic-roberta
 * Paper: https://arxiv.org/abs/2109.07445
 * 
 * The model classifies text into:
 * - toxic: General toxicity
 * - severe_toxic: Severe toxicity
 * - obscene: Obscene language
 * - threat: Threats
 * - insult: Insults
 * - identity_hate: Identity-based hate speech
 */

import { HfInference } from '@huggingface/inference';

const HF_TOKEN = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
const ROBERTA_MODEL_ID = 'unitary/unbiased-toxic-roberta';
const ROBERTA_ENDPOINT_URL =
  process.env.TOXICITY_DETECTOR_ENDPOINT_URL ||
  'https://router.huggingface.co/hf-inference/models/unitary/unbiased-toxic-roberta';
const DETECTOR_COOLDOWN_MS = Number(process.env.TOXICITY_DETECTOR_COOLDOWN_MS || 10 * 60 * 1000);
const FATAL_DETECTOR_COOLDOWN_MS = Number(
  process.env.TOXICITY_DETECTOR_FATAL_COOLDOWN_MS || 60 * 60 * 1000
);
const MAX_DETECTOR_RETRIES = Number(process.env.TOXICITY_DETECTOR_MAX_RETRIES || 1);

export interface ToxicityClassification {
  label: string;
  score: number;
}

export interface ToxicityResult {
  isToxic: boolean;
  maxScore: number;
  classifications: ToxicityClassification[];
  severity: 'none' | 'low' | 'medium' | 'high';
  categories: string[];
}

interface HfTextClassificationClient {
  textClassification(args: {
    model?: string;
    endpointUrl?: string;
    inputs: string;
  }): Promise<ToxicityClassification[]>;
}

interface RobertaToxicityDetectorOptions {
  client?: HfTextClassificationClient | null;
  cooldownMs?: number;
  fatalCooldownMs?: number;
  maxRetries?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Toxicity thresholds for classification
 */
const THRESHOLDS = {
  TOXIC: 0.5,        // General toxicity threshold
  LOW: 0.5,          // Low severity: 0.5-0.7
  MEDIUM: 0.7,       // Medium severity: 0.7-0.85
  HIGH: 0.85,        // High severity: 0.85+
};

/**
 * Category severity mapping
 */
const CATEGORY_SEVERITY: Record<string, number> = {
  'severe_toxic': 3,
  'threat': 3,
  'identity_hate': 3,
  'obscene': 2,
  'insult': 2,
  'toxic': 1,
};

export class RobertaToxicityDetector {
  private hf: HfTextClassificationClient | null = null;
  private isAvailable: boolean = false;
  private disabledUntil: number | null = null;
  private readonly cooldownMs: number;
  private readonly fatalCooldownMs: number;
  private readonly maxRetries: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: RobertaToxicityDetectorOptions = {}) {
    this.cooldownMs = options.cooldownMs ?? DETECTOR_COOLDOWN_MS;
    this.fatalCooldownMs = options.fatalCooldownMs ?? FATAL_DETECTOR_COOLDOWN_MS;
    this.maxRetries = Math.max(1, options.maxRetries ?? MAX_DETECTOR_RETRIES);
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

    if (options.client) {
      this.hf = options.client;
      this.isAvailable = true;
    } else if (HF_TOKEN) {
      this.hf = new HfInference(HF_TOKEN);
      this.isAvailable = true;
    } else {
      console.warn('[RobertaToxicityDetector] HUGGINGFACE_API_KEY not set - toxicity detection will use fallback');
      this.isAvailable = false;
    }
  }

  /**
   * Check if the detector is available (API key configured)
   */
  public available(): boolean {
    if (this.disabledUntil && this.now() >= this.disabledUntil) {
      this.disabledUntil = null;
    }

    if (this.disabledUntil && this.now() < this.disabledUntil) {
      return false;
    }

    return this.isAvailable;
  }

  /**
   * Detect toxicity in text using the RoBERTa model
   * Includes retry logic for model cold start
   */
  async detect(text: string, retries: number = this.maxRetries): Promise<ToxicityResult> {
    if (!this.isAvailable || !this.hf) {
      throw new Error('RobertaToxicityDetector is not available - HUGGINGFACE_API_KEY not configured');
    }

    if (this.disabledUntil && this.now() < this.disabledUntil) {
      throw new Error('RobertaToxicityDetector is temporarily disabled after repeated Hugging Face failures');
    }

    let lastError: any;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.hf.textClassification({
          model: ROBERTA_MODEL_ID,
          endpointUrl: ROBERTA_ENDPOINT_URL,
          inputs: text,
        });

        const classifications = result as ToxicityClassification[];
        
        // Find the highest score
        const maxScore = Math.max(...classifications.map(c => c.score));
        
        // Check if any classification exceeds the toxic threshold
        const isToxic = maxScore >= THRESHOLDS.TOXIC;
        
        // Determine severity based on max score and category weights
        const severity = this.calculateSeverity(classifications);
        
        // Get categories that exceed threshold
        const categories = classifications
          .filter(c => c.score >= THRESHOLDS.TOXIC)
          .map(c => c.label);

        return {
          isToxic,
          maxScore,
          classifications,
          severity,
          categories,
        };
      } catch (error: any) {
        lastError = error;

        if (this.isRetryableLoadingError(error)) {
          console.log(
            `[RobertaToxicityDetector] Hugging Face model not ready (attempt ${attempt}/${retries}), retrying in ${attempt * 2}s...`
          );

          if (attempt < retries) {
            // Wait before retry (exponential backoff)
            await this.sleep(attempt * 2000);
            continue;
          }
        }

        this.disableTemporarily(error);
        console.error(
          `[RobertaToxicityDetector] Error calling Hugging Face API: ${this.getErrorMessage(error)}`
        );
        throw error;
      }
    }

    this.disableTemporarily(lastError);
    throw lastError;
  }

  private isRetryableLoadingError(error: any): boolean {
    const message = this.getErrorMessage(error);
    return (
      message.includes('currently loading') ||
      message.includes('"estimated_time"')
    );
  }

  private disableTemporarily(error: unknown) {
    const cooldownMs = this.getCooldownMsForError(error);
    this.disabledUntil = this.now() + cooldownMs;
    console.warn(
      `[RobertaToxicityDetector] Disabling RoBERTa detector for ${Math.round(cooldownMs / 1000)}s after Hugging Face failure: ${this.getErrorMessage(error)}`
    );
  }

  private getCooldownMsForError(error: unknown): number {
    const message = this.getErrorMessage(error).toLowerCase();

    if (
      message.includes('fetching the blob') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('not found')
    ) {
      return this.fatalCooldownMs;
    }

    return this.cooldownMs;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return String(error);
  }

  /**
   * Calculate severity based on scores and category weights
   */
  private calculateSeverity(classifications: ToxicityClassification[]): 'none' | 'low' | 'medium' | 'high' {
    // Find the highest weighted score
    let maxWeightedScore = 0;
    let maxRawScore = 0;

    for (const classification of classifications) {
      if (classification.score >= THRESHOLDS.TOXIC) {
        const weight = CATEGORY_SEVERITY[classification.label] || 1;
        const weightedScore = classification.score * weight;
        
        if (weightedScore > maxWeightedScore) {
          maxWeightedScore = weightedScore;
          maxRawScore = classification.score;
        }
      }
    }

    if (maxRawScore < THRESHOLDS.TOXIC) {
      return 'none';
    } else if (maxRawScore < THRESHOLDS.MEDIUM) {
      return 'low';
    } else if (maxRawScore < THRESHOLDS.HIGH) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Batch detect toxicity for multiple texts
   */
  async detectBatch(texts: string[]): Promise<ToxicityResult[]> {
    const results: ToxicityResult[] = [];
    
    for (const text of texts) {
      try {
        const result = await this.detect(text);
        results.push(result);
      } catch (error) {
        console.error('[RobertaToxicityDetector] Error in batch detection:', error);
        // Push a safe default for failed detections
        results.push({
          isToxic: false,
          maxScore: 0,
          classifications: [],
          severity: 'none',
          categories: [],
        });
      }
    }
    
    return results;
  }
}

// Singleton instance
let detectorInstance: RobertaToxicityDetector | null = null;

/**
 * Get the singleton toxicity detector instance
 */
export function getToxicityDetector(): RobertaToxicityDetector {
  if (!detectorInstance) {
    detectorInstance = new RobertaToxicityDetector();
  }
  return detectorInstance;
}
