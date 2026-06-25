import express from 'express';
import { PrismaClient } from '../prisma/generated/client/client';
import { authenticateCivicPartner, getCivicPartner } from '../middleware/civicPartnerAuth';
import { createSurveySchema, updateSurveySchema } from '../lib/schemas/civicPartnerSchema';

export default function (prisma: PrismaClient) {
  const router = express.Router();

  // All routes in this file require a verified CivicPartner JWT
  router.use(authenticateCivicPartner);

  // ─── GET /api/civic-partner/surveys ─────────────────────────────────────
  // List all surveys belonging to the authenticated CivicPartner.
  // Optional query param: ?status=DRAFT|PUBLISHED|CLOSED|ARCHIVED
  router.get('/', async (req, res: any) => {
    const { id: civicPartnerId } = getCivicPartner(req);
    const { status } = req.query as { status?: string };

    try {
      const surveys = await prisma.survey.findMany({
        where: {
          civicPartnerId,
          ...(status ? { status: status as any } : {}),
        },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { responses: true, questions: true } },
        },
      });

      return res.json({ success: true, surveys });
    } catch (err) {
      console.error('[surveys.list]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // ─── POST /api/civic-partner/surveys ────────────────────────────────────
  // Create a new survey with its questions in a single transaction.
  router.post('/', async (req, res: any) => {
    const { id: civicPartnerId } = getCivicPartner(req);

    const parsed = createSurveySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten() });
    }

    const { questions, startsAt, endsAt, sourceUrl, website: _w, ...surveyData } = parsed.data as any;

    try {
      const survey = await prisma.$transaction(async (tx) => {
        const created = await tx.survey.create({
          data: {
            civicPartnerId,
            title: surveyData.title,
            description: surveyData.description,
            sourceType: surveyData.sourceType,
            category: surveyData.category,
            content: surveyData.content,
            sourceUrl: sourceUrl || null,
            startsAt: startsAt ? new Date(startsAt) : null,
            endsAt: endsAt ? new Date(endsAt) : null,
          },
        });

        await tx.surveyQuestion.createMany({
          data: (questions as any[]).map((q: any) => ({
            surveyId: created.id,
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options ?? [],
            isRequired: q.isRequired ?? true,
            order: q.order,
          })),
        });

        return tx.survey.findUnique({
          where: { id: created.id },
          include: { questions: { orderBy: { order: 'asc' } } },
        });
      });

      return res.status(201).json({ success: true, survey });
    } catch (err) {
      console.error('[surveys.create]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // ─── GET /api/civic-partner/surveys/:surveyId ────────────────────────────
  router.get('/:surveyId', async (req, res: any) => {
    const { id: civicPartnerId } = getCivicPartner(req);
    const { surveyId } = req.params;

    try {
      const survey = await prisma.survey.findFirst({
        where: { id: surveyId, civicPartnerId },
        include: {
          questions: { orderBy: { order: 'asc' } },
          _count: { select: { responses: true } },
        },
      });

      if (!survey) {
        return res.status(404).json({ success: false, message: 'Survey not found' });
      }

      return res.json({ success: true, survey });
    } catch (err) {
      console.error('[surveys.get]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // ─── PATCH /api/civic-partner/surveys/:surveyId ──────────────────────────
  // Edit a survey. Only allowed while status === DRAFT.
  router.patch('/:surveyId', async (req, res: any) => {
    const { id: civicPartnerId } = getCivicPartner(req);
    const { surveyId } = req.params;

    const parsed = updateSurveySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten() });
    }

    try {
      const existing = await prisma.survey.findFirst({ where: { id: surveyId, civicPartnerId } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Survey not found' });
      }
      if (existing.status !== 'DRAFT') {
        return res.status(400).json({
          success: false,
          message: 'Survey can only be edited while in DRAFT status',
        });
      }

      const { questions, startsAt, endsAt, sourceUrl, ...fields } = parsed.data as any;

      const updated = await prisma.$transaction(async (tx) => {
        await tx.survey.update({
          where: { id: surveyId },
          data: {
            ...fields,
            sourceUrl: sourceUrl || null,
            startsAt: startsAt ? new Date(startsAt) : undefined,
            endsAt: endsAt ? new Date(endsAt) : undefined,
          },
        });

        if (questions) {
          // Replace all questions on edit to keep ordering clean
          await tx.surveyQuestion.deleteMany({ where: { surveyId } });
          await tx.surveyQuestion.createMany({
            data: questions.map((q: any) => ({
              surveyId,
              questionText: q.questionText,
              questionType: q.questionType,
              options: q.options ?? [],
              isRequired: q.isRequired ?? true,
              order: q.order,
            })),
          });
        }

        return tx.survey.findUnique({
          where: { id: surveyId },
          include: { questions: { orderBy: { order: 'asc' } } },
        });
      });

      return res.json({ success: true, survey: updated });
    } catch (err) {
      console.error('[surveys.update]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // ─── POST /api/civic-partner/surveys/:surveyId/publish ──────────────────
  router.post('/:surveyId/publish', async (req, res: any) => {
    const { id: civicPartnerId } = getCivicPartner(req);
    const { surveyId } = req.params;

    try {
      const existing = await prisma.survey.findFirst({ where: { id: surveyId, civicPartnerId } });
      if (!existing) return res.status(404).json({ success: false, message: 'Survey not found' });
      if (existing.status !== 'DRAFT') {
        return res.status(400).json({ success: false, message: 'Only DRAFT surveys can be published' });
      }

      const survey = await prisma.survey.update({
        where: { id: surveyId },
        data: { status: 'PUBLISHED', isPublic: true },
      });

      return res.json({ success: true, message: 'Survey published successfully', survey });
    } catch (err) {
      console.error('[surveys.publish]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // ─── POST /api/civic-partner/surveys/:surveyId/close ────────────────────
  router.post('/:surveyId/close', async (req, res: any) => {
    const { id: civicPartnerId } = getCivicPartner(req);
    const { surveyId } = req.params;

    try {
      const existing = await prisma.survey.findFirst({ where: { id: surveyId, civicPartnerId } });
      if (!existing) return res.status(404).json({ success: false, message: 'Survey not found' });
      if (existing.status !== 'PUBLISHED') {
        return res.status(400).json({ success: false, message: 'Only PUBLISHED surveys can be closed' });
      }

      const survey = await prisma.survey.update({
        where: { id: surveyId },
        data: { status: 'CLOSED', isPublic: false },
      });

      return res.json({ success: true, message: 'Survey closed', survey });
    } catch (err) {
      console.error('[surveys.close]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // ─── DELETE /api/civic-partner/surveys/:surveyId ─────────────────────────
  // Soft-delete: moves survey to ARCHIVED status.
  router.delete('/:surveyId', async (req, res: any) => {
    const { id: civicPartnerId } = getCivicPartner(req);
    const { surveyId } = req.params;

    try {
      const existing = await prisma.survey.findFirst({ where: { id: surveyId, civicPartnerId } });
      if (!existing) return res.status(404).json({ success: false, message: 'Survey not found' });

      await prisma.survey.update({
        where: { id: surveyId },
        data: { status: 'ARCHIVED', isPublic: false },
      });

      return res.json({ success: true, message: 'Survey archived' });
    } catch (err) {
      console.error('[surveys.archive]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // ─── POST /api/civic-partner/surveys/:surveyId/respond ──────────────────
  // Public endpoint — no civicPartner auth needed — accepts a user's response.
  // Mounted without the router-level authenticateCivicPartner guard above
  // because this must be callable from user-fe (anonymous users included).
  return router;
}
