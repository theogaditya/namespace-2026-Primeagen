import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { createAgentRouter } from "../agents/router";
import { transcribeAudio } from "../lib/speech/stt";
import { synthesizeSpeech, type TTSVoice } from "../lib/speech/tts";
import { rateLimiter, RATE_LIMITS } from "../lib/guardrails/rateLimiter";
import type { PrismaClient } from "../prisma/generated/client/client";

export function createVoiceRoutes(db: PrismaClient) {
  const router = Router();
  const agentRouter = createAgentRouter(db);

  router.post("/", async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { audio, sessionId, voice, imageBase64 } = req.body;

      if (!audio) {
        return res.status(400).json({
          success: false,
          message: "Audio data is required (base64-encoded).",
        });
      }

      // Rate limiting for voice (stricter)
      const rateLimitResult = await rateLimiter.check(
        userId,
        "voice",
        RATE_LIMITS.voice.maxRequests,
        RATE_LIMITS.voice.windowMs
      );
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          success: false,
          message: "Voice requests are rate limited. Please wait a moment.",
          retryAfter: rateLimitResult.retryAfterMs,
        });
      }

      // Hourly rate limit for voice
      const hourlyResult = await rateLimiter.check(
        userId,
        "hourly",
        RATE_LIMITS.hourly.maxRequests,
        RATE_LIMITS.hourly.windowMs
      );
      if (!hourlyResult.allowed) {
        return res.status(429).json({
          success: false,
          message: "You've reached the hourly limit. Please try again later.",
          retryAfter: hourlyResult.retryAfterMs,
        });
      }

      // 1. Decode base64 audio
      const audioBuffer = Buffer.from(audio, "base64");

      // Voice duration limit: ~60s of audio ≈ ~960KB for WAV, ~120KB for WebM
      // Cap at 5MB to be safe for all formats
      const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
      if (audioBuffer.length > MAX_AUDIO_BYTES) {
        return res.status(400).json({
          success: false,
          message: "Audio is too long. Please keep voice messages under 60 seconds.",
        });
      }

      // 2. Speech-to-text
      const sttResult = await transcribeAudio(audioBuffer);

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

      // 3. Route transcribed text through the agent
      const result = await agentRouter({
        message: sttResult.text.trim(),
        userId,
        sessionId: resolvedSessionId,
        language: sttResult.language,
        ...(imageBase64 ? { imageBase64 } : {}),
      });

      // 4. Text-to-speech on the response
      // Use different voices per agent: nova for Sentient AI, alloy for Help AI (escalation)
      const ttsVoice: TTSVoice = result.escalated ? "alloy" : (voice || "nova") as TTSVoice;
      let audioResponse: string | null = null;
      try {
        const ttsBuffer = await synthesizeSpeech(result.response, ttsVoice);
        audioResponse = ttsBuffer.toString("base64");
      } catch (ttsError) {
        console.error("[VoiceRoute] TTS error:", ttsError);
        // Non-fatal -return text response even if TTS fails
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

  return router;
}
