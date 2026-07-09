import { z } from 'zod';
import {
  complaintUrgencyEnum,
  departmentEnum,
  complaintLocationSchema,
  qualityBreakdownSchema,
  abuseMetadataSchema,
} from './validation.complaint';

export const complaintProcessingSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  categoryId: z.string().uuid('Invalid category ID'),
  subCategory: z.string().min(1, 'Sub-category is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  urgency: complaintUrgencyEnum.optional().default('LOW'),
  attachmentUrl: z.string().url('Invalid attachment URL').optional(),
  assignedDepartment: departmentEnum,
  isPublic: z.boolean(),
  location: complaintLocationSchema,
  isDuplicate: z.boolean().optional(),
  qualityScore: z.number().int().min(0).max(100).optional(),
  qualityBreakdown: qualityBreakdownSchema.optional(),
  hasSimilarComplaints: z.boolean().optional(),
  similarComplaintIds: z.array(z.string().uuid('Invalid similar complaint ID')).optional(),
  AIabusedFlag: z.boolean().optional(),
  abuseMetadata: abuseMetadataSchema.optional(),
  submissionDate: z.string().datetime().optional(),
});

export type ComplaintProcessing = z.infer<typeof complaintProcessingSchema>;
