"use client";

import React from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { ComplaintFormState, URGENCY_OPTIONS, CATEGORY_DISPLAY } from "./types";
import {
  CheckCircle,
  MapPin,
  FileText,
  Building2,
  AlertTriangle,
  Globe,
  Lock,
  Image,
  Edit2,
  Sparkles,
  Send,
  Clock,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Step4Props {
  formData: ComplaintFormState;
  goToStep: (step: number) => void;
}

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
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
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

export function Step4Review({ formData, goToStep }: Step4Props) {
  const formatDepartment = (dept: string) => {
    return dept.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getCategoryDisplay = (categoryName: string) => {
    return CATEGORY_DISPLAY.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase()
    ) || { icon: "📋", color: "text-gray-600", bgColor: "bg-gray-50" };
  };

  const getUrgencyDisplay = (urgency: string) => {
    return URGENCY_OPTIONS.find((u) => u.value === urgency) || URGENCY_OPTIONS[0];
  };

  const categoryDisplay = getCategoryDisplay(formData.categoryName);
  const urgencyDisplay = getUrgencyDisplay(formData.urgency);

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="text-center mb-8" variants={headerVariants}>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-purple-100 to-pink-100 text-purple-700 text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          Final Step
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Review Your Complaint</h2>
        <p className="text-gray-500">Please verify all details before submitting</p>
      </motion.div>

      {/* Category & Department */}
      <motion.div
        variants={itemVariants}
        className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-linear-to-r from-orange-50 to-amber-50 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Building2 className="h-5 w-5 text-orange-600" />
            </div>
            <span className="font-semibold text-gray-800">Category & Department</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => goToStep(1)}
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 gap-1.5 h-auto py-1.5 px-3 rounded-xl"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className={cn("p-3 rounded-2xl", categoryDisplay.bgColor)}
            >
              <span className="text-4xl">{categoryDisplay.icon}</span>
            </motion.div>
            <div>
              <p className="font-bold text-lg text-gray-900">{formData.categoryName}</p>
              <p className="text-sm text-gray-500">
                Assigned to{" "}
                <span className="font-semibold text-orange-600">
                  {formatDepartment(formData.assignedDepartment)}
                </span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Complaint Details */}
      <motion.div
        variants={itemVariants}
        className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-linear-to-r from-blue-50 to-cyan-50 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <span className="font-semibold text-gray-800">Complaint Details</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => goToStep(2)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 gap-1.5 h-auto py-1.5 px-3 rounded-xl"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Sub-category</p>
            <p className="text-gray-900 font-medium">{formData.subCategory}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Description</p>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100">
              {formData.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Urgency</p>
              <motion.span
                whileHover={{ scale: 1.05 }}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold",
                  urgencyDisplay.bgColor,
                  urgencyDisplay.color
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {urgencyDisplay.label}
              </motion.span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Visibility</p>
              <motion.span
                whileHover={{ scale: 1.05 }}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold",
                  formData.isPublic
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                )}
              >
                {formData.isPublic ? (
                  <>
                    <Globe className="h-3.5 w-3.5" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    Private
                  </>
                )}
              </motion.span>
            </div>
          </div>
          {formData.photoPreview && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Attached Photo</p>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative inline-block"
              >
                <img
                  src={formData.photoPreview}
                  alt="Complaint attachment"
                  className="max-h-40 rounded-xl border-2 border-gray-200 object-cover shadow-md"
                />
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-xs font-medium text-gray-600 flex items-center gap-1">
                  <Image className="h-3 w-3" />
                  Attached
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Location */}
      <motion.div
        variants={itemVariants}
        className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-linear-to-r from-emerald-50 to-teal-50 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <MapPin className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="font-semibold text-gray-800">Location</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => goToStep(3)}
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 gap-1.5 h-auto py-1.5 px-3 rounded-xl"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">District</p>
              <p className="text-gray-900 font-semibold mt-1">{formData.district}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">PIN Code</p>
              <p className="text-gray-900 font-semibold font-mono mt-1">{formData.pin}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">City</p>
              <p className="text-gray-900 font-medium mt-1">{formData.city}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Locality</p>
              <p className="text-gray-900 font-medium mt-1">{formData.locality}</p>
            </div>
            {(formData.latitude || formData.longitude) && (
              <div className="col-span-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">GPS Coordinates</p>
                <p className="text-gray-900 font-mono text-sm mt-1">
                  {formData.latitude && `${formData.latitude}° N`}
                  {formData.latitude && formData.longitude && ", "}
                  {formData.longitude && `${formData.longitude}° E`}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Confirmation Notice */}
      <motion.div
        variants={itemVariants}
        className="p-5 bg-linear-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-200 rounded-2xl"
      >
        <div className="flex gap-4">
          <motion.div
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="p-3 bg-amber-100 rounded-xl h-fit"
          >
            <CheckCircle className="h-6 w-6 text-amber-600" />
          </motion.div>
          <div>
            <p className="font-bold text-amber-800 text-lg">Ready to Submit</p>
            <p className="text-sm text-amber-700 mt-1.5 leading-relaxed">
              Please review all the information above. Once submitted, your complaint
              will be processed and assigned to the appropriate department for resolution.
            </p>
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <Clock className="h-4 w-4" />
                <span>Expected response: 24-48 hours</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <Shield className="h-4 w-4" />
                <span>Your data is secure</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
