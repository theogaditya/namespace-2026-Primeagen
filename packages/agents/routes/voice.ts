import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { createAgentRouter } from "../agents/router";
import { transcribeAudio } from "../lib/speech/stt";
import { synthesizeSpeech, type TTSVoice } from "../lib/speech/tts";
import { rateLimiter, RATE_LIMITS } from "../lib/guardrails/rateLimiter";
import type { PrismaClient } from "../prisma/generated/client/client";

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

interface VoiceRequestPayload {
  audio?: string;
  sessionId?: string;
  voice?: TTSVoice;
  imageBase64?: string;
  mimeType?: string;
}

function resolveMimeType(mimeType?: string): string {
  return mimeType?.trim() || "audio/wav";
}

function chunkResponseText(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const sentenceChunks = normalized
    .split(/(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (sentenceChunks.length > 1) return sentenceChunks;

  const words = normalized.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += 8) {
    chunks.push(words.slice(i, i + 8).join(" "));
  }
  return chunks;
}

function sendSseEvent(res: Response, event: string, data: object) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  res.write(payload);
  if (typeof (res as any).flush === "function") (res as any).flush();
}

async function enforceVoiceRateLimits(userId: string) {
  const rateLimitResult = await rateLimiter.check(
    userId,
    "voice",
    RATE_LIMITS.voice.maxRequests,
    RATE_LIMITS.voice.windowMs
  );
  if (!rateLimitResult.allowed) {
    return {
      allowed: false as const,
      status: 429,
      body: {
        success: false,
        message: "Voice requests are rate limited. Please wait a moment.",
        retryAfter: rateLimitResult.retryAfterMs,
      },
    };
  }

  const hourlyResult = await rateLimiter.check(
    userId,
    "hourly",
    RATE_LIMITS.hourly.maxRequests,
    RATE_LIMITS.hourly.windowMs
  );
  if (!hourlyResult.allowed) {
    return {
      allowed: false as const,
      status: 429,
      body: {
        success: false,
        message: "You've reached the hourly limit. Please try again later.",
        retryAfter: hourlyResult.retryAfterMs,
      },
    };
  }

  return { allowed: true as const };
}

function decodeAudio(audio: string): Buffer {
  return Buffer.from(audio, "base64");
}

function validateAudioBuffer(audioBuffer: Buffer) {
  if (audioBuffer.length > MAX_AUDIO_BYTES) {
    return {
      valid: false as const,
      status: 400,
      body: {
        success: false,
        message: "Audio is too long. Please keep voice messages under 60 seconds.",
      },
    };
  }

  return { valid: true as const };
}

