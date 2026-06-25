"use client";

import React, { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { Category, CATEGORY_DISPLAY, CATEGORY_DEPARTMENT_MAP, Department } from "./types";
import {
  Loader2,
  Building2,
  CheckCircle,
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
  };
  touched: { [key: string]: boolean };
  errors: { [key: string]: string | undefined };
  updateField: (field: "categoryId" | "categoryName" | "assignedDepartment", value: string) => void;
  setFieldTouched: (field: string) => void;
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string | undefined }>>;
}

export function Step1Category({
  formData,
  touched,
  errors,
  updateField,
  setFieldTouched,
  setErrors,
}: Step1Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
      <motion.div
        className="text-center mb-8"
        variants={headerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#630ed4]/10 text-[#630ed4] text-xs font-semibold uppercase tracking-wide mb-4">
          Step 1 of 4
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Select Category</h2>
        <p className="text-gray-500 max-w-md mx-auto">Choose the department related to your complaint for faster resolution</p>
      </motion.div>

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
          const IconComponent = LUCIDE_ICON_MAP[display.lucideIcon];

          return (
            <motion.button
              key={category.id}
              type="button"
              onClick={() => handleCategorySelect(category)}
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative p-4 sm:p-5 rounded-xl border-2 transition-all duration-200",
                "flex flex-col items-center text-center group",
                isSelected
                  ? "border-[#630ed4] bg-[#630ed4]/5 shadow-md ring-1 ring-[#630ed4]/30"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              )}
            >
              {/* Selection indicator */}
              {isSelected && (
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
                  isSelected ? "bg-[#630ed4]/10" : "bg-gray-100 group-hover:bg-gray-200/70"
                )}
              >
                {IconComponent ? (
                  <IconComponent
                    className={cn(
                      "h-5 w-5",
                      isSelected ? "text-[#630ed4]" : "text-gray-500"
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
                  isSelected ? "text-[#630ed4]" : "text-gray-700"
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
            <div className="flex-1">
              <p className="text-sm text-[#630ed4] font-medium mb-0.5">Your complaint will be assigned to</p>
              <p className="text-lg font-bold text-gray-900">
                {formatDepartment(formData.assignedDepartment)}
              </p>
            </div>
            <div className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
              ✓ Selected
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
