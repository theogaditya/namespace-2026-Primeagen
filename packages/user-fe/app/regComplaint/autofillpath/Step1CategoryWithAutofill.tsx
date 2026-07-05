"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { Category, CATEGORY_DISPLAY, CATEGORY_DEPARTMENT_MAP, Department } from "../customComps/types";
import { validateImage, type ImageValidationResult } from "@/lib/api/imageValidation";
import {
  MAX_PHOTO_SIZE_BYTES,
  MAX_PHOTO_SIZE_MB,
} from "../customComps/validation";
import {
  Loader2,
  Building2,
  CheckCircle,
  Camera,
  Upload,
  Wrench,
  GraduationCap,
  Coins,
  HeartPulse,
  Droplets,
  Zap,
  Bus,
  Shield,
  TreePine,
  LayoutGrid,
  HandHelping,
  Users,
  Brain,
  Sparkles,
  X,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

// Map lucideIcon string names to actual Lucide components
const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  Wrench,
  GraduationCap,
  Coins,
  HeartPulse,
  Droplets,
  Zap,
  Bus,
  Building2,
  Shield,
  TreePine,
  LayoutGrid,
  HandHelping,
  Users,
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 150,
      damping: 15,
    },
  },
};

const headerVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
    },
  },
};

interface Step1Props {
  formData: {
    categoryId: string;
    categoryName: string;
    assignedDepartment: string;
    photoPreview: string;
    photo: File | null;
  };
  touched: { [key: string]: boolean };
  errors: { [key: string]: string | undefined };
  updateField: (field: "categoryId" | "categoryName" | "assignedDepartment", value: string) => void;
  setFieldTouched: (field: string) => void;
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string | undefined }>>;
  setPhoto: (file: File | null) => void;
  // Autofill state
  useAutofill: boolean;
  onAutofillToggle: (value: boolean) => void;
  // AI Quick Fill callbacks
  onAIUploadStart?: () => void;
  onAIAnalysisComplete?: (data: { category: string; subCategory: string; complaint: string; urgency: string }) => void;
  onAIAnalysisError?: () => void;
  // Orchestrator highlights
  highlightedCategory?: string;
  isAutoFilling?: boolean;
  autoFillPhase?: string;
}

// API Response interface
interface ImageAnalysisResponse {
  success: boolean;
  category?: string;
  subCategory?: string;
  complaint?: string;
  urgency?: string;
  model?: string;
  error?: string;
}

