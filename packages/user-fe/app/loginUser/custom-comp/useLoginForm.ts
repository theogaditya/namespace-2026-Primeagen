"use client";

import { useState, useCallback } from "react";
import { z } from "zod";
import { loginSchema } from "./validation";

export interface LoginFormState {
  email: string;
  password: string;
}

interface TouchedState {
  [key: string]: boolean;
}

interface ErrorState {
  [key: string]: string | undefined;
}

const initialFormState: LoginFormState = {
  email: "",
  password: "",
};

export function useLoginForm() {
  const [formData, setFormData] = useState<LoginFormState>(initialFormState);
  const [touched, setTouched] = useState<TouchedState>({});
  const [errors, setErrors] = useState<ErrorState>({});

  const updateField = useCallback((field: keyof LoginFormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setFieldTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const validateForm = useCallback(() => {
    try {
      loginSchema.parse(formData);
      setErrors({});
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        const newErrors: ErrorState = {};
        e.issues.forEach((err) => {
          const field = err.path[0] as string;
          newErrors[field] = err.message;
        });
        setErrors(newErrors);
        // Mark all fields as touched
        const newTouched: TouchedState = {};
        Object.keys(formData).forEach((key) => {
          newTouched[key] = true;
        });
        setTouched((prev) => ({ ...prev, ...newTouched }));
      }
      return false;
    }
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData(initialFormState);
    setTouched({});
    setErrors({});
  }, []);

  const isFieldValid = useCallback(
    (field: string) => {
      return touched[field] && !errors[field] && formData[field as keyof LoginFormState];
    },
    [touched, errors, formData]
  );

  return {
    formData,
    touched,
    errors,
    updateField,
    setFieldTouched,
    validateForm,
    resetForm,
    isFieldValid,
    setErrors,
  };
}
