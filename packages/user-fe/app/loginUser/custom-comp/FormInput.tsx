"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  isValid?: boolean;
  touched?: boolean;
  helpText?: string;
  icon?: React.ReactNode;
}

export function FormInput({
  label,
  error,
  isValid,
  touched,
  helpText,
  icon,
  className,
  id,
  ...props
}: FormInputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");
  const showError = touched && error;
  const showSuccess = touched && isValid && !error;

  return (
    <div className="space-y-2">
      <Label
        htmlFor={inputId}
        className={cn(
          "text-sm font-medium transition-colors",
          showError && "text-red-600",
          showSuccess && "text-green-600"
        )}
      >
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <Input
          id={inputId}
          className={cn(
            "transition-all duration-200",
            icon && "pl-10",
            showError && "border-red-500 focus-visible:ring-red-500/20 focus-visible:border-red-500",
            showSuccess && "border-green-500 focus-visible:ring-green-500/20 focus-visible:border-green-500",
            className
          )}
          aria-invalid={showError ? "true" : "false"}
          {...props}
        />
        {touched && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {showError && <XCircle className="h-5 w-5 text-red-500" />}
            {showSuccess && <CheckCircle className="h-5 w-5 text-green-500" />}
          </div>
        )}
      </div>
      {showError && (
        <p className="text-sm text-red-600 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
      {helpText && !showError && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
}
