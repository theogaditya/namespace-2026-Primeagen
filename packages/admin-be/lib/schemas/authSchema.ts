import { z } from 'zod';

// Admin types for the login dropdown
export const adminTypeEnum = z.enum([
  'SUPER_ADMIN',
  'STATE_ADMIN',
  'MUNICIPAL_ADMIN',
  'AGENT'
]);

export type AdminType = z.infer<typeof adminTypeEnum>;

// Unified login schema for all admin types
export const unifiedLoginSchema = z.object({
  officialEmail: z
    .string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long'),
  adminType: adminTypeEnum
});

export type UnifiedLoginInput = z.infer<typeof unifiedLoginSchema>;

// Login response type
export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  adminType?: AdminType;
  admin?: {
    id: string;
    officialEmail: string;
    fullName?: string;
    accessLevel?: string;
    department?: string;
  };
}

// Token verification response type
export interface VerifyTokenResponse {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    email: string;
    adminType: AdminType;
    accessLevel?: string;
  };
}
