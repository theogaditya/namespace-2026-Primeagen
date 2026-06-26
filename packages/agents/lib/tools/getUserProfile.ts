import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { PrismaClient } from "../../prisma/generated/client/client";

/**
 * Get the authenticated user's profile info.
 */
export function createGetUserProfileTool(db: PrismaClient) {
  return new DynamicStructuredTool({
    name: "getUserProfile",
    description:
      "Get the current user's profile information including name, location, badges, and complaint stats. Use when a user asks about their profile, badges, or civic standing.",
    schema: z.object({
      _userId: z.string().describe("The authenticated user's ID (injected automatically)"),
    }),
    func: async ({ _userId }) => {
      const user = await db.user.findUnique({
        where: { id: _userId },
        select: {
          name: true,
          preferredLanguage: true,
          dateOfCreation: true,
          location: {
            select: { district: true, city: true, locality: true, state: true, municipal: true },
          },
          badges: {
            select: {
              badge: { select: { name: true, description: true, icon: true, rarity: true, category: true } },
              earnedAt: true,
            },
            orderBy: { earnedAt: "desc" },
          },
          _count: { select: { complaints: true, upvotes: true } },
        },
      });

      if (!user) {
        return "Could not find your profile. Please try logging in again.";
      }

      return JSON.stringify(
        {
          name: user.name,
          language: user.preferredLanguage,
          memberSince: user.dateOfCreation.toISOString().split("T")[0],
          location: user.location
            ? `${user.location.locality}, ${user.location.city}, ${user.location.district}, ${user.location.state}`
            : "Not set",
          municipality: user.location?.municipal ?? "Not set",
          totalComplaints: user._count.complaints,
          totalUpvotesGiven: user._count.upvotes,
          badges: user.badges.map((ub) => ({
            name: ub.badge.name,
            description: ub.badge.description,
            icon: ub.badge.icon,
            rarity: ub.badge.rarity,
            category: ub.badge.category,
            earnedOn: ub.earnedAt.toISOString().split("T")[0],
          })),
        },
        null,
        2
      );
    },
  });
}
