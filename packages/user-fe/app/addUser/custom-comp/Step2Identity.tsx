"use client";

import React, { useCallback } from "react";
import { FormInput } from "./FormInput";
import { FormSelect } from "./FormSelect";
import { FormField } from "./useSignupForm";
import { z } from "zod";
import { CreditCard, Languages, Heart } from "lucide-react";

interface Step2Props {
  formData: {
    aadhaarId: string;
    preferredLanguage: string;
    disability: string;
  };
  touched: { [key: string]: boolean };
  errors: { [key: string]: string | undefined };
  updateField: (field: FormField, value: string) => void;
  setFieldTouched: (field: string) => void;
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string | undefined }>>;
}

// Individual field schemas for real-time validation
const aadhaarSchema = z.object({ aadhaarId: z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits') });
const languageSchema = z.object({ preferredLanguage: z.string().min(2, 'Preferred language is required') });

const languageOptions = [
  { value: "English", label: "English" },
  { value: "Hindi", label: "Hindi (हिंदी)" },
  { value: "Bengali", label: "Bengali (বাংলা)" },
  { value: "Telugu", label: "Telugu (తెలుగు)" },
  { value: "Marathi", label: "Marathi (मराठी)" },
  { value: "Tamil", label: "Tamil (தமிழ்)" },
  { value: "Gujarati", label: "Gujarati (ગુજરાતી)" },
  { value: "Urdu", label: "Urdu (اردو)" },
  { value: "Kannada", label: "Kannada (ಕನ್ನಡ)" },
  { value: "Odia", label: "Odia (ଓଡ଼ିଆ)" },
  { value: "Malayalam", label: "Malayalam (മലയാളം)" },
  { value: "Punjabi", label: "Punjabi (ਪੰਜਾਬੀ)" },
];

const disabilityOptions = [
  { value: "None", label: "None" },
  { value: "Visual Impairment", label: "Visual Impairment" },
  { value: "Hearing Impairment", label: "Hearing Impairment" },
  { value: "Physical Disability", label: "Physical Disability" },
  { value: "Cognitive Disability", label: "Cognitive Disability" },
  { value: "Multiple Disabilities", label: "Multiple Disabilities" },
  { value: "Other", label: "Other" },
];

export function Step2Identity({
  formData,
  touched,
  errors,
  updateField,
  setFieldTouched,
  setErrors,
}: Step2Props) {
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

  const handleChange = (field: FormField, value: string, schema?: z.ZodType) => {
    updateField(field, value);
    if (touched[field] && schema) {
      validateField(field, value, schema);
    }
  };

  const handleBlur = (field: FormField, value: string, schema?: z.ZodType) => {
    setFieldTouched(field);
    if (schema) {
      validateField(field, value, schema);
    }
  };

  // Format Aadhaar input (add spaces every 4 digits for display)
  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 12);
    handleChange("aadhaarId", value, aadhaarSchema);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Identity & Preferences</h2>
        <p className="text-gray-500 mt-2">Your identity verification and preferences</p>
      </div>

      <div className="space-y-5">
        <FormInput
          label="Aadhaar Number"
          value={formData.aadhaarId}
          onChange={handleAadhaarChange}
          onBlur={() => handleBlur("aadhaarId", formData.aadhaarId, aadhaarSchema)}
          error={errors.aadhaarId}
          isValid={!!formData.aadhaarId && formData.aadhaarId.length === 12 && !errors.aadhaarId}
          touched={touched.aadhaarId}
          placeholder="Enter 12-digit Aadhaar number"
          helpText="Your 12-digit unique identification number"
          required
          maxLength={12}
          icon={<CreditCard className="h-4 w-4" />}
        />

        <FormSelect
          label="Preferred Language"
          value={formData.preferredLanguage}
          onChange={(e) => handleChange("preferredLanguage", e.target.value, languageSchema)}
          onBlur={() => handleBlur("preferredLanguage", formData.preferredLanguage, languageSchema)}
          options={languageOptions}
          error={errors.preferredLanguage}
          isValid={!!formData.preferredLanguage && !errors.preferredLanguage}
          touched={touched.preferredLanguage}
          placeholder="Select your preferred language"
          required
        />

        <FormSelect
          label="Disability Status"
          value={formData.disability}
          onChange={(e) => handleChange("disability", e.target.value)}
          onBlur={() => handleBlur("disability", formData.disability)}
          options={disabilityOptions}
          isValid={true}
          touched={touched.disability}
          placeholder="Select disability status (if any)"
          helpText="Optional - helps us provide better accessibility"
        />
      </div>
    </div>
  );
}
