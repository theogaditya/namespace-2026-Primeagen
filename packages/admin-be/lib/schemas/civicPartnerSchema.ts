import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const civicPartnerTypeEnum = z.enum(['NGO', 'GOVERNMENT_BODY']);
export const surveyStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']);
export const questionTypeEnum = z.enum(['TEXT', 'MCQ', 'CHECKBOX', 'RATING', 'YES_NO']);
export const surveySourceTypeEnum = z.enum(['NGO', 'SURVEY']);

// ─── CivicPartner Auth ────────────────────────────────────────────────────────

export const registerCivicPartnerSchema = z.object({
  orgName: z.string().min(2, 'Organisation name is required'),
  officialEmail: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phoneNumber: z.string().optional(),
  orgType: civicPartnerTypeEnum,
  registrationNo: z.string().min(3, 'Registration number is required'),
  state: z.string().min(2, 'State is required'),
  district: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
});

export const loginCivicPartnerSchema = z.object({
  officialEmail: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterCivicPartnerInput = z.infer<typeof registerCivicPartnerSchema>;
export type LoginCivicPartnerInput = z.infer<typeof loginCivicPartnerSchema>;

// ─── Survey ───────────────────────────────────────────────────────────────────

export const surveyQuestionSchema = z.object({
  questionText: z.string().min(3, 'Question text is required'),
  questionType: questionTypeEnum,
  options: z.array(z.string()).default([]),   // required for MCQ / CHECKBOX
  isRequired: z.boolean().default(true),
  order: z.number().int().min(0),
});

export const createSurveySchema = z.object({
  title: z.string().min(3, 'Title is required').max(200),
  description: z.string().min(10, 'Description is required'),
  sourceType: surveySourceTypeEnum.default('SURVEY'),
  category: z.string().min(2, 'Category is required'),
  content: z.string().min(10, 'Content is required'),
  sourceUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  questions: z.array(surveyQuestionSchema).min(1, 'At least one question is required'),
});

export const updateSurveySchema = createSurveySchema.partial().omit({ questions: true }).extend({
  questions: z.array(surveyQuestionSchema).optional(),
});

export type CreateSurveyInput = z.infer<typeof createSurveySchema>;
export type UpdateSurveyInput = z.infer<typeof updateSurveySchema>;

// ─── Survey Response (submitted by users via user-fe) ─────────────────────────

export const surveyAnswerSchema = z.object({
  questionId: z.string().uuid(),
  answerText: z.string().optional(),
  selectedOpts: z.array(z.string()).default([]),
  ratingValue: z.number().int().min(1).max(10).optional(),
});

export const submitSurveyResponseSchema = z.object({
  userId: z.string().uuid().optional(),   // null = anonymous
  startedAt: z.string().datetime().optional(),
  answers: z.array(surveyAnswerSchema).min(1),
});

export type SubmitSurveyResponseInput = z.infer<typeof submitSurveyResponseSchema>;
