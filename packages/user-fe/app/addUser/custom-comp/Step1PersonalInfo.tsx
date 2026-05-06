"use client";

import React, { useCallback, useEffect } from "react";
import { FormInput } from "./FormInput";
import { step1Schema } from "./validation";
import { FormField } from "./useSignupForm";
import { z } from "zod";
import { User, Mail, Phone, Calendar } from "lucide-react";

interface Step1Props {
  formData: {
    name: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string;
  };
  touched: { [key: string]: boolean };
  errors: { [key: string]: string | undefined };
  updateField: (field: FormField, value: string) => void;
  setFieldTouched: (field: string) => void;
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string | undefined }>>;
}

// Individual field schemas for real-time validation
const nameSchema = z.object({ name: z.string().min(2, 'Name must be at least 2 characters') });
const emailSchema = z.object({ email: z.string().email('Invalid email address') });
const phoneSchema = z.object({ phoneNumber: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number (e.g., +919876543210)') });
const dobSchema = z.object({
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

export function Step1PersonalInfo({
  formData,
  touched,
  errors,
  updateField,
  setFieldTouched,
  setErrors,
}: Step1Props) {
  const validateField = useCallback((field: string, value: string, schema: z.ZodType) => {
    try {
      schema.parse({ [field]: value });
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        const zodError = e as z.ZodError;
        const fieldError = zodError.issues.find((err) => err.path.includes(field));
        setErrors((prev) => ({
          ...prev,
          [field]: fieldError?.message || "Invalid value",
        }));
      }
      return false;
    }
  }, [setErrors]);

  const handleChange = (field: FormField, value: string, schema: z.ZodType) => {
    updateField(field, value);
    if (touched[field]) {
      validateField(field, value, schema);
    }
  };

  const handleBlur = (field: FormField, value: string, schema: z.ZodType) => {
    setFieldTouched(field);
    validateField(field, value, schema);
  };

  // Calculate max date (18 years ago)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
        <p className="text-gray-500 mt-2">Let's start with your basic details</p>
      </div>

      <div className="space-y-5">
        <FormInput
          label="Full Name"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value, nameSchema)}
          onBlur={() => handleBlur("name", formData.name, nameSchema)}
          error={errors.name}
          isValid={!!formData.name && !errors.name}
          touched={touched.name}
          placeholder="Enter your full name"
          required
          icon={<User className="h-4 w-4" />}
        />

        <FormInput
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value, emailSchema)}
          onBlur={() => handleBlur("email", formData.email, emailSchema)}
          error={errors.email}
          isValid={!!formData.email && !errors.email}
          touched={touched.email}
          placeholder="your.email@example.com"
          required
          icon={<Mail className="h-4 w-4" />}
        />

        <FormInput
          label="Phone Number"
          type="tel"
          value={formData.phoneNumber}
          onChange={(e) => handleChange("phoneNumber", e.target.value, phoneSchema)}
          onBlur={() => handleBlur("phoneNumber", formData.phoneNumber, phoneSchema)}
          error={errors.phoneNumber}
          isValid={!!formData.phoneNumber && !errors.phoneNumber}
          touched={touched.phoneNumber}
          placeholder="+919876543210"
          helpText="Include country code (e.g., +91)"
          required
          icon={<Phone className="h-4 w-4" />}
        />

        <FormInput
          label="Date of Birth"
          type="date"
          value={formData.dateOfBirth}
          onChange={(e) => handleChange("dateOfBirth", e.target.value, dobSchema)}
          onBlur={() => handleBlur("dateOfBirth", formData.dateOfBirth, dobSchema)}
          error={errors.dateOfBirth}
          isValid={!!formData.dateOfBirth && !errors.dateOfBirth}
          touched={touched.dateOfBirth}
          max={maxDateStr}
          required
          icon={<Calendar className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}
