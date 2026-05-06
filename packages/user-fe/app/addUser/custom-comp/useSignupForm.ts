"use client";

import { useState, useEffect, useCallback } from "react";
import { z } from "zod";

const STORAGE_KEY = "signupFormData";

export interface FormState {
  // Step 1 - Personal Information
  name: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  // Step 2 - Identity & Preferences
  aadhaarId: string;
  preferredLanguage: string;
  disability: string;
  // Step 3 - Location
  pin: string;
  district: string;
  city: string;
  state: string;
  locality: string;
  street: string;
  municipal: string;
  // Step 4 - Password
  password: string;
  confirmPassword: string;
}

export type FormField = keyof FormState;

interface TouchedState {
  [key: string]: boolean;
}

interface ErrorState {
  [key: string]: string | undefined;
}

const initialFormState: FormState = {
  name: "",
  email: "",
  phoneNumber: "",
  dateOfBirth: "",
  aadhaarId: "",
  preferredLanguage: "",
  disability: "",
  pin: "",
  district: "",
  city: "",
  state: "",
  locality: "",
  street: "",
  municipal: "",
  password: "",
  confirmPassword: "",
};

export function useSignupForm() {
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [touched, setTouched] = useState<TouchedState>({});
  const [errors, setErrors] = useState<ErrorState>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setFormData(parsed.formData || initialFormState);
          setCurrentStep(parsed.currentStep || 1);
          setTouched(parsed.touched || {});
        }
      } catch (e) {
        console.error("Error loading form data:", e);
      }
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage when form data changes
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      try {
        // Don't save passwords to localStorage for security
        const dataToSave = {
          formData: { ...formData, password: "", confirmPassword: "" },
          currentStep,
          touched,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (e) {
        console.error("Error saving form data:", e);
      }
    }
  }, [formData, currentStep, touched, isLoaded]);

  const updateField = useCallback((field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setFieldTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const validateField = useCallback(
    (field: string, value: string, schema: z.ZodType) => {
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
    },
    []
  );

  const validateStep = useCallback(
    (step: number, schema: z.ZodType, data: Record<string, unknown>) => {
      try {
        schema.parse(data);
        // Clear errors for all fields in this step
        const newErrors = { ...errors };
        Object.keys(data).forEach((key) => {
          delete newErrors[key];
        });
        setErrors(newErrors);
        return true;
      } catch (e) {
        if (e instanceof z.ZodError) {
          const zodError = e as z.ZodError;
          const newErrors: ErrorState = {};
          zodError.issues.forEach((err) => {
            const field = err.path[0] as string;
            newErrors[field] = err.message;
          });
          setErrors((prev) => ({ ...prev, ...newErrors }));
          // Mark all fields as touched
          const newTouched: TouchedState = {};
          Object.keys(data).forEach((key) => {
            newTouched[key] = true;
          });
          setTouched((prev) => ({ ...prev, ...newTouched }));
        }
        return false;
      }
    },
    [errors]
  );

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormState);
    setTouched({});
    setErrors({});
    setCurrentStep(1);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const isFieldValid = useCallback(
    (field: string) => {
      return touched[field] && !errors[field] && formData[field as keyof FormState];
    },
    [touched, errors, formData]
  );

  return {
    formData,
    touched,
    errors,
    currentStep,
    isLoaded,
    updateField,
    setFieldTouched,
    validateField,
    validateStep,
    goToStep,
    nextStep,
    prevStep,
    resetForm,
    isFieldValid,
    setErrors,
  };
}
