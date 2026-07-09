"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Send,
  AlertCircle,
  CheckCircle,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useComplaintForm,
  Step3Location,
  Step4Review,
  LoadingPopup,
  step1Schema,
  step2Schema,
  step3Schema,
} from "../customComps";
import {
  Step1CategoryWithAutofill,
  Step2DetailsAI,
  type ImageAnalysisStatus,
} from ".";

// Animation variants
const stepContentVariants: Variants = {
  initial: { opacity: 0, x: 50 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    x: -50,
    transition: {
      duration: 0.2,
    },
  },
};

// Step configuration - Autofill path
const STEPS_AUTOFILL = [
  { id: 1, label: "INITIAL INFO" },
  { id: 2, label: "AI AUTO-FILL" },
  { id: 3, label: "LOCATION" },
  { id: 4, label: "REVIEW" },
];

// Step configuration - Standard path (if autofill is toggled off)
const STEPS_STANDARD = [
  { id: 1, label: "CATEGORY" },
  { id: 2, label: "DETAILS" },
  { id: 3, label: "LOCATION" },
  { id: 4, label: "REVIEW" },
];

// Step Progress Component - Purple themed with numbered circles
function StepProgress({
  steps,
  currentStep,
}: {
  steps: typeof STEPS_AUTOFILL;
  currentStep: number;
}) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative flex items-center justify-between">
        {/* Background connector line */}
        <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-gray-200" />
        {/* Active connector line */}
        <motion.div
          className="absolute top-5 left-[10%] h-0.5 bg-[#630ed4]"
          initial={{ width: "0%" }}
          animate={{
            width: `${Math.min(((currentStep - 1) / (steps.length - 1)) * 80, 80)}%`,
          }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />

        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <motion.div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-300",
                  isCompleted && "bg-emerald-500 text-white",
                  isCurrent && "bg-[#630ed4] text-white ring-4 ring-[#630ed4]/20",
                  !isCompleted && !isCurrent && "bg-gray-200 text-gray-400"
                )}
                initial={false}
                animate={{ scale: isCurrent ? 1.05 : 1 }}
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  step.id
                )}
              </motion.div>
              <span
                className={cn(
                  "mt-2 text-[11px] font-semibold tracking-wide",
                  isCompleted && "text-emerald-600",
                  isCurrent && "text-[#630ed4]",
                  !isCompleted && !isCurrent && "text-gray-400"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RegisterComplaintWithAutofillPage() {
  const router = useRouter();
  const {
    formData,
    touched,
    updateField,
    setFieldTouched,
    errors,
    validateStep,
    currentStep,
    nextStep,
    prevStep,
    resetForm,
    setErrors,
    setPhoto,
    goToStep,
  } = useComplaintForm();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error">("loading");
  const [submitMessage, setSubmitMessage] = useState({ title: "", description: "" });
  const [showPopup, setShowPopup] = useState(false);
  const [complaintId, setComplaintId] = useState<string | null>(null);
  const [imageAnalysisStatus, setImageAnalysisStatus] = useState<ImageAnalysisStatus>("idle");
  
  // Autofill mode state
  const [useAutofill, setUseAutofill] = useState(false);

  // Get the appropriate steps based on autofill mode
  const STEPS = useAutofill ? STEPS_AUTOFILL : STEPS_STANDARD;

  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/loginUser?redirect=/regComplaint");
    }
  }, [router]);

  // Get current step schema and data
  const getStepValidationData = (step: number) => {
    switch (step) {
      case 1:
        return {
          schema: step1Schema,
          data: {
            categoryId: formData.categoryId,
            categoryName: formData.categoryName,
            assignedDepartment: formData.assignedDepartment,
          },
        };
      case 2:
        return {
          schema: step2Schema,
          data: {
            subCategory: formData.subCategory,
            description: formData.description,
            urgency: formData.urgency,
            isPublic: formData.isPublic,
          },
        };
      case 3:
        return {
          schema: step3Schema,
          data: {
            district: formData.district,
            pin: formData.pin,
            city: formData.city,
            locality: formData.locality,
            latitude: formData.latitude,
            longitude: formData.longitude,
          },
        };
      default:
        return { schema: step1Schema, data: {} };
    }
  };

  const buildSubmitFormData = () => {
    const submitFormData = new FormData();
    const moderatedDescription =
      formData.abuseStatus === "ready" &&
      formData.abuseDetected &&
      formData.abuseSanitizedText.trim().length > 0
        ? formData.abuseSanitizedText
        : formData.description;

    submitFormData.append("categoryId", formData.categoryId);
    submitFormData.append("assignedDepartment", formData.assignedDepartment);
    submitFormData.append("subCategory", formData.subCategory);
    submitFormData.append("description", moderatedDescription);
    submitFormData.append("urgency", formData.urgency);
    submitFormData.append("isPublic", String(formData.isPublic));
    submitFormData.append("isDuplicate", String(formData.isDuplicate));
    submitFormData.append("hasSimilarComplaints", String(formData.hasSimilarComplaints));

    if (typeof formData.qualityScore === "number") {
      submitFormData.append("qualityScore", String(formData.qualityScore));
    }

    if (formData.qualityBreakdown) {
      submitFormData.append("qualityBreakdown", JSON.stringify(formData.qualityBreakdown));
    }

    const similarComplaintIds = Array.from(
      new Set(formData.dedupMatches.map((match) => match.id).filter(Boolean))
    );
    if (similarComplaintIds.length > 0) {
      submitFormData.append("similarComplaintIds", JSON.stringify(similarComplaintIds));
    }

    if (formData.abuseStatus === "ready" && formData.abuseDetected) {
      submitFormData.append("AIabusedFlag", "true");
      submitFormData.append(
        "abuseMetadata",
        JSON.stringify({
          ...(formData.abuseMetadata || {}),
          clean_text: moderatedDescription,
          source: "review-step",
        })
      );
    }

    const locationData: {
      district: string;
      pin: string;
      city: string;
      locality: string;
      street?: string;
      latitude?: number;
      longitude?: number;
    } = {
      district: formData.district,
      pin: formData.pin,
      city: formData.city,
      locality: formData.locality,
      street: formData.street || undefined,
    };

    if (formData.latitude) {
      locationData.latitude = parseFloat(formData.latitude);
    }
    if (formData.longitude) {
      locationData.longitude = parseFloat(formData.longitude);
    }

    submitFormData.append("location", JSON.stringify(locationData));

    if (formData.photo) {
      submitFormData.append("image", formData.photo);
    }

    return submitFormData;
  };

  // Handle next step with validation
  const handleNext = () => {
    const { schema, data } = getStepValidationData(currentStep);
    const isValid = validateStep(currentStep, schema, data);
    if (isValid) {
      nextStep();
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validate step 4 (final check)
    const { schema, data } = getStepValidationData(3); // Re-validate step 3 before submit
    const isValid = validateStep(3, schema, data);
    if (!isValid) return;

    setIsSubmitting(true);
    setShowPopup(true);
    setSubmitStatus("loading");
    setSubmitMessage({
      title: "Submitting your complaint",
      description: "Please wait while we process your request...",
    });

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication required. Please login again.");
      }

      // Prepare FormData
      const submitFormData = buildSubmitFormData();

      const response = await fetch("/api/complaint/submit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: submitFormData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || "Failed to submit complaint");
      }

      // Success
      setSubmitStatus("success");
      setComplaintId(responseData.complaint?.id || responseData.id || null);
      setSubmitMessage({
        title: "Complaint Submitted Successfully!",
        description: `Your complaint has been registered${responseData.complaint?.id ? ` with ID: ${responseData.complaint.id.slice(0, 8)}...` : ""}. We'll review it shortly.`,
      });

      // Clear form after successful submission
      resetForm();
    } catch (error) {
      console.error("Submit error:", error);
      setSubmitStatus("error");
      setSubmitMessage({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle popup close
  const handlePopupClose = () => {
    setShowPopup(false);
    if (submitStatus === "success") {
      // Navigate to dashboard or complaint view
      if (complaintId) {
        router.push(`/dashboard?complaint=${complaintId}`);
      } else {
        router.push("/dashboard");
      }
    }
  };

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1CategoryWithAutofill
            formData={formData}
            touched={touched}
            errors={errors}
            updateField={updateField}
            setFieldTouched={setFieldTouched}
            setErrors={setErrors}
            setPhoto={setPhoto}
            useAutofill={useAutofill}
            onAutofillToggle={setUseAutofill}
          />
        );
      case 2:
        // Use AI autofill step if enabled
        return (
          <Step2DetailsAI
            formData={formData}
            touched={touched}
            errors={errors}
            updateField={updateField}
            setFieldTouched={setFieldTouched}
            setErrors={setErrors}
            setPhoto={setPhoto}
            onAnalysisStatusChange={setImageAnalysisStatus}
            onAnalysisComplete={(data: { category: string; subCategory: string; description: string }) => {
              console.log("AI Analysis complete:", data);
            }}
          />
        );
      case 3:
        return (
          <Step3Location
            formData={formData}
            touched={touched}
            errors={errors}
            updateField={updateField}
            setFieldTouched={setFieldTouched}
            setErrors={setErrors}
          />
        );
      case 4:
        return <Step4Review formData={formData} goToStep={goToStep} updateField={updateField} />;
      default:
        return null;
    }
  };

  // Check if current step has errors
  const hasStepErrors = Object.keys(errors).filter((k) => errors[k]).length > 0;
  
  // Check if Next button should be disabled
  // For autofill path on step 2, disable while analyzing
  const isNextDisabled = currentStep === 2 && useAutofill && imageAnalysisStatus === "analyzing";
  const isSubmitBlockedByQuality =
    currentStep === 4 &&
    formData.qualityStatus === "ready" &&
    typeof formData.qualityScore === "number" &&
    formData.qualityScore < 50;
  const isSubmitPendingQualityCheck =
    currentStep === 4 &&
    (formData.qualityStatus === "checking" || formData.abuseStatus === "checking");

  // Step labels for navigation
  const stepLabels = useAutofill
    ? ["Category", "AI Auto-Fill", "Location", "Review"]
    : ["Category", "Details", "Location", "Review"];

  return (
    <div className="min-h-screen bg-[#f9f9ff] py-10">
      <div className="py-8 sm:py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 tracking-tight">
              Register a Complaint
            </h1>
            <p className="text-gray-500 text-base max-w-xl mx-auto">
              Help us serve you better by providing accurate information
            </p>
          </motion.div>

          {/* Progress Steps */}
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <StepProgress steps={STEPS} currentStep={currentStep} />
          </motion.div>

          {/* Main Card */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Card Content */}
            <div className="p-6 sm:p-8">
              {/* Step Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  variants={stepContentVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="min-h-[400px]"
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>

              {/* Error Summary */}
              <AnimatePresence>
                {hasStepErrors && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6"
                  >
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-red-800">
                            Please fix the following errors:
                          </p>
                          <ul className="mt-2 text-sm text-red-600 space-y-1">
                            {(Object.values(errors) as string[]).filter(Boolean).map(
                              (error, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                                  {error}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  {currentStep === 1 ? (
                    <Button
                      variant="outline"
                      onClick={() => router.push("/dashboard")}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={prevStep}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Previous Step
                    </Button>
                  )}
                </div>

                {currentStep < 4 ? (
                  <Button
                    onClick={handleNext}
                    disabled={isNextDisabled}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 rounded-xl text-white shadow-md transition-all",
                      isNextDisabled
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-[#630ed4] hover:bg-[#5209b0]"
                    )}
                  >
                    {imageAnalysisStatus === "analyzing"
                      ? "Analyzing..."
                      : `Next: ${stepLabels[currentStep]} →`}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || isSubmitBlockedByQuality || isSubmitPendingQualityCheck}
                    className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all"
                  >
                    <Send className="h-4 w-4" />
                    {formData.abuseStatus === "checking"
                      ? "Moderation Check Running..."
                      : isSubmitPendingQualityCheck
                      ? "Quality Check Running..."
                      : isSubmitBlockedByQuality
                        ? "Improve Complaint to Submit"
                        : "Submit Complaint"}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Security Footer */}
          <motion.div
            className="mt-6 flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Lock className="h-3.5 w-3.5" />
              <span>Your information is encrypted and securely stored</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Loading/Status Popup */}
      <LoadingPopup
        isOpen={showPopup}
        status={submitStatus}
        message={submitMessage.title}
        subMessage={submitMessage.description}
        onClose={handlePopupClose}
      />
    </div>
  );
}