export function Step1CategoryWithAutofill({
  formData,
  touched,
  errors,
  updateField,
  setFieldTouched,
  setErrors,
  setPhoto,
  useAutofill,
  onAutofillToggle,
  onAIUploadStart,
  onAIAnalysisComplete,
  onAIAnalysisError,
  highlightedCategory,
  isAutoFilling,
  autoFillPhase,
}: Step1Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // AI image upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationStatus, setValidationStatus] = useState<"idle" | "validating" | "valid" | "invalid" | "error">("idle");
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "analyzing" | "success" | "error">("idle");
  const [aiBoxExpanded, setAiBoxExpanded] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/complaint/categories");
        const data = await response.json();

        if (data.success && data.data) {
          setCategories(data.data);
        } else {
          setFetchError("Failed to load categories");
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        setFetchError("Failed to load categories");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleCategorySelect = (category: Category) => {
    updateField("categoryId", category.id);
    updateField("categoryName", category.name);
    updateField("assignedDepartment", category.assignedDepartment);
    setFieldTouched("categoryId");
    setErrors((prev) => ({ ...prev, categoryId: undefined, categoryName: undefined, assignedDepartment: undefined }));
  };

  const getCategoryDisplay = (categoryName: string) => {
    const found = CATEGORY_DISPLAY.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase()
    );
    return found || {
      icon: "📋",
      lucideIcon: "Wrench",
      keywords: "",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
    };
  };

  const formatDepartment = (dept: string) => {
    return dept.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Image validation + AI analysis
  const analyzeImage = useCallback(async (file: File) => {
    setAnalysisStatus("analyzing");

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("image", file);

      const apiUrl = process.env.NEXT_PUBLIC_IMAGE_ANALYSIS_API_URL || "http://localhost:3040/api/image";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(apiUrl, {
        method: "POST",
        body: formDataToSend,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Analysis service returned ${response.status}`);
      }

      const data: ImageAnalysisResponse = await response.json();

      if (data.success && data.category && data.complaint) {
        setAnalysisStatus("success");
        onAIAnalysisComplete?.({
          category: data.category,
          subCategory: data.subCategory || data.category,
          complaint: data.complaint,
          urgency: data.urgency || "MEDIUM",
        });
      } else {
        throw new Error(data.error || "Failed to analyze image");
      }
    } catch (err) {
      console.error("Image analysis error:", err);
      setAnalysisStatus("error");
      onAIAnalysisError?.();
    }
  }, [onAIAnalysisComplete, onAIAnalysisError]);

  const processImage = useCallback(async (file: File) => {
    // Step 1: Validate
    setValidationStatus("validating");
    try {
      const result = await validateImage(file);
      if (result.is_valid) {
        setValidationStatus("valid");
      } else if (result.service_unavailable) {
        setValidationStatus("idle"); // Skip validation if service unavailable
      } else {
        setValidationStatus("invalid");
        return; // Don't proceed with invalid image
      }
    } catch {
      setValidationStatus("error");
      // Continue with analysis even if validation fails
    }

    // Step 2: Analyze with AI
    await analyzeImage(file);
  }, [analyzeImage]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoError(null);
    setValidationStatus("idle");
    setAnalysisStatus("idle");

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select an image file");
      return;
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setPhotoError(`Image must be less than ${MAX_PHOTO_SIZE_MB}MB`);
      return;
    }

    setPhoto(file);
    onAIUploadStart?.();
    await processImage(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setPhotoError(null);
    setValidationStatus("idle");
    setAnalysisStatus("idle");

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select an image file");
      return;
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setPhotoError(`Image must be less than ${MAX_PHOTO_SIZE_MB}MB`);
      return;
    }

    setPhoto(file);
    onAIUploadStart?.();
    await processImage(file);
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    setPhotoError(null);
    setValidationStatus("idle");
    setAnalysisStatus("idle");
    setAiBoxExpanded(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAIBoxClick = () => {
    if (isAutoFilling) return;
    onAutofillToggle(true);
    setAiBoxExpanded(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="relative"
        >
          <div className="absolute inset-0 rounded-full bg-[#630ed4]/20 blur-xl animate-pulse" />
          <div className="relative bg-[#630ed4] rounded-full p-4">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-gray-500 mt-4 font-medium"
        >
          Loading categories...
        </motion.p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md mx-auto">
          <p className="text-red-600 font-medium mb-4">{fetchError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#630ed4] text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            Try again
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Fill with AI — Prominent Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div
          className={cn(
            "rounded-2xl border-2 transition-all duration-300 overflow-hidden",
            aiBoxExpanded || useAutofill
              ? "border-[#630ed4] bg-gradient-to-br from-[#630ed4]/5 to-purple-50"
              : "border-gray-200 bg-white hover:border-[#630ed4]/40 hover:shadow-md"
          )}
        >
          {/* Header section — always visible */}
          <button
            type="button"
            onClick={handleAIBoxClick}
            disabled={isAutoFilling}
            className={cn(
              "w-full p-5 sm:p-6 flex items-center gap-4 text-left transition-colors",
              !aiBoxExpanded && !useAutofill && "hover:bg-[#630ed4]/[0.02]",
              isAutoFilling && "cursor-default"
            )}
          >
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#630ed4] to-[#8b5cf6] shadow-lg">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold text-gray-900">Quick Fill with AI</span>
                <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded">
                  Auto
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Upload a photo — AI fills category, details, and location for you
              </p>
            </div>
            {!aiBoxExpanded && !useAutofill && (
              <div className="px-5 py-2.5 rounded-xl bg-[#630ed4] text-white text-sm font-semibold shrink-0 flex items-center gap-2 shadow-md">
                <Camera className="h-4 w-4" />
                Start
              </div>
            )}
          </button>

          {/* Expanded: Image Upload Area */}
          <AnimatePresence>
            {(aiBoxExpanded || useAutofill) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="px-5 sm:px-6 pb-5 sm:pb-6"
              >
                <div className="border-t border-[#630ed4]/20 pt-5">
                  {formData.photoPreview ? (
                    // Image preview + status badges
                    <div className="space-y-3">
                      <div className="relative inline-block">
                        <img
                          src={formData.photoPreview}
                          alt="Complaint image"
                          className="max-h-48 rounded-xl border-2 border-purple-200 object-cover shadow-lg"
                        />
                        {analysisStatus !== "analyzing" && (
                          <motion.button
                            type="button"
                            onClick={handleRemovePhoto}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors z-10"
                          >
                            <X className="h-4 w-4" />
                          </motion.button>
                        )}
                      </div>

                      {/* Validation badge */}
                      <AnimatePresence mode="wait">
                        {validationStatus === "validating" && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200"
                          >
                            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                            <span className="text-sm font-medium text-emerald-700">Verifying image...</span>
                          </motion.div>
                        )}
                        {validationStatus === "valid" && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200"
                          >
                            <ShieldCheck className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">Image Verified</span>
                          </motion.div>
                        )}
                        {validationStatus === "invalid" && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200"
                          >
                            <ShieldAlert className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-medium text-amber-700">Image may not be relevant — try another</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Analysis badge */}
                      <AnimatePresence mode="wait">
                        {analysisStatus === "analyzing" && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200"
                          >
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <Brain className="h-4 w-4 text-purple-600" />
                            </motion.div>
                            <span className="text-sm font-medium text-purple-700">AI is analyzing your image...</span>
                          </motion.div>
                        )}
                        {analysisStatus === "success" && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300"
                          >
                            <Sparkles className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-700">AI analysis complete — auto-filling...</span>
                          </motion.div>
                        )}
                        {analysisStatus === "error" && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-50 border border-red-200"
                          >
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium text-red-600">Analysis failed — select category manually below</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    // Drop zone
                    <motion.div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        "w-full p-8 border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer",
                        "flex flex-col items-center justify-center gap-3",
                        isDragging
                          ? "border-purple-500 bg-purple-50/80"
                          : "border-purple-300 hover:border-purple-400 bg-white/50 hover:bg-purple-50/30"
                      )}
                    >
                      <motion.div
                        animate={isDragging ? { y: -5, scale: 1.1 } : { y: 0, scale: 1 }}
                        className="p-3 rounded-xl bg-purple-100/70"
                      >
                        <Upload className={cn(
                          "h-8 w-8",
                          isDragging ? "text-purple-600" : "text-purple-500"
                        )} />
                      </motion.div>
                      <div className="text-center">
                        <span className="text-sm font-medium text-purple-600 block">
                          {isDragging ? "Drop your image here" : "Click to upload or drag and drop"}
                        </span>
                        <span className="text-xs text-gray-400 mt-1">PNG, JPG up to {MAX_PHOTO_SIZE_MB}MB</span>
                      </div>
                    </motion.div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  {photoError && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-600 flex items-center gap-1 mt-2"
                    >
                      <AlertCircle className="h-4 w-4" />
                      {photoError}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Or select manually</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Error message */}
      {touched.categoryId && errors.categoryId && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
        >
          {errors.categoryId}
        </motion.div>
      )}

      {/* Category Grid */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {categories.map((category) => {
          const display = getCategoryDisplay(category.name);
          const isSelected = formData.categoryId === category.id;
          const isHighlighted = highlightedCategory === category.id;
          const IconComponent = LUCIDE_ICON_MAP[display.lucideIcon];

          return (
            <motion.button
              key={category.id}
              type="button"
              onClick={() => !isAutoFilling && handleCategorySelect(category)}
              variants={itemVariants}
              whileHover={!isAutoFilling ? { scale: 1.02, y: -2 } : {}}
              whileTap={!isAutoFilling ? { scale: 0.98 } : {}}
              animate={isHighlighted ? {
                scale: [1, 1.08, 1.04],
                boxShadow: ["0 0 0 0 rgba(99, 14, 212, 0)", "0 0 0 8px rgba(99, 14, 212, 0.2)", "0 0 0 4px rgba(99, 14, 212, 0.1)"],
              } : {}}
              transition={isHighlighted ? { duration: 0.6 } : {}}
              className={cn(
                "relative p-4 sm:p-5 rounded-xl border-2 transition-all duration-200",
                "flex flex-col items-center text-center group",
                isSelected || isHighlighted
                  ? "border-[#630ed4] bg-[#630ed4]/5 shadow-md ring-1 ring-[#630ed4]/30"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm",
                isAutoFilling && !isHighlighted && !isSelected && "opacity-60"
              )}
            >
              {/* Selection indicator */}
              {(isSelected || isHighlighted) && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute top-2 right-2"
                >
                  <div className="bg-[#630ed4] rounded-full p-0.5">
                    <CheckCircle className="h-3.5 w-3.5 text-white" />
                  </div>
                </motion.div>
              )}

              {/* Icon */}
              <div
                className={cn(
                  "w-11 h-11 rounded-lg flex items-center justify-center mb-2.5 transition-colors",
                  isSelected || isHighlighted ? "bg-[#630ed4]/10" : "bg-gray-100 group-hover:bg-gray-200/70"
                )}
              >
                {IconComponent ? (
                  <IconComponent
                    className={cn(
                      "h-5 w-5",
                      isSelected || isHighlighted ? "text-[#630ed4]" : "text-gray-500"
                    )}
                  />
                ) : (
                  <span className="text-xl">{display.icon}</span>
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-xs sm:text-sm font-semibold leading-tight",
                  isSelected || isHighlighted ? "text-[#630ed4]" : "text-gray-700"
                )}
              >
                {category.name}
              </span>

              {/* Keywords */}
              {display.keywords && (
                <span className="text-[10px] text-gray-400 mt-1 leading-tight line-clamp-1">
                  {display.keywords}
                </span>
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Selected Category Info */}
      {formData.categoryId && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="mt-8 p-5 bg-[#630ed4]/5 border border-[#630ed4]/20 rounded-xl"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#630ed4] rounded-xl shadow-sm">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-[#630ed4] font-medium mb-0.5">Your complaint will be assigned to</p>
              <p className="text-lg font-bold text-gray-900">
                {formatDepartment(formData.assignedDepartment)}
              </p>
            </div>
            <motion.div
              className="ml-auto"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <div className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                ✓ Selected
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
