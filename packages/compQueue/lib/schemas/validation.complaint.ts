import { z } from 'zod';

export const complaintUrgencyEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const departmentEnum = z.enum([
  'INFRASTRUCTURE',
  'EDUCATION',
  'REVENUE',
  'HEALTH',
  'WATER_SUPPLY_SANITATION',
  'ELECTRICITY_POWER',
  'TRANSPORTATION',
  'MUNICIPAL_SERVICES',
  'POLICE_SERVICES',
  'ENVIRONMENT',
  'HOUSING_URBAN_DEVELOPMENT',
  'SOCIAL_WELFARE',
  'PUBLIC_GRIEVANCES',
]);

export const complaintLocationSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'PIN must be 6 digits'),
  district: z.string().min(1, 'District is required'),
  city: z.string().min(1, 'City is required'),
  locality: z.string().min(1, 'Locality is required'),
  street: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const createComplaintSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  subCategory: z.string().min(1, 'Sub-category is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  urgency: complaintUrgencyEnum.optional().default('LOW'),
  attachmentUrl: z.string().url('Invalid attachment URL').optional(),
  assignedDepartment: departmentEnum,
  isPublic: z.boolean(),
  location: complaintLocationSchema,
});
