"use client";

import React, { useCallback, useState } from "react";
import { FormInput } from "./FormInput";
import { FormField } from "./useSignupForm";
import { z } from "zod";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step4Props {
  formData: {
    password: string;
    confirmPassword: string;
  };
  touched: { [key: string]: boolean };
  errors: { [key: string]: string | undefined };
  updateField: (field: FormField, value: string) => void;
  setFieldTouched: (field: string) => void;
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string | undefined }>>;
}

// Password strength check
const passwordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 25, label: "Weak", color: "bg-red-500" };
  if (score <= 3) return { score: 50, label: "Fair", color: "bg-orange-500" };
  if (score <= 4) return { score: 75, label: "Good", color: "bg-yellow-500" };
  return { score: 100, label: "Strong", color: "bg-green-500" };
};

export function Step4Password({
  formData,
  touched,
  errors,
  updateField,
  setFieldTouched,
  setErrors,
}: Step4Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const strength = passwordStrength(formData.password);

  const validatePassword = useCallback((value: string) => {
    if (value.length < 8) {
      setErrors((prev) => ({
        ...prev,
        password: "Password must be at least 8 characters",
      }));
      return false;
    }
    setErrors((prev) => ({ ...prev, password: undefined }));
    return true;
  }, [setErrors]);

  const validateConfirmPassword = useCallback((value: string, password: string) => {
    if (!value) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "Please confirm your password",
      }));
      return false;
    }
    if (value !== password) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "Passwords don't match",
      }));
      return false;
    }
    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    return true;
  }, [setErrors]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updateField("password", value);
    if (touched.password) {
      validatePassword(value);
    }
    // Also validate confirm password if it's already filled
    if (formData.confirmPassword && touched.confirmPassword) {
      validateConfirmPassword(formData.confirmPassword, value);
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updateField("confirmPassword", value);
    if (touched.confirmPassword) {
      validateConfirmPassword(value, formData.password);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Create Password</h2>
        <p className="text-gray-500 mt-2">Secure your account with a strong password</p>
      </div>

      <div className="space-y-5">
        {/* Password field */}
        <div className="space-y-2">
          <div className="relative">
            <FormInput
              label="Password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handlePasswordChange}
              onBlur={() => {
                setFieldTouched("password");
                validatePassword(formData.password);
              }}
              error={errors.password}
              isValid={formData.password.length >= 8 && !errors.password}
              touched={touched.password}
              placeholder="Create a strong password"
              required
              icon={<Lock className="h-4 w-4" />}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-10 top-[38px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {/* Password strength indicator */}
          {formData.password && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full transition-all duration-300", strength.color)}
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  strength.score <= 25 && "text-red-500",
                  strength.score === 50 && "text-orange-500",
                  strength.score === 75 && "text-yellow-600",
                  strength.score === 100 && "text-green-500"
                )}>
                  {strength.label}
                </span>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p className="flex items-center gap-1">
                  <ShieldCheck className={cn("h-3 w-3", formData.password.length >= 8 ? "text-green-500" : "text-gray-300")} />
                  At least 8 characters
                </p>
                <p className="flex items-center gap-1">
                  <ShieldCheck className={cn("h-3 w-3", /[A-Z]/.test(formData.password) ? "text-green-500" : "text-gray-300")} />
                  One uppercase letter
                </p>
                <p className="flex items-center gap-1">
                  <ShieldCheck className={cn("h-3 w-3", /[0-9]/.test(formData.password) ? "text-green-500" : "text-gray-300")} />
                  One number
                </p>
                <p className="flex items-center gap-1">
                  <ShieldCheck className={cn("h-3 w-3", /[^a-zA-Z0-9]/.test(formData.password) ? "text-green-500" : "text-gray-300")} />
                  One special character
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password field */}
        <div className="relative">
          <FormInput
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={handleConfirmPasswordChange}
            onBlur={() => {
              setFieldTouched("confirmPassword");
              validateConfirmPassword(formData.confirmPassword, formData.password);
            }}
            error={errors.confirmPassword}
            isValid={
              !!formData.confirmPassword &&
              formData.confirmPassword === formData.password &&
              !errors.confirmPassword
            }
            touched={touched.confirmPassword}
            placeholder="Re-enter your password"
            required
            icon={<Lock className="h-4 w-4" />}
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-10 top-[38px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
