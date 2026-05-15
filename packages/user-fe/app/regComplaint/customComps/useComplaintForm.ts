"use client";

import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { ComplaintFormState, ComplaintFormField, ComplaintUrgency, Department } from "./types";

const STORAGE_KEY = "complaintFormData";

const initialFormState: ComplaintFormState = {
  // Step 1
  categoryId: "",
  categoryName: "",
  assignedDepartment: "",
  // Step 2
  subCategory: "",
  description: "",
  urgency: "LOW",
  isPublic: false,
  photo: null,
  photoPreview: "",
  // Step 3
  district: "",
  pin: "",
  city: "",
  locality: "",
  street: "",
  latitude: "",
  longitude: "",
};

interface TouchedState {
  [key: string]: boolean;
}

interface ErrorState {
  [key: string]: string | undefined;
}

export function useComplaintForm() {
  const [formData, setFormData] = useState<ComplaintFormState>(initialFormState);
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
          // Don't restore file, just the form data
          setFormData({
            ...initialFormState,
            ...parsed.formData,
            photo: null,
            photoPreview: "",
          });
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
        // Don't save file to localStorage
        const dataToSave = {
          formData: {
            ...formData,
            photo: null,
            photoPreview: "",
          },
          currentStep,
          touched,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (e) {
        console.error("Error saving form data:", e);
      }
    }
  }, [formData, currentStep, touched, isLoaded]);

  const updateField = useCallback(<K extends ComplaintFormField>(
    field: K,
    value: ComplaintFormState[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setFieldTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const validateField = useCallback(
    (field: string, value: unknown, schema: z.ZodType): boolean => {
      try {
        schema.parse({ [field]: value });
        setErrors((prev) => ({ ...prev, [field]: undefined }));
        return true;
      } catch (e) {
        if (e instanceof z.ZodError) {
          const fieldError = e.issues.find((err) => err.path.includes(field));
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
    (step: number, schema: z.ZodType, data: Record<string, unknown>): boolean => {
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
          const newErrors: ErrorState = {};
          e.issues.forEach((err) => {
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
    (field: string): boolean => {
      return touched[field] && !errors[field] && !!formData[field as ComplaintFormField];
    },
    [touched, errors, formData]
  );

  // Helper to set photo with preview
  const setPhoto = useCallback((file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData((prev) => ({
          ...prev,
          photo: file,
          photoPreview: e.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setFormData((prev) => ({
        ...prev,
        photo: null,
        photoPreview: "",
      }));
    }
  }, []);

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
    setPhoto,
  };
}

export type { ComplaintFormState, ComplaintFormField };
