// Types for Swaraj AI Chat

export type Language = "english" | "hindi" | "hinglish";

export type ChatMode = "text" | "voice";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  language?: Language;
}

// Voice chat specific message type
export interface VoiceChatMessage {
  id: string;
  role: "user" | "assistant";
  transcription?: string;  // User's speech transcribed
  reply?: string;          // Bot's text reply
  audioUrl?: string;       // Bot's audio response URL
  timestamp: Date;
  language: Language;
}

export interface ChatRequest {
  user_query: string;
  language: Language;
}

export interface ChatResponse {
  bot_response: string;
}

export interface ChatAPIResponse {
  success: boolean;
  data?: ChatResponse;
  error?: string;
}

// Voice chat API types
export interface VoiceChatResponse {
  audio_url: string;
  reply: string;
  transcription: string;
}

export interface VoiceChatAPIResponse {
  success: boolean;
  data?: VoiceChatResponse;
  error?: string;
}

export const LANGUAGE_OPTIONS: { value: Language; label: string; labelNative: string }[] = [
  { value: "english", label: "English", labelNative: "English" },
  { value: "hindi", label: "Hindi", labelNative: "हिंदी" },
  { value: "hinglish", label: "Hinglish", labelNative: "Hinglish" },
];

export const SUGGESTED_QUESTIONS = [
  "How to register a complaint?",
  "How to create an account?",
  "How to track my complaint?",
];

export const MAX_WORD_COUNT = 100;

// Utility function to count words
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Utility function to validate message
export function validateMessage(message: string): { valid: boolean; error?: string } {
  const trimmed = message.trim();
  
  if (!trimmed) {
    return { valid: false, error: "Message cannot be empty" };
  }
  
  const wordCount = countWords(trimmed);
  if (wordCount > MAX_WORD_COUNT) {
    return { valid: false, error: `Message exceeds ${MAX_WORD_COUNT} words limit` };
  }
  
  return { valid: true };
}
