"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertCircle, ChevronDown } from "lucide-react";

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
  isValid?: boolean;
  touched?: boolean;
  helpText?: string;
  placeholder?: string;
}

export function FormSelect({
  label,
  options,
  error,
  isValid,
  touched,
  helpText,
  placeholder = "Select an option",
  className,
  id,
  ...props
}: FormSelectProps) {
  const selectId = id || label.toLowerCase().replace(/\s+/g, "-");
  const showError = touched && error;
  const showSuccess = touched && isValid && !error;

  return (
    <div className="space-y-2">
      <Label
        htmlFor={selectId}
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
        <select
          id={selectId}
          className={cn(
            "h-9 w-full min-w-0 rounded-md border bg-white px-3 py-1 pr-10 text-base shadow-xs transition-all outline-none appearance-none cursor-pointer",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            showError && "border-red-500 focus-visible:ring-red-500/20 focus-visible:border-red-500",
            showSuccess && "border-green-500 focus-visible:ring-green-500/20 focus-visible:border-green-500",
            !showError && !showSuccess && "border-input",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            "md:text-sm",
            className
          )}
          aria-invalid={showError ? "true" : "false"}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
          {touched && showError && <XCircle className="h-5 w-5 text-red-500" />}
          {touched && showSuccess && <CheckCircle className="h-5 w-5 text-green-500" />}
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
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
