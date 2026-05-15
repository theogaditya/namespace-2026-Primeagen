"use client";

import React, { useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  URGENCY_OPTIONS, 
  ComplaintUrgency, 
  countWords 
} from "./types";
import { 
  MAX_SUBCATEGORY_WORDS, 
  MAX_DESCRIPTION_WORDS,
  MAX_PHOTO_SIZE_BYTES,
  MAX_PHOTO_SIZE_MB,
} from "./validation";
import { 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  ImagePlus, 
  X, 
  Globe,
  Lock,
  Sparkles,
  Upload,
  Camera,
} from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
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

interface Step2Props {
  formData: {
    subCategory: string;
    description: string;
    urgency: ComplaintUrgency;
    isPublic: boolean;
    photo: File | null;
    photoPreview: string;
    categoryName: string;
  };
  touched: { [key: string]: boolean };
  errors: { [key: string]: string | undefined };
  updateField: (field: "subCategory" | "description" | "urgency" | "isPublic", value: string | boolean) => void;
  setFieldTouched: (field: string) => void;
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string | undefined }>>;
  setPhoto: (file: File | null) => void;
}

interface WordCounterProps {
  current: number;
  max: number;
}

function WordCounter({ current, max }: WordCounterProps) {
  const isOverLimit = current > max;
  const isNearLimit = current > max * 0.8;
  const percentage = Math.min((current / max) * 100, 100);

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className={cn(
            "h-full rounded-full",
            isOverLimit ? "bg-red-500" : isNearLimit ? "bg-amber-500" : "bg-emerald-500"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <span
        className={cn(
          "text-xs font-medium tabular-nums",
          isOverLimit ? "text-red-600" : isNearLimit ? "text-amber-600" : "text-gray-400"
        )}
      >
        {current}/{max}
      </span>
    </div>
  );
}

export function Step2Details({
  formData,
  touched,
  errors,
  updateField,
  setFieldTouched,
  setErrors,
  setPhoto,
}: Step2Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const subCategoryWords = countWords(formData.subCategory);
  const descriptionWords = countWords(formData.description);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoError(null);

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select an image file");
      return;
    }

    // Validate file size
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setPhotoError(`Image must be less than ${MAX_PHOTO_SIZE_MB}MB`);
      return;
    }

    setPhoto(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
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
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    setPhotoError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubCategoryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    updateField("subCategory", value);
    
    // Real-time validation
    if (countWords(value) > MAX_SUBCATEGORY_WORDS) {
      setErrors((prev) => ({
        ...prev,
        subCategory: `Sub-category must be ${MAX_SUBCATEGORY_WORDS} words or less`,
      }));
    } else if (value.length < 3 && touched.subCategory) {
      setErrors((prev) => ({
        ...prev,
        subCategory: "Sub-category must be at least 3 characters",
      }));
    } else {
      setErrors((prev) => ({ ...prev, subCategory: undefined }));
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    updateField("description", value);
    
    // Real-time validation
    if (countWords(value) > MAX_DESCRIPTION_WORDS) {
      setErrors((prev) => ({
        ...prev,
        description: `Description must be ${MAX_DESCRIPTION_WORDS} words or less`,
      }));
    } else if (value.length < 10 && touched.description) {
      setErrors((prev) => ({
        ...prev,
        description: "Description must be at least 10 characters",
      }));
    } else {
      setErrors((prev) => ({ ...prev, description: undefined }));
    }
  };

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="text-center mb-8" variants={headerVariants}>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-blue-100 to-cyan-100 text-blue-700 text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          Step 2 of 4
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Complaint Details</h2>
        <p className="text-gray-500">
          Describe your issue for{" "}
          <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
            {formData.categoryName}
          </span>
        </p>
      </motion.div>

      {/* Sub-category */}
      <motion.div className="space-y-2" variants={itemVariants}>
        <div className="flex items-center justify-between">
          <Label htmlFor="subCategory" className={cn(
            "text-sm font-semibold",
            touched.subCategory && errors.subCategory && "text-red-600"
          )}>
            Sub-category <span className="text-red-500">*</span>
          </Label>
          <WordCounter current={subCategoryWords} max={MAX_SUBCATEGORY_WORDS} />
        </div>
        <div className="relative">
          <Textarea
            id="subCategory"
            value={formData.subCategory}
            onChange={handleSubCategoryChange}
            onBlur={() => setFieldTouched("subCategory")}
            placeholder="Briefly describe the type of issue (e.g., Pothole on main road)"
            className={cn(
              "min-h-20 resize-none rounded-xl border-2 transition-all focus:ring-2 focus:ring-blue-100",
              touched.subCategory && errors.subCategory 
                ? "border-red-300 focus:border-red-500" 
                : "border-gray-200 focus:border-blue-500"
            )}
          />
        </div>
        {touched.subCategory && errors.subCategory && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-600 flex items-center gap-1"
          >
            <AlertCircle className="h-4 w-4" />
            {errors.subCategory}
          </motion.p>
        )}
      </motion.div>

      {/* Description */}
      <motion.div className="space-y-2" variants={itemVariants}>
        <div className="flex items-center justify-between">
          <Label htmlFor="description" className={cn(
            "text-sm font-semibold",
            touched.description && errors.description && "text-red-600"
          )}>
            Description <span className="text-red-500">*</span>
          </Label>
          <WordCounter current={descriptionWords} max={MAX_DESCRIPTION_WORDS} />
        </div>
        <Textarea
          id="description"
          value={formData.description}
          onChange={handleDescriptionChange}
          onBlur={() => setFieldTouched("description")}
          placeholder="Provide detailed information about your complaint. Include relevant details like when the issue started, how it affects you, etc."
          className={cn(
            "min-h-[150px] resize-none rounded-xl border-2 transition-all focus:ring-2 focus:ring-blue-100",
            touched.description && errors.description 
              ? "border-red-300 focus:border-red-500" 
              : "border-gray-200 focus:border-blue-500"
          )}
        />
        {touched.description && errors.description && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-600 flex items-center gap-1"
          >
            <AlertCircle className="h-4 w-4" />
            {errors.description}
          </motion.p>
        )}
      </motion.div>

      {/* Urgency */}
      <motion.div className="space-y-3" variants={itemVariants}>
        <Label className="text-sm font-semibold">
          Urgency Level <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {URGENCY_OPTIONS.map((option) => {
            const isSelected = formData.urgency === option.value;
            return (
              <motion.button
                key={option.value}
                type="button"
                onClick={() => {
                  updateField("urgency", option.value);
                  setFieldTouched("urgency");
                }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative p-4 rounded-xl border-2 transition-all duration-200 text-left overflow-hidden",
                  isSelected
                    ? `${option.bgColor} border-current ${option.color} shadow-lg`
                    : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                )}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </motion.div>
                )}
                <p className={cn("font-semibold text-sm", isSelected ? option.color : "text-gray-700")}>
                  {option.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{option.description}</p>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Photo Upload */}
      <motion.div className="space-y-3" variants={itemVariants}>
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Camera className="h-4 w-4 text-gray-500" />
          Attach Photo (Optional)
        </Label>
        <div className="space-y-2">
          {formData.photoPreview ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative inline-block group"
            >
              <img
                src={formData.photoPreview}
                alt="Complaint attachment"
                className="max-h-48 rounded-xl border-2 border-gray-200 object-cover shadow-lg"
              />
              <motion.button
                type="button"
                onClick={handleRemovePhoto}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </motion.button>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                <span className="text-white text-sm font-medium">Click × to remove</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                "w-full p-8 border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer",
                "flex flex-col items-center justify-center gap-3",
                isDragging
                  ? "border-blue-500 bg-blue-50 scale-[1.02]"
                  : photoError
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
              )}
            >
              <motion.div
                animate={isDragging ? { y: -5, scale: 1.1 } : { y: 0, scale: 1 }}
                className={cn(
                  "p-3 rounded-xl",
                  isDragging ? "bg-blue-100" : "bg-gray-100"
                )}
              >
                <Upload className={cn(
                  "h-8 w-8",
                  isDragging ? "text-blue-600" : photoError ? "text-red-400" : "text-gray-400"
                )} />
              </motion.div>
              <div className="text-center">
                <span className={cn(
                  "text-sm font-medium block",
                  isDragging ? "text-blue-600" : photoError ? "text-red-600" : "text-gray-600"
                )}>
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
              className="text-sm text-red-600 flex items-center gap-1"
            >
              <AlertCircle className="h-4 w-4" />
              {photoError}
            </motion.p>
          )}
        </div>
      </motion.div>

      {/* Public/Private Toggle */}
      <motion.div
        variants={itemVariants}
        className={cn(
          "p-5 rounded-2xl border-2 transition-all duration-300",
          formData.isPublic
            ? "bg-linear-to-r from-blue-50 to-cyan-50 border-blue-200"
            : "bg-gray-50 border-gray-200"
        )}
      >
        <div className="flex items-start gap-4">
          <Checkbox
            id="isPublic"
            checked={formData.isPublic}
            onCheckedChange={(checked) => {
              updateField("isPublic", checked === true);
              setFieldTouched("isPublic");
            }}
            className="mt-0.5 h-5 w-5"
          />
          <div className="flex-1">
            <Label htmlFor="isPublic" className="text-sm font-semibold cursor-pointer flex items-center gap-2">
              {formData.isPublic ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="p-1.5 bg-blue-100 rounded-lg"
                  >
                    <Globe className="h-4 w-4 text-blue-600" />
                  </motion.div>
                  <span className="text-blue-700">Make complaint public</span>
                </>
              ) : (
                <>
                  <div className="p-1.5 bg-gray-200 rounded-lg">
                    <Lock className="h-4 w-4 text-gray-500" />
                  </div>
                  <span className="text-gray-700">Keep complaint private</span>
                </>
              )}
            </Label>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              {formData.isPublic
                ? "Your complaint will be visible in the Community Feed. Other citizens can see and upvote it to increase priority."
                : "Your complaint will only be visible to you and the assigned department officials."}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
