import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

export type ModelProvider = "openai" | "google" | "anthropic";
export type ModelTier = "chat" | "fast";

interface ModelConfig {
  modelName: string;
  temperature?: number;
  maxTokens?: number;
}

const PROVIDER_CONFIGS: Record<ModelProvider, Record<ModelTier, ModelConfig>> = {
  openai: {
    chat: {
      modelName: process.env.MODEL_CHAT || "gpt-4o",
      temperature: 0.3,
      maxTokens: 4096,
    },
    fast: {
      modelName: process.env.MODEL_FAST || "gpt-4o-mini",
      temperature: 0.1,
      maxTokens: 2048,
    },
  },
  google: {
    chat: {
      modelName: process.env.MODEL_CHAT || "gemini-1.5-pro",
      temperature: 0.3,
      maxTokens: 4096,
    },
    fast: {
      modelName: process.env.MODEL_FAST || "gemini-1.5-flash",
      temperature: 0.1,
      maxTokens: 2048,
    },
  },
  anthropic: {
    chat: {
      modelName: process.env.MODEL_CHAT || "claude-sonnet-4-20250514",
      temperature: 0.3,
      maxTokens: 4096,
    },
    fast: {
      modelName: process.env.MODEL_FAST || "claude-sonnet-4-20250514",
      temperature: 0.1,
      maxTokens: 2048,
    },
  },
};

function getProvider(): ModelProvider {
  const provider = (process.env.MODEL_PROVIDER || "openai").toLowerCase();
  if (provider !== "openai" && provider !== "google" && provider !== "anthropic") {
    console.warn(`Unknown MODEL_PROVIDER "${provider}", falling back to openai`);
    return "openai";
  }
  return provider;
}

export function getChatModel(tier: ModelTier = "chat", overrides?: Partial<ModelConfig>): BaseChatModel {
  const provider = getProvider();
  const config = { ...PROVIDER_CONFIGS[provider]![tier]!, ...overrides };

  switch (provider) {
    case "openai":
      return new ChatOpenAI({
        modelName: config.modelName,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        openAIApiKey: process.env.OPENAI_API_KEY,
      });

    case "google":
      return new ChatGoogleGenerativeAI({
        modelName: config.modelName,
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
        apiKey: process.env.GOOGLE_API_KEY,
      });

    case "anthropic":
      // Lazy-load anthropic to avoid requiring it when not used
      throw new Error(
        "Anthropic provider requires @langchain/anthropic package. Install it and update this factory."
      );

    default:
      throw new Error(`Unsupported model provider: ${provider}`);
  }
}

export function getEmbeddingModel() {
  const provider = getProvider();

  switch (provider) {
    case "openai":
      // Use dynamic import pattern -embedding model
      const { OpenAIEmbeddings } = require("@langchain/openai");
      return new OpenAIEmbeddings({
        modelName: "text-embedding-3-small",
        openAIApiKey: process.env.OPENAI_API_KEY,
      });

    case "google":
      const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
      return new GoogleGenerativeAIEmbeddings({
        modelName: "text-embedding-004",
        apiKey: process.env.GOOGLE_API_KEY,
      });

    default:
      // Fallback to OpenAI embeddings
      const { OpenAIEmbeddings: FallbackEmbeddings } = require("@langchain/openai");
      return new FallbackEmbeddings({
        modelName: "text-embedding-3-small",
        openAIApiKey: process.env.OPENAI_API_KEY,
      });
  }
}
