import { createReactAgent } from "@langchain/langgraph/prebuilt";
import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { PrismaClient } from "../prisma/generated/client/client";

import { getChatModel } from "../lib/models/provider";
import { SENTIENT_AI_SYSTEM_PROMPT } from "../lib/prompts/sentientAI";

import { createFindComplaintsTool } from "../lib/tools/findComplaints";
import { createFindMyComplaintsTool } from "../lib/tools/findMyComplaints";
import { createGetTrendingTool } from "../lib/tools/getTrending";
import { createGetCategoriesTool } from "../lib/tools/getCategories";
import { createGetUserProfileTool } from "../lib/tools/getUserProfile";
import { createGetDistrictInfoTool } from "../lib/tools/getDistrictInfo";
import { createGetAnnouncementsTool } from "../lib/tools/getAnnouncements";
import { createGetDepartmentStatsTool } from "../lib/tools/getDepartmentStats";
import { createGetGuidanceTool } from "../lib/tools/getGuidance";
import { createGetComplaintStatusTool } from "../lib/tools/getComplaintStatus";
import { createSearchKnowledgeTool } from "../lib/tools/searchKnowledge";
import { createFindSimilarComplaintsTool } from "../lib/tools/findSimilar";
import { createSendEscalationTool } from "../lib/tools/sendEscalation";
import { createComplaintDraftTool } from "../lib/tools/createComplaintDraft";
import { createAnalyzeImageTool } from "../lib/tools/analyzeImage";
import { createNavigateToTool } from "../lib/tools/navigateTo";
import { createUpvoteComplaintTool } from "../lib/tools/upvoteComplaint";
import { createDetectLocationTool } from "../lib/tools/detectLocation";
import type { ComplaintFlowState } from "../lib/complaintFlow/state";
import { buildComplaintStateSystemContext } from "../lib/complaintFlow/state";

export interface SentientAIInput {
  message: string;
  userId: string;
  conversationHistory: BaseMessage[];
  complaintState?: ComplaintFlowState | null;
}

export interface SentientAIOutput {
  response: string;
  shouldEscalate: boolean;
  shouldStartComplaint: boolean;
  complaintDraft?: any;
  navigationPath?: string;
  detectLocation?: boolean;
}

/**
 * Wraps a tool so that _userId is auto-injected from the closure,
 * removing it from the schema the LLM sees.
 */
function bindUserId(tool: DynamicStructuredTool, userId: string): DynamicStructuredTool {
  const originalSchema = tool.schema as z.ZodObject<any>;
  const shape = originalSchema.shape;

  // If the tool doesn't have _userId, return as-is
  if (!("_userId" in shape)) return tool;

  // Build a new schema without _userId
  const { _userId, ...rest } = shape;
  const newSchema = z.object(rest);

  return new DynamicStructuredTool({
    name: tool.name,
    description: tool.description,
    schema: newSchema,
    func: async (args: any) => {
      return (tool as any).func({ ...args, _userId: userId });
    },
  });
}

export function createSentientAI(db: PrismaClient) {
  const model = getChatModel("chat");

  // Tool factories -actual tools are created per-request with userId bound
  const toolFactories = (userId: string) => [
    createFindComplaintsTool(db),
    createFindMyComplaintsTool(db),
    createGetTrendingTool(db),
    createGetCategoriesTool(db),
    createGetUserProfileTool(db),
    createGetDistrictInfoTool(db),
    createGetAnnouncementsTool(db),
    createGetDepartmentStatsTool(db),
    createGetGuidanceTool(),
    createGetComplaintStatusTool(db),
    createSearchKnowledgeTool(),
    createFindSimilarComplaintsTool(db),
    createSendEscalationTool(db),
    createComplaintDraftTool(),
    createAnalyzeImageTool(),
    createNavigateToTool(),
    createUpvoteComplaintTool(db),
    createDetectLocationTool(),
  ].map((t) => bindUserId(t, userId));

  return async function invokeSentientAI(input: SentientAIInput): Promise<SentientAIOutput> {
    const { message, userId, conversationHistory, complaintState } = input;

    // Create tools with userId auto-injected
    const tools = toolFactories(userId);

    // Create per-request agent with bound tools
    const agent = createReactAgent({
      llm: model,
      tools,
    });

    const complaintStateContext = buildComplaintStateSystemContext(complaintState || null);
    const messages: BaseMessage[] = [
      new SystemMessage(SENTIENT_AI_SYSTEM_PROMPT),
      ...(complaintStateContext ? [new SystemMessage(complaintStateContext)] : []),
      ...conversationHistory,
      new HumanMessage(message),
    ];

    const result = await agent.invoke({
      messages,
    });

    // Extract the final AI response
    const lastMessage = result.messages[result.messages.length - 1];
    const responseText = typeof lastMessage?.content === "string"
      ? lastMessage.content
      : Array.isArray(lastMessage?.content)
        ? lastMessage.content
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text)
            .join("")
        : String(lastMessage?.content ?? "");

    // Check for escalation/complaint markers
    const shouldEscalate = responseText.includes("[ESCALATE_TO_HELP_AI]");
    const shouldStartComplaint = responseText.includes("[START_COMPLAINT_FLOW]");

    // Detect structured actions from tool outputs (COMPLAINT_DRAFT_READY, NAVIGATE, DETECT_LOCATION)
    let complaintDraft: any;
    let navigationPath: string | undefined;
    let detectLocation = false;

    // Scan all messages for tool outputs containing actions
    for (const msg of result.messages) {
      const content = typeof msg.content === "string" ? msg.content : "";
      if (content.includes('"action"')) {
        try {
          const parsed = JSON.parse(content);
          if (parsed.action === "COMPLAINT_DRAFT_READY" && parsed.draft) {
            complaintDraft = parsed.draft;
          } else if (parsed.action === "NAVIGATE" && parsed.path) {
            navigationPath = parsed.path;
          } else if (parsed.action === "DETECT_LOCATION") {
            detectLocation = true;
          }
        } catch {
          // Also try to extract JSON from within mixed text
          const jsonMatch = content.match(/\{"action"\s*:\s*"(?:COMPLAINT_DRAFT_READY|NAVIGATE|DETECT_LOCATION)"[^}]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.action === "COMPLAINT_DRAFT_READY") {
                complaintDraft = parsed.draft;
              } else if (parsed.action === "NAVIGATE") {
                navigationPath = parsed.path;
              } else if (parsed.action === "DETECT_LOCATION") {
                detectLocation = true;
              }
            } catch { /* ignore */ }
          }
        }
      }
    }

    // Clean markers from the response before sending to user
    const cleanResponse = responseText
      .replace(/\[ESCALATE_TO_HELP_AI\]/g, "")
      .replace(/\[START_COMPLAINT_FLOW\]/g, "")
      .replace(/\[System context:.*?\]/g, "")
      .replace(/\{"action"\s*:\s*"(?:COMPLAINT_DRAFT_READY|NAVIGATE|DETECT_LOCATION)".*?\}(?:\})?/g, "")
      .trim();

    return {
      response: cleanResponse,
      shouldEscalate,
      shouldStartComplaint: shouldStartComplaint || !!complaintDraft,
      complaintDraft,
      navigationPath,
      detectLocation,
    };
  };
}