export function createVoiceRoutes(db: PrismaClient) {
  const router = Router();
  const agentRouter = createAgentRouter(db);

  router.post("/", async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { audio, sessionId, voice, imageBase64, mimeType }: VoiceRequestPayload = req.body;

      if (!audio) {
        return res.status(400).json({
          success: false,
          message: "Audio data is required (base64-encoded).",
        });
      }

      const rateLimit = await enforceVoiceRateLimits(userId);
      if (!rateLimit.allowed) {
        return res.status(rateLimit.status).json(rateLimit.body);
      }

      const audioBuffer = decodeAudio(audio);
      const validation = validateAudioBuffer(audioBuffer);
      if (!validation.valid) {
        return res.status(validation.status).json(validation.body);
      }

      const resolvedMimeType = resolveMimeType(mimeType);
      const sttResult = await transcribeAudio(audioBuffer, resolvedMimeType);

      if (!sttResult.text || sttResult.text.trim().length === 0) {
        return res.json({
          success: true,
          data: {
            transcript: "",
            response: "I couldn't understand the audio. Could you please try again?",
            sessionId: sessionId || uuidv4(),
            audioResponse: null,
          },
        });
      }

      const resolvedSessionId = sessionId || uuidv4();

      const result = await agentRouter({
        message: sttResult.text.trim(),
        userId,
        sessionId: resolvedSessionId,
        language: sttResult.language,
        ...(imageBase64 ? { imageBase64 } : {}),
      });

      const ttsVoice: TTSVoice = result.escalated ? "alloy" : (voice || "nova");
      let audioResponse: string | null = null;
      try {
        const ttsBuffer = await synthesizeSpeech(result.response, ttsVoice);
        audioResponse = ttsBuffer.toString("base64");
      } catch (ttsError) {
        console.error("[VoiceRoute] TTS error:", ttsError);
      }

      return res.json({
        success: true,
        data: {
          transcript: sttResult.text,
          response: result.response,
          sessionId: resolvedSessionId,
          language: sttResult.language,
          escalated: result.escalated,
          complaintFlowStarted: result.complaintFlowStarted,
          complaintDraft: result.complaintDraft,
          detectLocation: result.detectLocation,
          navigationPath: result.navigationPath,
          audioResponse,
        },
      });
    } catch (error) {
      console.error("[VoiceRoute] Error:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred processing your voice message.",
      });
    }
  });

  router.post("/stream", async (req: Request, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { audio, sessionId, voice, imageBase64, mimeType }: VoiceRequestPayload = req.body;

    if (!audio) {
      return res.status(400).json({
        success: false,
        message: "Audio data is required (base64-encoded).",
      });
    }

    const rateLimit = await enforceVoiceRateLimits(userId);
    if (!rateLimit.allowed) {
      return res.status(rateLimit.status).json(rateLimit.body);
    }

    const audioBuffer = decodeAudio(audio);
    const validation = validateAudioBuffer(audioBuffer);
    if (!validation.valid) {
      return res.status(validation.status).json(validation.body);
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      sendSseEvent(res, "phase", { phase: "transcribing" });

      const resolvedMimeType = resolveMimeType(mimeType);
      const sttResult = await transcribeAudio(audioBuffer, resolvedMimeType);
      const resolvedSessionId = sessionId || uuidv4();

      sendSseEvent(res, "transcript", {
        text: sttResult.text || "",
        sessionId: resolvedSessionId,
        language: sttResult.language,
      });

      if (!sttResult.text || sttResult.text.trim().length === 0) {
        sendSseEvent(res, "result", {
          response: "I couldn't understand the audio. Could you please try again?",
          sessionId: resolvedSessionId,
          language: sttResult.language,
          escalated: false,
          complaintFlowStarted: false,
          complaintDraft: null,
          detectLocation: false,
          navigationPath: null,
        });
        sendSseEvent(res, "done", {});
        return res.end();
      }

      sendSseEvent(res, "phase", { phase: "thinking" });

      const result = await agentRouter({
        message: sttResult.text.trim(),
        userId,
        sessionId: resolvedSessionId,
        language: sttResult.language,
        ...(imageBase64 ? { imageBase64 } : {}),
      });

      sendSseEvent(res, "phase", { phase: "responding" });

      const ttsVoice: TTSVoice = result.escalated ? "alloy" : (voice || "nova");
      const ttsPromise = synthesizeSpeech(result.response, ttsVoice)
        .then((ttsBuffer) => ttsBuffer.toString("base64"))
        .catch((ttsError) => {
          console.error("[VoiceRoute:stream] TTS error:", ttsError);
          return null;
        });

      for (const chunk of chunkResponseText(result.response)) {
        sendSseEvent(res, "text", { chunk: `${chunk}${chunk.endsWith(" ") ? "" : " "}` });
      }

      sendSseEvent(res, "result", {
        response: result.response,
        sessionId: resolvedSessionId,
        language: sttResult.language,
        escalated: result.escalated,
        complaintFlowStarted: result.complaintFlowStarted,
        complaintDraft: result.complaintDraft,
        detectLocation: result.detectLocation,
        navigationPath: result.navigationPath,
      });

      sendSseEvent(res, "phase", { phase: "speaking" });
      const audioResponse = await ttsPromise;
      if (audioResponse) {
        sendSseEvent(res, "audio", { audioResponse });
      }

      sendSseEvent(res, "done", {});
      return res.end();
    } catch (error) {
      console.error("[VoiceRoute:stream] Error:", error);
      sendSseEvent(res, "error", {
        message: "An error occurred processing your voice message.",
      });
      return res.end();
    }
  });

  return router;
}
