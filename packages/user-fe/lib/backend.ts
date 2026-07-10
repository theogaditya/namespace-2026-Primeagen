// Centralized backend configuration for user-fe
const RAW_BACKEND =
  process.env.NEXT_PUBLIC_USER_BE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.USER_BE_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:3000";

export const BACKEND_URL = RAW_BACKEND.startsWith("http") ? RAW_BACKEND : `https://${RAW_BACKEND}`;

// WebSocket URL normalization
const RAW_WS = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws";

function _normalizeWs(raw: string) {
  if (!raw) return "ws://localhost:3001/ws";
  if (raw.startsWith("ws://") || raw.startsWith("wss://")) return raw;
  if (raw.startsWith("http://")) return raw.replace(/^http:/, "ws:");
  if (raw.startsWith("https://")) return raw.replace(/^https:/, "wss:");
  // No protocol provided - prefer wss for non-localhost, ws for localhost
  if (raw.includes("localhost") || raw.startsWith("127.")) return `ws://${raw}`;
  return `wss://${raw}`;
}

export const WS_URL = _normalizeWs(RAW_WS);

export const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";

export default {
  BACKEND_URL,
  WS_URL,
  GOOGLE_API_KEY,
};
