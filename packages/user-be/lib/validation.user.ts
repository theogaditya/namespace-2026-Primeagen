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
  phoneNumber: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  dateOfBirth: z.string().refine((date) => {
    const dob = new Date(date);
    const age = new Date().getFullYear() - dob.getFullYear();
    return age >= 18 && age <= 120;
  }, 'Must be 18 years or older'),
  aadhaarId: z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits'),
  preferredLanguage: z.string().min(2, 'Preferred language is required'),
  disability: z.string().optional(),
  location: userLocationSchema,
});

export const userLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});