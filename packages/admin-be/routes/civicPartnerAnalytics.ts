/**
 * Analytics routes for CivicPartner dashboard.
 * All routes require a verified CivicPartner JWT.
 *
 * Route prefix: /api/civic-partner/analytics
 */
import express from 'express';
import { PrismaClient } from '../prisma/generated/client/client';
import { authenticateCivicPartner, getCivicPartner } from '../middleware/civicPartnerAuth';

export default function (prisma: PrismaClient) {
  const router = express.Router();

  router.use(authenticateCivicPartner);

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /** Ensure the survey belongs to the authenticated CivicPartner */
  async function getSurveyOrFail(
    surveyId: string,
    civicPartnerId: string,
    res: any
  ) {
    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, civicPartnerId },
    });
    if (!survey) {
      res
        .status(404)
        .json({ success: false, message: 'Survey not found' });
      return null;
    }
    return survey;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PORTFOLIO METRICS  (across all surveys -dashboard home)
  // GET /api/civic-partner/analytics/portfolio
  // ─────────────────────────────────────────────────────────────────────────
  router.get('/portfolio', async (req, res: any) => {
    const { id: civicPartnerId } = getCivicPartner(req);

    try {
      // Survey counts by status
      const statusCounts = await prisma.survey.groupBy({
        by: ['status'],
        where: { civicPartnerId },
        _count: { _all: true },
      });

      // All-time total responses across all surveys
      const totalResponsesResult = await prisma.surveyResponse.aggregate({
        where: { survey: { civicPartnerId } },
        _count: { _all: true },
      });

      // Per-survey response counts to find the most-responded survey
      const surveyResponseCounts = await prisma.survey.findMany({
        where: { civicPartnerId },
        select: {
          id: true,
          title: true,
          status: true,
          category: true,
          createdAt: true,
          startsAt: true,
          endsAt: true,
          _count: { select: { responses: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const mostResponded = surveyResponseCounts.reduce(
        (best, s) => (s._count.responses > (best?._count?.responses ?? -1) ? s : best),
        null as any
      );

      // Completion rate per survey
      const perSurveyCompletionRates = await Promise.all(
        surveyResponseCounts.map(async (s) => {
          const total = s._count.responses;
          if (total === 0) return { surveyId: s.id, completionRate: null };
          const complete = await prisma.surveyResponse.count({
            where: { surveyId: s.id, isComplete: true },
          });
          return { surveyId: s.id, completionRate: Math.round((complete / total) * 100) };
        })
      );

      const validRates = perSurveyCompletionRates
        .map((r) => r.completionRate)
        .filter((v): v is number => v !== null);

      const avgCompletionRate =
        validRates.length > 0
          ? Math.round(validRates.reduce((a, b) => a + b, 0) / validRates.length)
          : null;

      // Category coverage
      const categoryCounts = await prisma.survey.groupBy({
        by: ['category'],
        where: { civicPartnerId },
        _count: { _all: true },
      });

      return res.json({
        success: true,
        portfolio: {
          surveyCountByStatus: statusCounts.reduce(
            (acc, row) => ({ ...acc, [row.status]: row._count._all }),
            {} as Record<string, number>
          ),
          totalSurveys: surveyResponseCounts.length,
          allTimeResponses: totalResponsesResult._count._all,
          mostRespondedSurvey: mostResponded
            ? {
                id: mostResponded.id,
                title: mostResponded.title,
                responseCount: mostResponded._count.responses,
              }
            : null,
          avgCompletionRate,
          categoryCoverage: categoryCounts.map((c) => ({
            category: c.category,
            surveyCount: c._count._all,
          })),
          surveys: surveyResponseCounts,
        },
      });
    } catch (err) {
      console.error('[analytics.portfolio]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SURVEY OVERVIEW KPIs
  // GET /api/civic-partner/analytics/:surveyId/overview
  // ─────────────────────────────────────────────────────────────────────────
  router.get('/:surveyId/overview', async (req, res: any) => {
    const { id: civicPartnerId } = getCivicPartner(req);
    const { surveyId } = req.params;

    const survey = await getSurveyOrFail(surveyId, civicPartnerId, res);
    if (!survey) return;

    try {
      const totalResponses = await prisma.surveyResponse.count({ where: { surveyId } });
      const completeResponses = await prisma.surveyResponse.count({
        where: { surveyId, isComplete: true },
      });

      // Unique logged-in respondents
      const uniqueCount = await prisma.surveyResponse.groupBy({
        by: ['userId'],
        where: { surveyId, userId: { not: null } },
        _count: { _all: true },
      });

      // Buckets: last 24h / 7d / 30d
      const now = new Date();
      const minus = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);

      const [last24h, last7d, last30d] = await Promise.all([
        prisma.surveyResponse.count({ where: { surveyId, submittedAt: { gte: minus(24) } } }),
        prisma.surveyResponse.count({ where: { surveyId, submittedAt: { gte: minus(24 * 7) } } }),
        prisma.surveyResponse.count({ where: { surveyId, submittedAt: { gte: minus(24 * 30) } } }),
      ]);

      // Average time to complete (seconds) -requires startedAt to be populated
      const timedResponses = await prisma.surveyResponse.findMany({
        where: { surveyId, isComplete: true, startedAt: { not: null } },
        select: { startedAt: true, submittedAt: true },
      });
      let avgTimeToCompleteSeconds: number | null = null;
      if (timedResponses.length > 0) {
        const totalSeconds = timedResponses.reduce((sum, r) => {
          return sum + (r.submittedAt.getTime() - r.startedAt!.getTime()) / 1000;
        }, 0);
        avgTimeToCompleteSeconds = Math.round(totalSeconds / timedResponses.length);
      }

      const completionRate =
        totalResponses > 0 ? Math.round((completeResponses / totalResponses) * 100) : 0;

      return res.json({
        success: true,
        overview: {
          totalResponses,
          completeResponses,
          uniqueRespondents: uniqueCount.length,
          completionRate,
          dropOffRate: 100 - completionRate,
          avgTimeToCompleteSeconds,
          last24h,
          last7d,
          last30d,
          surveyPeriod:
            survey.startsAt && survey.endsAt
              ? {
                  startsAt: survey.startsAt,
                  endsAt: survey.endsAt,
                  durationDays: Math.ceil(
                    (survey.endsAt.getTime() - survey.startsAt.getTime()) /
                      (1000 * 60 * 60 * 24)
                  ),
                }
              : null,
        },
      });
    } catch (err) {
      console.error('[analytics.overview]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PER-QUESTION BREAKDOWN
  // GET /api/civic-partner/analytics/:surveyId/question/:questionId
  // ─────────────────────────────────────────────────────────────────────────
  router.get('/:surveyId/question/:questionId', async (req, res: any) => {
    const { id: civicPartnerId } = getCivicPartner(req);
    const { surveyId, questionId } = req.params;

    const survey = await getSurveyOrFail(surveyId, civicPartnerId, res);
    if (!survey) return;

    try {
      const question = await prisma.surveyQuestion.findFirst({
        where: { id: questionId, surveyId },
      });
      if (!question) {
        return res.status(404).json({ success: false, message: 'Question not found' });
      }

      const answers = await prisma.surveyAnswer.findMany({ where: { questionId } });
      const totalAnswers = answers.length;

      let breakdown: Record<string, any> = {};

      switch (question.questionType) {
        case 'MCQ':
        case 'CHECKBOX': {
          const freq: Record<string, number> = {};
          for (const a of answers) {
            for (const opt of a.selectedOpts) {
              freq[opt] = (freq[opt] ?? 0) + 1;
            }
          }
          const distribution = Object.entries(freq)
            .map(([option, count]) => ({
              option,
              count,
              percentage: totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0,
            }))
            .sort((a, b) => b.count - a.count);

          breakdown = {
            distribution,
            mostSelected: distribution[0]?.option ?? null,
            leastSelected: distribution[distribution.length - 1]?.option ?? null,
          };
          break;
        }

        case 'RATING': {
          const validRatings = answers
            .map((a) => a.ratingValue)
            .filter((v): v is number => v !== null);
          const avg =
            validRatings.length > 0
              ? validRatings.reduce((a, b) => a + b, 0) / validRatings.length
              : null;

          const dist: Record<number, number> = {};
          for (const v of validRatings) dist[v] = (dist[v] ?? 0) + 1;

          // NPS bucketing (1-10 scale)
          const detractors = validRatings.filter((v) => v <= 6).length;
          const passives = validRatings.filter((v) => v === 7 || v === 8).length;
          const promoters = validRatings.filter((v) => v >= 9).length;
          const nps =
            validRatings.length > 0
              ? Math.round(
                  ((promoters - detractors) / validRatings.length) * 100
                )
              : null;

          breakdown = {
            avgRating: avg !== null ? Math.round(avg * 10) / 10 : null,
            distribution: Object.entries(dist)
              .map(([rating, count]) => ({ rating: Number(rating), count }))
              .sort((a, b) => a.rating - b.rating),
            nps: { detractors, passives, promoters, score: nps },
          };
          break;
        }

        case 'YES_NO': {
          const yes = answers.filter((a) => a.selectedOpts.includes('yes') || a.selectedOpts.includes('Yes') || a.selectedOpts.includes('YES')).length;
          const no = totalAnswers - yes;
          breakdown = {
            yes,
            no,
            yesPercentage: totalAnswers > 0 ? Math.round((yes / totalAnswers) * 100) : 0,
            noPercentage: totalAnswers > 0 ? Math.round((no / totalAnswers) * 100) : 0,
          };
          break;
        }

        case 'TEXT': {
          // Word frequency (stop-words stripped client-side or via AI pipeline -we return raw texts here)
          const texts = answers.map((a) => a.answerText).filter(Boolean) as string[];
          const wordFreq = computeWordFrequency(texts);
          breakdown = {
            totalTextResponses: texts.length,
            topKeywords: wordFreq.slice(0, 20),
            // Sample verbatim responses (first 10)
            samples: texts.slice(0, 10),
          };
          break;
        }
      }

      return res.json({
        success: true,
        question: {
          id: question.id,
          questionText: question.questionText,
          questionType: question.questionType,
          totalAnswers,
          breakdown,
        },
      });
    } catch (err) {
      console.error('[analytics.question]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TREND ANALYTICS (time-series)
  // GET /api/civic-partner/analytics/:surveyId/trends
  // Query: ?granularity=daily|weekly  (default: daily)
  // ─────────────────────────────────────────────────────────────────────────
  router.get('/:surveyId/trends', async (req, res: any) => {
    const { id: civicPartnerId } = getCivicPartner(req);
    const { surveyId } = req.params;
    const granularity = (req.query.granularity as string) ?? 'daily';

    const survey = await getSurveyOrFail(surveyId, civicPartnerId, res);
    if (!survey) return;

    try {
      const responses = await prisma.surveyResponse.findMany({
        where: { surveyId },
        select: { submittedAt: true },
        orderBy: { submittedAt: 'asc' },
      });

      // Build daily / weekly buckets
      const buckets: Record<string, number> = {};
      for (const r of responses) {
        const key = granularity === 'weekly'
          ? getWeekKey(r.submittedAt)
          : r.submittedAt.toISOString().slice(0, 10); // YYYY-MM-DD
        buckets[key] = (buckets[key] ?? 0) + 1;
      }

      const timeSeries = Object.entries(buckets).map(([date, count]) => ({ date, count }));

      // Cumulative series
      let cumulative = 0;
      const cumulativeSeries = timeSeries.map(({ date, count }) => {
        cumulative += count;
        return { date, cumulative };
      });

      // Peak hour heatmap (hour-of-day 0-23 vs day-of-week 0=Sun..6=Sat)
      const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
      for (const r of responses) {
        const dow = r.submittedAt.getUTCDay();
        const hour = r.submittedAt.getUTCHours();
        const row = heatmap[dow]!;
        row[hour] = (row[hour] ?? 0) + 1;
      }

      return res.json({
        success: true,
        trends: {
          granularity,
          timeSeries,
          cumulativeSeries,
          peakHourHeatmap: heatmap,
        },
      });
    } catch (err) {
      console.error('[analytics.trends]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ALL QUESTIONS SUMMARY (convenience endpoint for dashboard overview page)
  // GET /api/civic-partner/analytics/:surveyId/questions-summary
  // ─────────────────────────────────────────────────────────────────────────
  router.get('/:surveyId/questions-summary', async (req, res: any) => {
    const { id: civicPartnerId } = getCivicPartner(req);
    const { surveyId } = req.params;

    const survey = await getSurveyOrFail(surveyId, civicPartnerId, res);
    if (!survey) return;

    try {
      const questions = await prisma.surveyQuestion.findMany({
        where: { surveyId },
        orderBy: { order: 'asc' },
        include: {
          answers: true,
        },
      });

      const summaries = questions.map((q) => {
        const total = q.answers.length;
        return {
          questionId: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          order: q.order,
          totalAnswers: total,
          responseRate: 0, // will be enriched below
        };
      });

      // Calculate response rate against total survey responses
      const totalResponses = await prisma.surveyResponse.count({ where: { surveyId } });
      for (const s of summaries) {
        s.responseRate =
          totalResponses > 0 ? Math.round((s.totalAnswers / totalResponses) * 100) : 0;
      }

      return res.json({ success: true, surveyId, questions: summaries });
    } catch (err) {
      console.error('[analytics.questionsSummary]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EXPORT
  // GET /api/civic-partner/analytics/:surveyId/export?format=json|csv
  // ─────────────────────────────────────────────────────────────────────────
  router.get('/:surveyId/export', async (req, res: any) => {
    const { id: civicPartnerId } = getCivicPartner(req);
    const { surveyId } = req.params;
    const format = (req.query.format as string) ?? 'json';

    const survey = await getSurveyOrFail(surveyId, civicPartnerId, res);
    if (!survey) return;

    try {
      const responses = await prisma.surveyResponse.findMany({
        where: { surveyId },
        include: {
          answers: {
            include: { question: { select: { questionText: true, questionType: true, order: true } } },
          },
        },
        orderBy: { submittedAt: 'asc' },
      });

      if (format === 'csv') {
        // Build flat CSV rows
        const questions = await prisma.surveyQuestion.findMany({
          where: { surveyId },
          orderBy: { order: 'asc' },
        });

        const headers = [
          'responseId',
          'userId',
          'submittedAt',
          'isComplete',
          ...questions.map((q) => `Q${q.order + 1}: ${q.questionText.replace(/,/g, ';')}`),
        ];

        const rows = responses.map((r) => {
          const answerMap: Record<string, string> = {};
          for (const a of r.answers) {
            const value =
              a.answerText ??
              (a.selectedOpts.length ? a.selectedOpts.join('|') : null) ??
              a.ratingValue?.toString() ??
              '';
            answerMap[a.questionId] = value;
          }

          return [
            r.id,
            r.userId ?? 'anonymous',
            r.submittedAt.toISOString(),
            r.isComplete.toString(),
            ...questions.map((q) => (answerMap[q.id] ?? '').replace(/,/g, ';')),
          ].join(',');
        });

        const csv = [headers.join(','), ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="survey_${surveyId}.csv"`);
        return res.send(csv);
      }

      // Default JSON
      return res.json({ success: true, surveyId, totalResponses: responses.length, responses });
    } catch (err) {
      console.error('[analytics.export]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  return router;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the','a','an','is','it','in','on','at','of','and','or','but','to','for',
  'with','this','that','was','be','are','were','have','has','had','not','do',
  'i','my','we','you','he','she','they','what','how','why','when','where',
]);

function computeWordFrequency(texts: string[]): { word: string; count: number }[] {
  const freq: Record<string, number> = {};
  for (const text of texts) {
    const words = text.toLowerCase().match(/\b[a-z]{2,}\b/g) ?? [];
    for (const word of words) {
      if (!STOP_WORDS.has(word)) {
        freq[word] = (freq[word] ?? 0) + 1;
      }
    }
  }
  return Object.entries(freq)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
}

/** Returns an ISO-week key like "2026-W14" */
function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
