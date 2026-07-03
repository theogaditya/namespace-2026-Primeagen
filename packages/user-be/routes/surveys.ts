/**
 * Survey Routes
 *
 * API endpoints for survey-related operations.
 * - Public listing of surveys (optional auth)
 * - Protected endpoints for responding and viewing user's responses
 */

import { Router, Request, Response } from "express";
import { PrismaClient } from "../prisma/generated/client/client";

// Extended Request with user data
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    phoneNumber: string;
  };
}

// Answer payload type for request body
interface AnswerPayload {
  questionId: string;
  answerText?: string;
  selectedOpts?: string[];
  ratingValue?: number;
}

interface RespondBody {
  answers: AnswerPayload[];
  startedAt?: string;
}

export function createSurveysRouter(db: PrismaClient) {
  const router = Router();

  /**
   * GET /api/surveys - List public published surveys
   * Optional auth - works for both authenticated and anonymous users
   */
  router.get("/", async (req: Request, res: Response) => {
    try {
      const now = new Date();

      // Pagination
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
      const skip = (page - 1) * limit;

      // Optional filters
      const category = req.query.category as string | undefined;
      const search = req.query.search as string | undefined;
      const statusParam = ((req.query.status as string) || '').toUpperCase();

      // Build where clause based on optional ?status filter
      const basePublic: any = { isPublic: true };
      let statusClause: any;
      if (statusParam === 'CLOSED') {
        statusClause = { status: 'CLOSED' };
      } else if (statusParam === 'OPEN' || statusParam === 'PUBLISHED') {
        statusClause = {
          status: 'PUBLISHED',
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        };
      } else {
        // Default: published (active) OR closed
        statusClause = {
          OR: [
            {
              status: 'PUBLISHED',
              AND: [
                { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
              ],
            },
            { status: 'CLOSED' },
          ],
        };
      }

      const where: any = { ...basePublic, ...statusClause };

      if (category) {
        where.category = category;
      }

      if (search) {
        where.AND = [
          { OR: [{ title: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }] },
        ];
      }

      // Get total count
      const total = await db.survey.count({ where });

      // Fetch surveys
      const surveys = await db.survey.findMany({
        where,
        include: {
          civicPartner: {
            select: {
              orgName: true,
              orgType: true,
            },
          },
          _count: {
            select: {
              questions: true,
              responses: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      });

      return res.json({
        success: true,
        data: surveys,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching surveys:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch surveys",
      });
    }
  });

  /**
   * GET /api/surveys/:id - Get single survey with questions
   * Optional auth
   */
  router.get("/:id", async (req: Request, res: Response, next) => {
    try {
      const { id } = req.params;
      // If a reserved sub-path is requested, forward to next middleware
      // so protected routes (mounted after this router) can handle them.
      if (id === 'my-responses' || id === 'my-response' || id === 'results') {
        return next();
      }
      const now = new Date();

      const survey = await db.survey.findFirst({
        where: {
          id,
          isPublic: true,
          OR: [
            {
              status: "PUBLISHED",
              AND: [
                { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
              ],
            },
            { status: "CLOSED" },
          ],
        },
        include: {
          civicPartner: {
            select: {
              orgName: true,
              orgType: true,
              website: true,
            },
          },
          questions: {
            orderBy: { order: "asc" },
          },
        },
      });

      if (!survey) {
        return res.status(404).json({
          success: false,
          error: "Survey not found or not available",
        });
      }

      return res.json({
        success: true,
        data: survey,
      });
    } catch (error) {
      console.error("Error fetching survey:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch survey",
      });
    }
  });

  /**
   * GET /api/surveys/:id/results - Public aggregated results for a survey
   * Returns per-question breakdown (option frequencies) and total responses.
   */
  router.get('/:id/results', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // Ensure survey exists and is visible (published or closed)
      const survey = await db.survey.findFirst({
        where: {
          id,
          isPublic: true,
          OR: [{ status: 'PUBLISHED' }, { status: 'CLOSED' }],
        },
        include: { questions: true },
      });

      if (!survey) {
        return res.status(404).json({ success: false, error: 'Survey not found or not available' });
      }

      const totalResponses = await db.surveyResponse.count({ where: { surveyId: id } });

      const perQuestion = await Promise.all(
        survey.questions.map(async (q) => {
          if (['MCQ', 'CHECKBOX', 'YES_NO'].includes(q.questionType)) {
            const answers = await db.surveyAnswer.findMany({ where: { questionId: q.id } });
            const freq: Record<string, number> = {};
            for (const a of answers) {
              for (const opt of a.selectedOpts || []) {
                freq[opt] = (freq[opt] || 0) + 1;
              }
            }
            return { questionId: q.id, questionText: q.questionText, questionType: q.questionType, distribution: freq };
          }
          if (q.questionType === 'RATING') {
            const answers = await db.surveyAnswer.findMany({ where: { questionId: q.id, ratingValue: { not: null } }, select: { ratingValue: true } });
            const values = answers.map((a) => a.ratingValue as number);
            const avg = values.length ? Math.round((values.reduce((a,b) => a+b,0)/values.length) * 100) / 100 : null;
            return { questionId: q.id, questionText: q.questionText, questionType: q.questionType, average: avg, count: values.length };
          }
          // TEXT or other types: return count
          const answers = await db.surveyAnswer.count({ where: { questionId: q.id } });
          return { questionId: q.id, questionText: q.questionText, questionType: q.questionType, count: answers };
        })
      );

      return res.json({ success: true, data: { totalResponses, perQuestion } });
    } catch (err) {
      console.error('Error fetching survey results:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch results' });
    }
  });

  return router;
}

/**
 * Protected survey routes requiring authentication
 */
export function createProtectedSurveysRouter(db: PrismaClient) {
  const router = Router();

  /**
   * GET /api/surveys/my-responses - Get user's past survey submissions
   */
  router.get("/my-responses", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const responses = await db.surveyResponse.findMany({
        where: { userId },
        include: {
          survey: {
            select: {
              id: true,
              title: true,
              category: true,
              endsAt: true,
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      });

      return res.json({
        success: true,
        data: responses,
      });
    } catch (error) {
      console.error("Error fetching user responses:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch your responses",
      });
    }
  });

  /**
   * GET /api/surveys/closed - List closed surveys (protected)
   * Optional query: includePrivate=true to also include isPublic=false surveys
   */
  router.get("/closed", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
      const skip = (page - 1) * limit;

      const includePrivate = (req.query.includePrivate === '1' || req.query.includePrivate === 'true');

      const where: any = { status: 'CLOSED' };
      if (!includePrivate) where.isPublic = true;

      const total = await db.survey.count({ where });

      const surveys = await db.survey.findMany({
        where,
        include: {
          civicPartner: { select: { orgName: true, orgType: true } },
          _count: { select: { questions: true, responses: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      return res.json({ success: true, data: surveys, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (err) {
      console.error('Error fetching closed surveys:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch closed surveys' });
    }
  });

  /**
   * GET /api/surveys/:id/my-response - Check if user already responded
   */
  router.get("/:id/my-response", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const { id } = req.params;

      const response = await db.surveyResponse.findFirst({
        where: {
          surveyId: id,
          userId,
        },
        select: {
          id: true,
          submittedAt: true,
        },
      });

      return res.json({
        success: true,
        hasResponded: !!response,
        responseId: response?.id || null,
        submittedAt: response?.submittedAt || null,
      });
    } catch (error) {
      console.error("Error checking response status:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to check response status",
      });
    }
  });

  /**
   * POST /api/surveys/:id/respond - Submit a survey response
   */
  router.post("/:id/respond", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const { id } = req.params;
      const { answers, startedAt } = req.body as RespondBody;

      // Check for existing response
      const existingResponse = await db.surveyResponse.findFirst({
        where: {
          surveyId: id,
          userId,
        },
      });

      if (existingResponse) {
        return res.status(409).json({
          success: false,
          error: "You have already submitted a response to this survey.",
        });
      }

      // Verify survey exists and is available
      const now = new Date();
      const survey = await db.survey.findFirst({
        where: {
          id,
          status: "PUBLISHED",
          isPublic: true,
          AND: [
            {
              OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            },
            {
              OR: [{ endsAt: null }, { endsAt: { gte: now } }],
            },
          ],
        },
        include: {
          questions: true,
        },
      });

      if (!survey) {
        return res.status(404).json({
          success: false,
          error: "Survey not found or not available",
        });
      }

      // Validate answers
      const questionMap = new Map(survey.questions.map((q) => [q.id, q]));
      const answerMap = new Map(answers.map((a) => [a.questionId, a]));

      // Check required questions
      for (const question of survey.questions) {
        if (question.isRequired) {
          const answer = answerMap.get(question.id);
          if (!answer) {
            return res.status(400).json({
              success: false,
              error: `Missing answer for required question: "${question.questionText}"`,
            });
          }

          // Validate based on question type
          const valid = validateAnswer(question, answer);
          if (!valid.isValid) {
            return res.status(400).json({
              success: false,
              error: valid.error,
            });
          }
        }
      }

      // Validate all provided answers against their question types
      for (const answer of answers) {
        const question = questionMap.get(answer.questionId);
        if (!question) {
          return res.status(400).json({
            success: false,
            error: `Invalid question ID: ${answer.questionId}`,
          });
        }

        const valid = validateAnswer(question, answer);
        if (!valid.isValid) {
          return res.status(400).json({
            success: false,
            error: valid.error,
          });
        }
      }

      // Create response in a transaction
      const response = await db.$transaction(async (tx) => {
        const surveyResponse = await tx.surveyResponse.create({
          data: {
            surveyId: id as string,
            userId,
            startedAt: startedAt ? new Date(startedAt) : now,
            submittedAt: now,
            isComplete: true,
          },
        });

        // Create answers
        await tx.surveyAnswer.createMany({
          data: answers.map((answer) => ({
            responseId: surveyResponse.id,
            questionId: answer.questionId,
            answerText: answer.answerText || null,
            selectedOpts: answer.selectedOpts || [],
            ratingValue: answer.ratingValue || null,
          })),
        });

        return surveyResponse;
      });

      return res.json({
        success: true,
        message: "Response submitted successfully.",
        data: { responseId: response.id },
      });
    } catch (error) {
      console.error("Error submitting response:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to submit response",
      });
    }
  });

  return router;
}

