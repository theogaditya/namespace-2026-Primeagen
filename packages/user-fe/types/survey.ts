/**
 * Survey Types
 *
 * Shared TypeScript types for survey-related data structures.
 */

export type QuestionType = "TEXT" | "MCQ" | "CHECKBOX" | "RATING" | "YES_NO";
export type SurveyStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
export type CivicPartnerType = "NGO" | "GOVERNMENT_BODY";

export interface SurveyQuestion {
  id: string;
  surveyId: string;
  questionText: string;
  questionType: QuestionType;
  options: string[];
  isRequired: boolean;
  order: number;
}

export interface CivicPartnerInfo {
  orgName: string;
  orgType: CivicPartnerType;
  website?: string | null;
}

export interface SurveyListItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: SurveyStatus;
  isPublic: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  civicPartner: CivicPartnerInfo;
  _count: {
    questions: number;
    responses: number;
  };
}

export interface SurveyDetail extends Omit<SurveyListItem, 'civicPartner'> {
  content: string;
  sourceUrl: string | null;
  questions: SurveyQuestion[];
  civicPartner: CivicPartnerInfo;
}

export interface AnswerPayload {
  questionId: string;
  answerText?: string;
  selectedOpts?: string[];
  ratingValue?: number;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  submittedAt: string;
  isComplete: boolean;
  survey: {
    id: string;
    title: string;
    category: string;
    endsAt: string | null;
  };
}

export interface SurveyListResponse {
  success: boolean;
  data: SurveyListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SurveyDetailResponse {
  success: boolean;
  data: SurveyDetail;
}

export interface MyResponseCheckResponse {
  success: boolean;
  hasResponded: boolean;
  responseId: string | null;
  submittedAt: string | null;
}

export interface SubmitResponseResult {
  success: boolean;
  message: string;
  data?: {
    responseId: string;
  };
  error?: string;
}
