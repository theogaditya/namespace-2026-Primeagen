import { z } from 'zod';

export const superAdminLoginSchema = z.object({
  officialEmail: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export const createSuperAdminSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  officialEmail: z.string().email('Invalid email format'),
  phoneNumber: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const createStateAdminSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  officialEmail: z.string().email('Invalid email format'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  department: z.enum([
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
    'PUBLIC_GRIEVANCES'
  ] as const),
  state: z.string().min(2, 'State is required'),
  managedMunicipalities: z.array(z.string()).optional().default([]),
});

export const createMunicipalAdminSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  officialEmail: z.string().email('Invalid email format'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  department: z.string().min(2, 'Department is required'),
  municipality: z.string().min(2, 'Municipality is required'),
  managedByStateAdminId: z.string().uuid().optional(),
  managedBySuperMunicipalId: z.string().uuid().optional()
});

export const deleteAdminSchema = z.object({
  adminId: z.string().uuid('Invalid admin ID format')
});

export const updateSuperAdminSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phoneNumber: z.string().optional(),
  municipality: z.string().min(2, 'Municipality is required').optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password is required')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});