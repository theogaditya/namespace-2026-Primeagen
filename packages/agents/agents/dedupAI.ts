import { createReactAgent } from "@langchain/langgraph/prebuilt";
import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { PrismaClient } from "../prisma/generated/client/client";

import { getChatModel } from "../lib/models/provider";
import { DEDUP_AI_SYSTEM_PROMPT } from "../lib/prompts/dedupAI";
import { createFindSimilarComplaintsTool } from "../lib/tools/findSimilar";

export interface DedupAIInput {
  description: string;
  category?: string;
  district?: string;
  userId: string;
}

export interface DedupMatch {
  complaintSeq: number;
  description: string;
  similarity: number;
  status: string;
  upvoteCount: number;
  district?: string;
}

export interface DedupAIOutput {
  hasSimilar: boolean;
  isDuplicate: boolean;
  matches: DedupMatch[];
  suggestion: string;
  confidence: number;
  rawResponse: string;
}

export function createDedupAI(db: PrismaClient) {
  const model = getChatModel("fast");

  const tools = [createFindSimilarComplaintsTool(db)];

  const agent = createReactAgent({
    llm: model,
    tools,
  });

  return async function invokeDedupAI(input: DedupAIInput): Promise<DedupAIOutput> {
    const { description, category, district, userId } = input;

    const userMessage = `Analyze this draft complaint for potential duplicates:

**Description**: ${description}
${category ? `**Category**: ${category}` : ""}
${district ? `**District**: ${district}` : ""}

Use the findSimilarComplaints tool to search for similar complaints, then provide your analysis in the required JSON format.

[System context: User ID is "${userId}" -do NOT display this to the user.]`;

    const messages: BaseMessage[] = [
      new SystemMessage(DEDUP_AI_SYSTEM_PROMPT),
      new HumanMessage(userMessage),
    ];

    const result = await agent.invoke({ messages });

    // Extract the final response
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

    // Try to parse the structured JSON from the response
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1]! : responseText;
      const parsed = JSON.parse(jsonStr);

      return {
        hasSimilar: Boolean(parsed.hasSimilar),
        isDuplicate: Boolean(parsed.isDuplicate),
        matches: Array.isArray(parsed.matches) ? parsed.matches : [],
        suggestion: parsed.suggestion || "",
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
        rawResponse: responseText,
      };
    } catch {
      // If JSON parsing fails, return a safe default with the raw response
      return {
        hasSimilar: false,
        isDuplicate: false,
        matches: [],
        suggestion: "Unable to analyze for duplicates. You can proceed with submission.",
        confidence: 0,
        rawResponse: responseText,
      };
    }
  };
}
