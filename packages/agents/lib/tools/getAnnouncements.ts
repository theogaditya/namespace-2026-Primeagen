import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { PrismaClient } from "../../prisma/generated/client/client";

/**
 * Get latest admin announcements/news updates.
 */
export function createGetAnnouncementsTool(db: PrismaClient) {
  return new DynamicStructuredTool({
    name: "getAnnouncements",
    description:
      "Get the latest announcements and news updates from platform administrators. Use when a user asks about news, updates, or announcements.",
    schema: z.object({
      limit: z.number().optional().nullable().default(5).describe("Max results (default 5)"),
    }),
    func: async ({ limit }) => {
      const news = await db.newsUpdate.findMany({
        take: Math.min(limit ?? 5, 10),
        orderBy: { date: "desc" },
        select: {
          title: true,
          content: true,
          date: true,
        },
      });

      if (news.length === 0) {
        return "No announcements at this time.";
      }

      return JSON.stringify(
        news.map((n) => ({
          title: n.title,
          content: n.content.substring(0, 300),
          date: n.date.toISOString().split("T")[0],
        })),
        null,
        2
      );
    },
  });
}
