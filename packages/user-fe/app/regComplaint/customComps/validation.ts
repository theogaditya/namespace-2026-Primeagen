import { z } from "zod";
import { countWords } from "./types";

// Constants for validation
export const MAX_SUBCATEGORY_WORDS = 30;
export const MAX_DESCRIPTION_WORDS = 150;
export const MAX_PHOTO_SIZE_MB = 20;
export const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;

// Custom word count validator
const wordCountValidator = (maxWords: number, fieldName: string) =>
  z.string().refine(
    (val) => countWords(val) <= maxWords,
    { message: `${fieldName} must be ${maxWords} words or less` }
  );

// Step 1 - Category Selection
export const step1Schema = z.object({
  categoryId: z.string().min(1, "Please select a category"),
  categoryName: z.string().min(1, "Category is required"),
  assignedDepartment: z.string().min(1, "Department is required"),
});

// Step 2 - Complaint Details
export const step2Schema = z.object({
  subCategory: z
    .string()
    .min(3, "Sub-category must be at least 3 characters")
    .refine(
      (val) => countWords(val) <= MAX_SUBCATEGORY_WORDS,
      { message: `Sub-category must be ${MAX_SUBCATEGORY_WORDS} words or less (currently ${MAX_SUBCATEGORY_WORDS} max)` }
    ),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .refine(
      (val) => countWords(val) <= MAX_DESCRIPTION_WORDS,
      { message: `Description must be ${MAX_DESCRIPTION_WORDS} words or less` }
    ),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  isPublic: z.boolean(),
});

// Step 3 - Location
export const step3Schema = z.object({
  district: z.string().min(1, "District is required"),
  pin: z.string().regex(/^\d{6}$/, "PIN must be 6 digits"),
  city: z.string().min(1, "City is required"),
  locality: z.string().min(1, "Locality is required"),
  street: z.string().optional(),
  latitude: z
    .string()
    .optional()
    .refine(
      (val) => !val || (parseFloat(val) >= -90 && parseFloat(val) <= 90),
      { message: "Latitude must be between -90 and 90" }
    ),
  longitude: z
    .string()
    .optional()
    .refine(
      (val) => !val || (parseFloat(val) >= -180 && parseFloat(val) <= 180),
      { message: "Longitude must be between -180 and 180" }
    ),
});

// Full complaint schema for final submission
export const complaintSchema = z.object({
  categoryId: z.string().min(1, "Invalid category ID"),
  subCategory: z
    .string()
    .min(3, "Sub-category is required")
    .refine((val) => countWords(val) <= MAX_SUBCATEGORY_WORDS, {
      message: `Sub-category must be ${MAX_SUBCATEGORY_WORDS} words or less`,
    }),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .refine((val) => countWords(val) <= MAX_DESCRIPTION_WORDS, {
      message: `Description must be ${MAX_DESCRIPTION_WORDS} words or less`,
    }),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("LOW"),
  assignedDepartment: z.string().min(1, "Department is required"),
  isPublic: z.boolean(),
  location: z.object({
    pin: z.string().regex(/^\d{6}$/, "PIN must be 6 digits"),
    district: z.string().min(1, "District is required"),
    city: z.string().min(1, "City is required"),
    locality: z.string().min(1, "Locality is required"),
    street: z.string().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  }),
});

// Type exports
export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type ComplaintData = z.infer<typeof complaintSchema>;
