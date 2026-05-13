import { z } from 'zod';
import { complaintUrgencyEnum, departmentEnum, complaintLocationSchema } from './validation.complaint';

export const complaintProcessingSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  subCategory: z.string().min(1, 'Sub-category is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  urgency: complaintUrgencyEnum.optional().default('LOW'),
  attachmentUrl: z.string().url('Invalid attachment URL').optional(),
  assignedDepartment: departmentEnum,
  isPublic: z.boolean(),
  location: complaintLocationSchema,
  submissionDate: z.string().datetime().optional(),
});

export type ComplaintProcessing = z.infer<typeof complaintProcessingSchema>;
