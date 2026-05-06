import { z } from 'zod';

export const userLocationSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'PIN must be 6 digits'),
  district: z.string().min(1, 'District is required'),
  city: z.string().min(1, 'City is required'),
  locality: z.string().min(1, 'Locality is required'),
  street: z.string().optional(),
  municipal: z.string().min(1, 'Municipal is required'),
  state: z.string().min(1, 'State is required'),
});

export const userSignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number (e.g., +919876543210)'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  dateOfBirth: z.string().refine((date) => {
    const dob = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    const dayDiff = today.getDate() - dob.getDate();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
    return actualAge >= 18 && actualAge <= 120;
  }, 'Must be 18 years or older'),
  aadhaarId: z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits'),
  preferredLanguage: z.string().min(2, 'Preferred language is required'),
  disability: z.string().optional(),
  location: userLocationSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Schema for step 1 - Personal Information
export const step1Schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number (e.g., +919876543210)'),
  dateOfBirth: z.string().refine((date) => {
    if (!date) return false;
    const dob = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    const dayDiff = today.getDate() - dob.getDate();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
    return actualAge >= 18 && actualAge <= 120;
  }, 'Must be 18 years or older'),
});

// Schema for step 2 - Identity & Preferences
export const step2Schema = z.object({
  aadhaarId: z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits'),
  preferredLanguage: z.string().min(2, 'Preferred language is required'),
  disability: z.string().optional(),
});

// Schema for step 3 - Location
export const step3Schema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'PIN must be 6 digits'),
  district: z.string().min(1, 'District is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  locality: z.string().min(1, 'Locality is required'),
  street: z.string().optional(),
  municipal: z.string().min(1, 'Municipal is required'),
});

// Schema for step 4 - Password
export const step4Schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type UserSignupData = z.infer<typeof userSignupSchema>;
export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type Step4Data = z.infer<typeof step4Schema>;
