import { createReactAgent } from "@langchain/langgraph/prebuilt";
import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { PrismaClient } from "../prisma/generated/client/client";

import { getChatModel } from "../lib/models/provider";
import { HELP_AI_SYSTEM_PROMPT } from "../lib/prompts/helpAI";

import { createSearchKnowledgeTool } from "../lib/tools/searchKnowledge";
import { createSendEscalationTool } from "../lib/tools/sendEscalation";
import { createFindMyComplaintsTool } from "../lib/tools/findMyComplaints";
import { createGetComplaintStatusTool } from "../lib/tools/getComplaintStatus";
import { createGetUserProfileTool } from "../lib/tools/getUserProfile";

export interface HelpAIInput {
  message: string;
  userId: string;
  conversationHistory: BaseMessage[];
  escalationContext?: string;
}

export interface HelpAIOutput {
  response: string;
  escalatedToHuman: boolean;
}

/**
 * Wraps a tool so that _userId is auto-injected from the closure.
 */
function bindUserId(tool: DynamicStructuredTool, userId: string): DynamicStructuredTool {
  const originalSchema = tool.schema as z.ZodObject<any>;
  const shape = originalSchema.shape;
  if (!("_userId" in shape)) return tool;
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

export function createHelpAI(db: PrismaClient) {
  const model = getChatModel("chat");

  const toolFactories = (userId: string) => [
    createSearchKnowledgeTool(),
    createSendEscalationTool(db),
    createFindMyComplaintsTool(db),
    createGetComplaintStatusTool(db),
    createGetUserProfileTool(db),
  ].map((t) => bindUserId(t, userId));

  return async function invokeHelpAI(input: HelpAIInput): Promise<HelpAIOutput> {
    const { message, userId, conversationHistory, escalationContext } = input;

    const tools = toolFactories(userId);

    const agent = createReactAgent({
      llm: model,
      tools,
    });

    let augmentedMessage = message;
    if (escalationContext) {
      augmentedMessage += `\n\n[Escalation context from Sentient AI: ${escalationContext}]`;
    }

    const messages: BaseMessage[] = [
      new SystemMessage(HELP_AI_SYSTEM_PROMPT),
      ...conversationHistory,
      new HumanMessage(augmentedMessage),
    ];

    const result = await agent.invoke({ messages });

    // Extract the final AI response
    const lastMessage = result.messages[result.messages.length - 1];
    const responseText =
      typeof lastMessage?.content === "string"
        ? lastMessage.content
        : Array.isArray(lastMessage?.content)
          ? lastMessage.content
              .filter((c: any) => c.type === "text")
              .map((c: any) => c.text)
              .join("")
          : String(lastMessage?.content ?? "");

    const escalatedToHuman = responseText.includes("[ESCALATION_COMPLETE]");

    // Clean markers from the response
    const cleanResponse = responseText
      .replace(/\[ESCALATION_COMPLETE\]/g, "")
      .replace(/\[System context:.*?\]/g, "")
      .trim();

    return {
      response: cleanResponse,
      escalatedToHuman,
    };
  };
}
