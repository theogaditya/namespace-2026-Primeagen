"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  id: number;
  label: string;
  description?: string;
}

interface StepProgressProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function StepProgress({ steps, currentStep, className }: StepProgressProps) {
  const progressValue = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className={cn("w-full", className)}>
      {/* Progress Bar */}
      <div className="mb-8">
        <Progress value={progressValue} className="h-2 bg-gray-200" />
      </div>

      {/* Step Indicators */}
      <div className="relative flex justify-between">
        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isUpcoming = step.id > currentStep;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center relative z-10"
            >
              {/* Step Circle */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 shadow-sm",
                  isCompleted && "bg-green-500 text-white",
                  isCurrent && "bg-blue-600 text-white ring-4 ring-blue-100",
                  isUpcoming && "bg-gray-200 text-gray-500"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.id
                )}
              </div>

              {/* Step Label */}
              <div className="mt-3 text-center">
                <p
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isCompleted && "text-green-600",
                    isCurrent && "text-blue-600",
                    isUpcoming && "text-gray-400"
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-gray-400 mt-0.5 max-w-[100px]">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Connecting Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-green-500 -z-10 transition-all duration-500"
          style={{ width: `${progressValue}%` }}
        />
      </div>
    </div>
  );
}
