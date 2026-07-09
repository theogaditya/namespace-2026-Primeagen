import type { PrismaClient } from "../prisma/generated/client/client";
import type { BaseMessage } from "@langchain/core/messages";
import { createSentientAI, type SentientAIOutput } from "./sentientAI";
import { createHelpAI } from "./helpAI";
import { createImageAnalysisAI } from "./imageAnalysisAI";
import { sanitizeInput } from "../lib/guardrails/inputSanitizer";
import { filterOutput } from "../lib/guardrails/outputFilter";
import { sessionMemory } from "../lib/memory/sessionMemory";
import {
  applyComplaintDraftToState,
  looksLikeComplaintIntent,
  normalizeComplaintFlowState,
  updateComplaintStateFromUserMessage,
  type ComplaintCategoryCatalog,
} from "../lib/complaintFlow/state";

/** Strip markdown formatting for clean chat display */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "\u2022 ");
}

export interface ChatInput {
  message: string;
  userId: string;
  sessionId: string;
  language?: string;
  imageBase64?: string;
}

export interface ChatOutput {
  response: string;
  sessionId: string;
  language?: string;
  escalated: boolean;
  complaintFlowStarted: boolean;
  complaintDraft?: any;
  navigationPath?: string;
  detectLocation?: boolean;
}

/**
 * Main agent router.
 * Routes to Sentient AI (Agent 1) and Help AI (Agent 2) on escalation.
 * Dedup AI (Agent 3) is served via /api/dedup route separately.
 * Abuse AI (Agent 4) will be added in a later phase.
 */
export function createAgentRouter(db: PrismaClient) {
  const sentientAI = createSentientAI(db);
  const helpAI = createHelpAI(db);
  const imageAI = createImageAnalysisAI();
  let categoryCatalogCache: ComplaintCategoryCatalog[] | null = null;
  let categoryCatalogLoadedAt = 0;

  async function getComplaintCategoryCatalog(): Promise<ComplaintCategoryCatalog[]> {
    const cacheFresh = categoryCatalogCache && Date.now() - categoryCatalogLoadedAt < 5 * 60_000;
    if (cacheFresh) return categoryCatalogCache!;

    const categories = await db.category.findMany({
      select: {
        name: true,
        subCategories: true,
        learnedSubCategories: true,
      },
      orderBy: { name: "asc" },
    });

    categoryCatalogCache = categories.map((category) => ({
      name: category.name,
      subCategories: category.subCategories,
      learnedSubCategories: category.learnedSubCategories,
    }));
    categoryCatalogLoadedAt = Date.now();
    return categoryCatalogCache;
  }

  return async function routeChat(input: ChatInput): Promise<ChatOutput> {
    const { message, userId, sessionId, imageBase64 } = input;

    // Pre-process image if attached — call local Image Analysis AI agent
    let enrichedMessage = message;
    if (imageBase64) {
      try {
        const dataUrl = imageBase64.startsWith("data:")
          ? imageBase64
          : `data:image/jpeg;base64,${imageBase64}`;
        const imgData = await imageAI({ imageContent: dataUrl });
        enrichedMessage += `\n\n[Image analysis result — category: ${imgData.category}, subCategory: ${imgData.subCategory}, description: ${imgData.complaint}, urgency: ${imgData.urgency}]`;
      } catch (imgErr) {
        console.error("[AgentRouter] Image pre-processing failed:", imgErr);
      }
    }

    // 1. Input sanitization (guardrails)
    const sanitized = await sanitizeInput(enrichedMessage);
    if (!sanitized.safe) {
      return {
        response:
          "I can't process that request. I'm here to help you with SwarajDesk -filing complaints, tracking issues, getting information about civic services, and more. What can I help you with?",
        sessionId,
        escalated: false,
        complaintFlowStarted: false,
      };
    }

    // 2. Get conversation history + structured complaint state from session memory
    const history = await sessionMemory.getHistory(userId, sessionId);
    let complaintState = normalizeComplaintFlowState(
      await sessionMemory.getComplaintState(userId, sessionId)
    );

    const shouldTrackComplaintState =
      complaintState?.active || looksLikeComplaintIntent(enrichedMessage) || Boolean(imageBase64);
    if (shouldTrackComplaintState) {
      const categoryCatalog = await getComplaintCategoryCatalog();
      complaintState = updateComplaintStateFromUserMessage(complaintState, enrichedMessage, {
        categoryCatalog,
        imageAttached: Boolean(imageBase64),
      });
      await sessionMemory.setComplaintState(userId, sessionId, complaintState);
    }

    // 3. Add user message to history
    await sessionMemory.addMessage(userId, sessionId, "human", message);

    // 4. Route to Sentient AI (primary agent)
    let result: SentientAIOutput;
    try {
      result = await sentientAI({
        message: enrichedMessage,
        userId,
        conversationHistory: history,
        complaintState,
      });
    } catch (error) {
      console.error("[AgentRouter] Sentient AI error:", error);
      return {
        response:
          "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.",
        sessionId,
        escalated: false,
        complaintFlowStarted: false,
      };
    }

    // 5. Output filtering (PII redaction, admin data stripping)
    const filtered = filterOutput(result.response, userId);
    filtered.output = stripMarkdown(filtered.output);

    // 6. Save AI response to history
    await sessionMemory.addMessage(userId, sessionId, "ai", filtered.output);

    // 6b. Update structured complaint state from the latest agent outcome
    if (result.complaintDraft) {
      complaintState = applyComplaintDraftToState(complaintState, result.complaintDraft);
      await sessionMemory.clearComplaintState(userId, sessionId);
    } else if (complaintState?.active || result.shouldStartComplaint || result.detectLocation) {
      const nextComplaintState = normalizeComplaintFlowState({
        ...complaintState,
        active: complaintState?.active || result.shouldStartComplaint,
        detectLocationRequested: result.detectLocation || complaintState?.detectLocationRequested,
        photoAttached: complaintState?.photoAttached || Boolean(imageBase64),
        lastUpdatedAt: Date.now(),
      });
      await sessionMemory.setComplaintState(userId, sessionId, nextComplaintState);
    }

    // 7. Handle escalation to Help AI
    if (result.shouldEscalate) {
      try {
        const helpResult = await helpAI({
          message,
          userId,
          conversationHistory: history,
          escalationContext: filtered.output,
        });

        const helpFiltered = filterOutput(helpResult.response, userId);
        helpFiltered.output = stripMarkdown(helpFiltered.output);
        await sessionMemory.addMessage(userId, sessionId, "ai", helpFiltered.output);

        return {
          response: helpFiltered.output,
          sessionId,
          escalated: true,
          complaintFlowStarted: false,
        };
      } catch (helpError) {
        console.error("[AgentRouter] Help AI error:", helpError);
        // Fall through to return Sentient AI's response if Help AI fails
      }
    }

    return {
      response: filtered.output,
      sessionId,
      escalated: result.shouldEscalate,
      complaintFlowStarted: result.shouldStartComplaint,
      complaintDraft: result.complaintDraft,
      navigationPath: result.navigationPath,
      detectLocation: result.detectLocation,
    };
  };
}
