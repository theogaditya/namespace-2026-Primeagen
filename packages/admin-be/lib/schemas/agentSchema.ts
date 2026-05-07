import { z } from 'zod';

const DepartmentEnum = z.enum([
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

export const agentSchema = z.object({
  email: z.string().email(),
  fullName: z.string(),
  password: z.string().min(6),
  phoneNumber: z.string(),
  officialEmail: z.string().email(),
  department: DepartmentEnum,
  municipality: z.string(),
  accessLevel: z.literal('AGENT'),
});

export const loginSchema = z.object({
  officialEmail: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});