/**
 * Validate an answer against its question type
 */
function validateAnswer(
  question: { questionType: string; options: string[]; questionText: string },
  answer: AnswerPayload
): { isValid: boolean; error?: string } {
  switch (question.questionType) {
    case "TEXT":
      if (!answer.answerText || answer.answerText.trim() === "") {
        return { isValid: false, error: `Text answer required for: "${question.questionText}"` };
      }
      break;

    case "MCQ":
    case "YES_NO":
        if (!answer.selectedOpts || answer.selectedOpts.length !== 1) {
          return { isValid: false, error: `Select exactly one option for: "${question.questionText}"` };
        }
        const selectedOpt = answer.selectedOpts[0];
        if (!selectedOpt) {
          return { isValid: false, error: `Invalid option selected for: "${question.questionText}"` };
        }

        // For YES_NO questions it's common for the stored question options to be empty
        // (seeded surveys may omit explicit options). Accept canonical Yes/No values
        // in that case, otherwise validate against provided options.
        if (question.questionType === 'YES_NO') {
          const normalized = String(selectedOpt).toLowerCase();
          const okByText = normalized === 'yes' || normalized === 'no' || normalized === 'y' || normalized === 'n';
          if (question.options && question.options.length > 0) {
            if (!question.options.includes(selectedOpt)) {
              return { isValid: false, error: `Invalid option selected for: "${question.questionText}"` };
            }
          } else if (!okByText) {
            return { isValid: false, error: `Invalid option selected for: "${question.questionText}"` };
          }
        } else {
          if (!question.options.includes(selectedOpt)) {
            return { isValid: false, error: `Invalid option selected for: "${question.questionText}"` };
          }
        }
      break;

    case "CHECKBOX":
      if (!answer.selectedOpts || answer.selectedOpts.length === 0) {
        return { isValid: false, error: `Select at least one option for: "${question.questionText}"` };
      }
      for (const opt of answer.selectedOpts) {
        if (!question.options.includes(opt)) {
          return { isValid: false, error: `Invalid option "${opt}" for: "${question.questionText}"` };
        }
      }
      break;

    case "RATING":
      if (typeof answer.ratingValue !== "number" || answer.ratingValue < 1 || answer.ratingValue > 5) {
        return { isValid: false, error: `Rating must be between 1 and 5 for: "${question.questionText}"` };
      }
      break;

    default:
      return { isValid: false, error: `Unknown question type for: "${question.questionText}"` };
  }

  return { isValid: true };
}
