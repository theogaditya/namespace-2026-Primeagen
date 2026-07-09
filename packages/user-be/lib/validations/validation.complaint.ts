import * as zod from 'zod';
const z = (zod as any).z ?? zod;

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

export const qualityBreakdownSchema = z.object({
  clarity: z.number().int().min(0).max(25),
  evidence: z.number().int().min(0).max(25),
  location: z.number().int().min(0).max(25),
  completeness: z.number().int().min(0).max(25),
});

export const abuseMetadataSchema = z.object({}).passthrough();

export const createComplaintSchema = z.object({
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
});
