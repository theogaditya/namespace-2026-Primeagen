"use client";

import React, { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { Category, CATEGORY_DISPLAY, CATEGORY_DEPARTMENT_MAP, Department } from "../customComps/types";
import { Loader2, Building2, CheckCircle, Sparkles, Camera, ImageIcon } from "lucide-react";

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
  // New props for autofill functionality
  useAutofill: boolean;
  onAutofillToggle: (value: boolean) => void;
}

export function Step1CategoryWithAutofill({
  formData,
  touched,
  errors,
  updateField,
  setFieldTouched,
  setErrors,
  useAutofill,
  onAutofillToggle,
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
    return CATEGORY_DISPLAY.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase()
    ) || {
      icon: "📋",
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
          <div className="absolute inset-0 rounded-full bg-orange-500/20 blur-xl animate-pulse" />
          <div className="relative bg-linear-to-br from-orange-500 to-amber-500 rounded-full p-4">
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
            className="px-6 py-2 bg-linear-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
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
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-orange-100 to-amber-100 text-orange-700 text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          Step 1 of 4
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Select Category</h2>
        <p className="text-gray-500 max-w-md mx-auto">Choose the department related to your complaint for faster resolution</p>
      </motion.div>

      {/* Autofill Toggle Option */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <button
          type="button"
          onClick={() => onAutofillToggle(!useAutofill)}
          className={cn(
            "w-full p-4 rounded-2xl border-2 transition-all duration-300 flex items-center gap-4",
            useAutofill
              ? "border-purple-400 bg-gradient-to-r from-purple-50 to-indigo-50 shadow-md"
              : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/30"
          )}
        >
          <div className={cn(
            "p-3 rounded-xl transition-all",
            useAutofill ? "bg-purple-100" : "bg-gray-100"
          )}>
            <Camera className={cn(
              "h-6 w-6 transition-colors",
              useAutofill ? "text-purple-600" : "text-gray-500"
            )} />
          </div>
          <div className="flex-1 text-left">
            <p className={cn(
              "font-semibold transition-colors",
              useAutofill ? "text-purple-700" : "text-gray-700"
            )}>
              Fill complaint with image
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload an image and let AI auto-fill the complaint details
            </p>
          </div>
          <div className={cn(
            "w-12 h-7 rounded-full transition-all duration-300 flex items-center px-1",
            useAutofill ? "bg-purple-500" : "bg-gray-300"
          )}>
            <motion.div
              className="w-5 h-5 bg-white rounded-full shadow-md"
              animate={{ x: useAutofill ? 20 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </div>
        </button>
        {useAutofill && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="text-xs text-purple-600 mt-2 px-2 flex items-center gap-1"
          >
            <ImageIcon className="h-3 w-3" />
            After selecting a category, you'll upload an image to auto-fill details
          </motion.p>
        )}
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

          return (
            <motion.button
              key={category.id}
              type="button"
              onClick={() => handleCategorySelect(category)}
              variants={itemVariants}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "relative p-4 sm:p-5 rounded-2xl border-2 transition-all duration-300",
                "flex flex-col items-center text-center group",
                "hover:shadow-lg",
                isSelected
                  ? "border-orange-500 bg-linear-to-br from-orange-50 to-amber-50 shadow-lg ring-2 ring-orange-200"
                  : `${display.borderColor} ${display.bgColor} hover:border-orange-300 hover:bg-white`
              )}
            >
              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute top-2 right-2"
                >
                  <div className="bg-linear-to-r from-orange-500 to-amber-500 rounded-full p-1">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                </motion.div>
              )}

              {/* Glow effect on hover/select */}
              <div
                className={cn(
                  "absolute inset-0 rounded-2xl transition-opacity duration-300 -z-10",
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                )}
                style={{
                  background: `radial-gradient(circle at center, ${isSelected ? "rgba(249, 115, 22, 0.15)" : "rgba(249, 115, 22, 0.1)"} 0%, transparent 70%)`,
                }}
              />

              {/* Icon */}
              <motion.span
                className="text-3xl sm:text-4xl mb-2 sm:mb-3"
                animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {display.icon}
              </motion.span>

              {/* Label */}
              <span
                className={cn(
                  "text-xs sm:text-sm font-semibold leading-tight",
                  isSelected ? "text-orange-700" : display.color
                )}
              >
                {category.name}
              </span>
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
          className="mt-8 p-5 bg-linear-to-r from-orange-50 via-amber-50 to-orange-50 border-2 border-orange-200 rounded-2xl"
        >
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              className="p-3 bg-linear-to-br from-orange-500 to-amber-500 rounded-xl shadow-lg"
            >
              <Building2 className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <p className="text-sm text-orange-600 font-medium mb-0.5">Your complaint will be assigned to</p>
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
              <div className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                ✓ Selected
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
