import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { PrismaClient } from "../../prisma/generated/client/client";
import { getEmbeddingModel } from "../models/provider";

/**
 * Tool for finding semantically similar complaints using embedding-based cosine similarity.
 * Used by Dedup AI to identify potential duplicates before a user submits a new complaint.
 *
 * Strategy:
 * 1. Fetch recent complaints (90 days) in the same category and district
 * 2. Compute embeddings for the candidate and existing complaints
 * 3. Calculate cosine similarity
 * 4. Return top matches above threshold
 */
export function createFindSimilarComplaintsTool(db: PrismaClient) {
  return new DynamicStructuredTool({
    name: "findSimilarComplaints",
    description:
      "Find existing complaints that are semantically similar to a draft complaint. Uses AI embeddings to compare meaning, not just keywords. Returns matches with similarity scores.",
    schema: z.object({
      description: z.string().describe("The full description of the draft complaint"),
      category: z.string().optional().nullable().describe("Category name of the complaint"),
      district: z.string().optional().nullable().describe("District where the complaint is located"),
      maxResults: z.number().optional().nullable().default(5).describe("Maximum number of similar complaints to return"),
    }),
    func: async ({ description, category, district, maxResults }) => {
      try {
        const take = Math.min(maxResults ?? 5, 10);

        // Build filter: same category, same district, last 90 days
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const where: any = {
          submissionDate: { gte: ninetyDaysAgo },
          status: { not: "DISCARDED" },
        };

        if (category) {
          where.category = { name: { contains: category, mode: "insensitive" } };
        }

        if (district) {
          where.location = { district: { contains: district, mode: "insensitive" } };
        }

        // Fetch candidate complaints (limit pool to avoid embedding too many)
        const candidates = await db.complaint.findMany({
          where,
          take: 100,
          orderBy: { submissionDate: "desc" },
          select: {
            seq: true,
            description: true,
            subCategory: true,
            status: true,
            urgency: true,
            upvoteCount: true,
            submissionDate: true,
            location: {
              select: { district: true, pin: true },
            },
            category: {
              select: { name: true },
            },
          },
        });

        if (candidates.length === 0) {
          return JSON.stringify({
            hasSimilar: false,
            isDuplicate: false,
            matches: [],
            totalCandidatesSearched: 0,
          });
        }

        // Get the embedding model
        const embeddings = getEmbeddingModel();

        // Compute embedding for the draft complaint
        const [draftEmbedding] = await embeddings.embedDocuments([description]);

        // Compute embeddings for candidate descriptions (batch)
        const candidateTexts = candidates.map((c: any) => c.description || "");
        const candidateEmbeddings = await embeddings.embedDocuments(candidateTexts);

        // Calculate cosine similarity for each candidate
        const matches: any[] = [];
        for (let i = 0; i < candidates.length; i++) {
          const similarity = cosineSimilarity(draftEmbedding!, candidateEmbeddings[i]!);

          if (similarity >= 0.60) {
            const c = candidates[i]!;
            matches.push({
              complaintSeq: c.seq,
              description: (c.description || "").substring(0, 200),
              similarity: Math.round(similarity * 1000) / 1000,
              status: c.status,
              upvoteCount: c.upvoteCount,
              category: c.category?.name,
              district: c.location?.district,
              submissionDate: c.submissionDate,
            });
          }
        }

        // Sort by similarity descending, take top results
        matches.sort((a, b) => b.similarity - a.similarity);
        const topMatches = matches.slice(0, take);

        const hasSimilar = topMatches.some((m) => m.similarity >= 0.70);
        const isDuplicate = topMatches.some((m) => m.similarity >= 0.90);

        return JSON.stringify({
          hasSimilar,
          isDuplicate,
          matches: topMatches,
          totalCandidatesSearched: candidates.length,
        });
      } catch (error) {
        console.error("[FindSimilar] Error:", error);
        return JSON.stringify({
          hasSimilar: false,
          isDuplicate: false,
          matches: [],
          error: "Failed to search for similar complaints. The complaint can still be submitted.",
        });
      }
    },
  });
}

/**
 * Compute cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}
