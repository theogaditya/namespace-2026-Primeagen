"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, FileText, MapPin, ClipboardList, Eye, Sparkles } from "lucide-react";

interface Step {
  id: number;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface StepProgressProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function StepProgress({ steps, currentStep, className }: StepProgressProps) {
  const progressValue = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <motion.div 
      className={cn("w-full", className)}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Enhanced Progress Bar */}
      <div className="mb-8 relative">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
          <motion.div
            className="h-full bg-linear-to-r from-orange-500 via-amber-500 to-orange-600 rounded-full relative"
            initial={{ width: 0 }}
            animate={{ width: `${progressValue}%` }}
            transition={{ type: "spring", stiffness: 50, damping: 15 }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </motion.div>
        </div>
        
        {/* Floating progress indicator */}
        <motion.div
          className="absolute -top-1 h-5 w-5 bg-white rounded-full shadow-lg border-2 border-orange-500 flex items-center justify-center"
          initial={{ left: 0 }}
          animate={{ left: `calc(${progressValue}% - 10px)` }}
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
        >
          <motion.div
            className="w-2 h-2 bg-orange-500 rounded-full"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        </motion.div>
      </div>

      {/* Step Indicators */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isUpcoming = step.id > currentStep;

          return (
            <motion.div
              key={step.id}
              className="flex flex-col items-center relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* Step Circle */}
              <motion.div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-semibold shadow-lg relative overflow-hidden",
                  isCompleted && "bg-linear-to-br from-green-400 to-emerald-600 text-white",
                  isCurrent && "bg-linear-to-br from-orange-500 to-amber-600 text-white ring-4 ring-orange-200",
                  isUpcoming && "bg-gray-100 text-gray-400 border-2 border-gray-200"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={isCurrent ? {
                  boxShadow: [
                    "0 0 0 0 rgba(249, 115, 22, 0.4)",
                    "0 0 0 10px rgba(249, 115, 22, 0)",
                    "0 0 0 0 rgba(249, 115, 22, 0)"
                  ]
                } : {}}
                transition={isCurrent ? { repeat: Infinity, duration: 2 } : {}}
              >
                <AnimatePresence mode="wait">
                  {isCompleted ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                      transition={{ type: "spring", stiffness: 200 }}
                    >
                      <Check className="h-6 w-6" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="icon"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      {step.icon || step.id}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Sparkle effect for current step */}
                {isCurrent && (
                  <motion.div
                    className="absolute -top-1 -right-1"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  >
                    <Sparkles className="h-4 w-4 text-amber-300" />
                  </motion.div>
                )}
              </motion.div>

              {/* Step Label */}
              <motion.div 
                className="mt-3 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.2 }}
              >
                <p
                  className={cn(
                    "text-sm font-semibold transition-colors",
                    isCompleted && "text-emerald-600",
                    isCurrent && "text-orange-600",
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
                
                {/* Current step indicator */}
                <AnimatePresence>
                  {isCurrent && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      className="mt-1.5 flex justify-center"
                    >
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-medium rounded-full">
                        Current
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          );
        })}

        {/* Connecting Line */}
        <div className="absolute top-6 left-0 right-0 h-1 bg-gray-100 -z-10 rounded-full" />
        <motion.div
          className="absolute top-6 left-0 h-1 bg-linear-to-r from-emerald-500 to-orange-500 -z-10 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressValue}%` }}
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
        />
      </div>
    </motion.div>
  );
}

// Pre-defined step icons
export const COMPLAINT_STEP_ICONS = {
  category: <ClipboardList className="h-5 w-5" />,
  details: <FileText className="h-5 w-5" />,
  location: <MapPin className="h-5 w-5" />,
  review: <Eye className="h-5 w-5" />,
};
