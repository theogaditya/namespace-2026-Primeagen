/**
 * Public survey routes — no authentication required.
 * These are consumed by the user-fe to list active surveys and submit responses.
 */
import express from 'express';
import { PrismaClient } from '../prisma/generated/client/client';
import { submitSurveyResponseSchema } from '../lib/schemas/civicPartnerSchema';

export default function (prisma: PrismaClient) {
  const router = express.Router();

  // ─── GET /api/surveys/public ─────────────────────────────────────────────
  // Returns all PUBLISHED surveys for the user-fe feed.
  // Optional filters: ?category=&civicPartnerType=NGO|GOVERNMENT_BODY
  router.get('/public', async (req, res: any) => {
    const { category, civicPartnerType } = req.query as {
      category?: string;
      civicPartnerType?: 'NGO' | 'GOVERNMENT_BODY';
    };

    try {
      const surveys = await prisma.survey.findMany({
        where: {
          status: 'PUBLISHED',
          isPublic: true,
          ...(category ? { category } : {}),
          ...(civicPartnerType
            ? { civicPartner: { orgType: civicPartnerType } }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        include: {
          civicPartner: {
            select: { orgName: true, orgType: true, state: true },
          },
          questions: { orderBy: { order: 'asc' } },
          _count: { select: { responses: true } },
        },
      });

      return res.json({ success: true, surveys });
    } catch (err) {
      console.error('[publicSurveys.list]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // ─── GET /api/surveys/:surveyId/public ───────────────────────────────────
  // Single published survey detail (with questions, minus response data).
  router.get('/:surveyId/public', async (req, res: any) => {
    const { surveyId } = req.params;

    try {
      const survey = await prisma.survey.findFirst({
        where: { id: surveyId, status: 'PUBLISHED', isPublic: true },
        include: {
          civicPartner: {
            select: { orgName: true, orgType: true, state: true },
          },
          questions: { orderBy: { order: 'asc' } },
        },
      });

      if (!survey) {
        return res.status(404).json({ success: false, message: 'Survey not found or no longer active' });
      }

      return res.json({ success: true, survey });
    } catch (err) {
      console.error('[publicSurveys.get]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // ─── POST /api/surveys/:surveyId/respond ─────────────────────────────────
  // Submit a user's response to a published survey.
  router.post('/:surveyId/respond', async (req, res: any) => {
    const { surveyId } = req.params;

    const parsed = submitSurveyResponseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten() });
    }

    const { userId, startedAt, answers } = parsed.data;

    try {
      const survey = await prisma.survey.findFirst({
        where: { id: surveyId, status: 'PUBLISHED', isPublic: true },
        include: { questions: true },
      });

      if (!survey) {
        return res.status(404).json({ success: false, message: 'Survey not found or no longer accepting responses' });
      }

      // Validate that all required questions are answered
      const requiredIds = new Set(
        survey.questions.filter((q) => q.isRequired).map((q) => q.id)
      );
      const answeredIds = new Set(answers.map((a) => a.questionId));
      const missing = [...requiredIds].filter((id) => !answeredIds.has(id));
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing answers for required questions`,
          missingQuestionIds: missing,
        });
      }

      const response = await prisma.$transaction(async (tx) => {
        const created = await tx.surveyResponse.create({
          data: {
            surveyId,
            userId: userId ?? null,
            startedAt: startedAt ? new Date(startedAt) : null,
            isComplete: true,
          },
        });

        await tx.surveyAnswer.createMany({
          data: answers.map((a) => ({
            responseId: created.id,
            questionId: a.questionId,
            answerText: a.answerText ?? null,
            selectedOpts: a.selectedOpts ?? [],
            ratingValue: a.ratingValue ?? null,
          })),
        });

        return created;
      });

      return res.status(201).json({
        success: true,
        message: 'Response submitted successfully',
        responseId: response.id,
      });
    } catch (err) {
      console.error('[publicSurveys.respond]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  return router;
}
