import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { createAgentRouter } from "../agents/router";
import { rateLimiter, RATE_LIMITS } from "../lib/guardrails/rateLimiter";
import type { PrismaClient } from "../prisma/generated/client/client";

export function createChatRoutes(db: PrismaClient) {
  const router = Router();
  const agentRouter = createAgentRouter(db);

  router.post("/", async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { message, sessionId, language, imageBase64 } = req.body;

      const hasText = message && typeof message === "string" && message.trim().length > 0;
      const hasImage = imageBase64 && typeof imageBase64 === "string" && imageBase64.length > 0;

      if (!hasText && !hasImage) {
        return res.status(400).json({
          success: false,
          message: "Message or image is required.",
        });
      }

      if (hasText && message.length > 500) {
        return res.status(400).json({
          success: false,
          message: "Message must be 500 characters or fewer.",
        });
      }

      // Rate limiting
      const rateLimitResult = await rateLimiter.check(
        userId,
        "chat",
        RATE_LIMITS.chat.maxRequests,
        RATE_LIMITS.chat.windowMs
      );
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          success: false,
          message: "You're sending messages too quickly. Please wait a moment.",
          retryAfter: rateLimitResult.retryAfterMs,
        });
      }

      // Hourly rate limit
      const hourlyResult = await rateLimiter.check(
        userId,
        "hourly",
        RATE_LIMITS.hourly.maxRequests,
        RATE_LIMITS.hourly.windowMs
      );
      if (!hourlyResult.allowed) {
        return res.status(429).json({
          success: false,
          message: "You've reached the hourly message limit. Please try again later.",
          retryAfter: hourlyResult.retryAfterMs,
        });
      }

      const resolvedSessionId = sessionId || uuidv4();

      const result = await agentRouter({
        message: hasText ? message.trim() : "[User attached an image]",
        userId,
        sessionId: resolvedSessionId,
        language,
        imageBase64,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("[ChatRoute] Error:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred processing your message.",
      });
    }
  });

  return router;
}
