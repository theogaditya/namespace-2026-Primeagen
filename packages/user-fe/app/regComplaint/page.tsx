"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Send,
  AlertCircle,
  Shield,
  ClipboardList,
  FileText,
  MapPin,
  Eye,
  CheckCircle,
  Brain,
  WifiOff,
  Loader2,
  Clock,
  XCircle,
  Lock,
  Square,
  MapPinOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNetwork } from "@/hooks/useNetwork";
import { normalizeDistrictName } from "@/lib/location/normalizeDistrict";
import {
  useComplaintForm,
  Step2Details,
  Step3Location,
  Step4Review,
  LoadingPopup,
  LocationPermissionModal,
  useAutoFillSequence,
  step1Schema,
  step2Schema,
  step3Schema,
  type ImageValidationStatus,
  type AIResult,
  type AutoFillPhase,
  type DraftLocation,
  type ComplaintFormField,
} from "./customComps";
import {
  Step1CategoryWithAutofill,
} from "./autofillpath";

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

// Step configuration - Standard path
const STEPS_STANDARD = [
  { id: 1, label: "CATEGORY" },
  { id: 2, label: "DETAILS" },
  { id: 3, label: "LOCATION" },
  { id: 4, label: "REVIEW" },
];

// Step configuration - Autofill path (same labels — AI fills them automatically)
const STEPS_AUTOFILL = [
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
  steps: typeof STEPS_STANDARD;
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
              {/* Circle */}
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

              {/* Label */}
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

export default function RegisterComplaintPage() {
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
  const [imageValidationStatus, setImageValidationStatus] = useState<ImageValidationStatus>("idle");

  // Autofill mode state
  const [useAutofill, setUseAutofill] = useState(false);
  const [autoFillState, setAutoFillState] = useState<
    "idle" | "location-permission" | "uploading" | "analyzing" | "filling" | "done"
  >("idle");
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingDraft, setPendingDraft] = useState<{ aiResult: AIResult; draftLoc: DraftLocation } | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string; assignedDepartment: string }[]>([]);
  const [operatingDistricts, setOperatingDistricts] = useState<{ id: string; name: string }[]>([]);
  const [unserviceableLocation, setUnserviceableLocation] = useState<{ detectedDistrict: string; availableDistricts: string[] } | null>(null);

  // Network state from unified hook (works in both browser and Capacitor)
  const { isOnline } = useNetwork();

  // Offline sync state
  const [showOfflineSync, setShowOfflineSync] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"waiting" | "syncing" | "success" | "error">("waiting");
  const [pendingSubmitData, setPendingSubmitData] = useState<FormData | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Get the appropriate steps based on autofill mode
  const STEPS = useAutofill ? STEPS_AUTOFILL : STEPS_STANDARD;

  // Auto-fill sequence hook
  const autoFill = useAutoFillSequence({
    updateField: (field, value) =>
      updateField(field as ComplaintFormField, value as never),
    setCurrentStep: goToStep,
    goToStep,
    categories,
    operatingDistricts,
  });

  const isAutoFilling = autoFillState === "filling";

  // Fetch categories + districts for auto-fill (needed for matching)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, distRes] = await Promise.all([
          fetch("/api/complaint/categories"),
          fetch("/api/complaint/districts"),
        ]);
        const catData = await catRes.json();
        const distData = await distRes.json();
        if (catData.success && catData.data) setCategories(catData.data);
        if (distData.success && distData.data) setOperatingDistricts(distData.data);
      } catch (err) {
        console.error("Error fetching auto-fill data:", err);
      }
    };
    fetchData();
  }, []);

  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/loginUser?redirect=/regComplaint");
    }
  }, [router]);

  // Auto-fill from AI complaint draft (stored by DashboardAIChatHub)
  useEffect(() => {
    if (categories.length === 0 || operatingDistricts.length === 0) return;

    const draftStr = localStorage.getItem("complaintDraft");
    if (!draftStr) return;

    try {
      const draft = JSON.parse(draftStr);
      localStorage.removeItem("complaintDraft");

      const aiResult: AIResult = {
        category: draft.category || "",
        subCategory: draft.subCategory || "",
        complaint: draft.description || "",
        urgency: draft.urgency || "MEDIUM",
      };

      const draftLoc: DraftLocation = {
        district:
          typeof draft.district === "string"
            ? normalizeDistrictName(draft.district)
            : undefined,
        city: draft.city,
        pin: draft.pin,
        locality: draft.locality,
      };

      setPendingDraft({ aiResult, draftLoc });
      setUseAutofill(true);
      setAutoFillState("location-permission");
    } catch (err) {
      console.error("[regComplaint] Failed to parse complaint draft:", err);
      localStorage.removeItem("complaintDraft");
    }
  }, [categories, operatingDistricts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-submit when connection is restored
  useEffect(() => {
    if (isOnline && pendingSubmitData && syncStatus === "waiting") {
      submitComplaintWithData(pendingSubmitData);
    }
  }, [isOnline, pendingSubmitData, syncStatus]);

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

  // --- AI Quick Fill Flow Handlers ---

  // Called when user clicks the AI box → show location permission
  const handleAutofillToggle = useCallback((value: boolean) => {
    setUseAutofill(value);
    if (value) {
      setAutoFillState("location-permission");
    }
  }, []);

  // Called when location permission is resolved
  const handleLocationResult = useCallback((coords: { lat: number; lng: number } | null) => {
    setUserLocation(coords);
    if (pendingDraft) {
      // Neural Core flow: we already have the AI draft, skip image upload and start filling
      setAutoFillState("filling");
      autoFill.run(pendingDraft.aiResult, coords, pendingDraft.draftLoc).then(() => {
        setAutoFillState("done");
      });
      setPendingDraft(null);
    } else {
      // Quick Fill flow: now waiting for image upload
      setAutoFillState("uploading");
    }
  }, [pendingDraft, autoFill]);

  // Called when AI image upload starts
  const handleAIUploadStart = useCallback(() => {
    setAutoFillState("analyzing");
  }, []);

  // Called when AI analysis completes — start the auto-fill animation
  const handleAIAnalysisComplete = useCallback(
    (data: { category: string; subCategory: string; complaint: string; urgency: string }) => {
      const result: AIResult = data;
      setAiResult(result);
      setAutoFillState("filling");
      // Start the orchestrated auto-fill sequence
      autoFill.run(result, userLocation).then(() => {
        setAutoFillState("done");
      });
    },
    [autoFill, userLocation]
  );

  // Called when AI analysis fails
  const handleAIAnalysisError = useCallback(() => {
    setAutoFillState("idle");
    // User can select category manually
  }, []);

  // Stop auto-fill
  const handleStopAutoFill = useCallback(() => {
    autoFill.stop();
    setAutoFillState("done");
  }, [autoFill]);

  // Handle next step with validation
  const handleNext = () => {
    const { schema, data } = getStepValidationData(currentStep);
    const isValid = validateStep(currentStep, schema, data);
    if (isValid) {
      nextStep();
    }
  };

  // Submit complaint with prepared FormData
  const submitComplaintWithData = async (submitFormData: FormData) => {
    setSyncStatus("syncing");
    setRetryCount((prev) => prev + 1);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication required. Please login again.");
      }

      console.log("[submitComplaintWithData] Attempting to submit...");
      const response = await fetch("/api/complaint/submit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: submitFormData,
      });

      console.log("[submitComplaintWithData] Response status:", response.status);

      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error("[submitComplaintWithData] Failed to parse response:", parseError);
        throw new Error(`Server returned invalid response (status: ${response.status})`);
      }

      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || `Failed to submit complaint (status: ${response.status})`);
      }

      // Success
      setSyncStatus("success");
      setComplaintId(responseData.complaint?.id || responseData.id || null);

      // Close offline sync modal after short delay
      setTimeout(() => {
        setShowOfflineSync(false);
        setPendingSubmitData(null);
        setShowPopup(true);
        setSubmitStatus("success");
        setSubmitMessage({
          title: "Complaint Submitted Successfully!",
          description: `Your complaint has been registered${responseData.complaint?.id ? ` with ID: ${responseData.complaint.id.slice(0, 8)}...` : ""}. We'll review it shortly.`,
        });
        resetForm();
      }, 2000);
    } catch (error) {
      console.error("Submit error:", error);
      setSyncStatus("error");

      // If still online, retry after a delay
      if (isOnline) {
        setTimeout(() => {
          setSyncStatus("waiting");
          submitComplaintWithData(submitFormData);
        }, 3000);
      } else {
        setSyncStatus("waiting");
      }
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validate step 4 (final check)
    const { schema, data } = getStepValidationData(3); // Re-validate step 3 before submit
    const isValid = validateStep(3, schema, data);
    if (!isValid) return;

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication required. Please login again.");
      }

      // Prepare FormData
      const submitFormData = buildSubmitFormData();

      // Check if online (using unified network hook)
      if (!isOnline) {
        // Store data and show offline sync modal
        setPendingSubmitData(submitFormData);
        setShowOfflineSync(true);
        setSyncStatus("waiting");
        setIsSubmitting(false);
        return;
      }

      // If online, show loading popup and submit
      setShowPopup(true);
      setSubmitStatus("loading");
      setSubmitMessage({
        title: "Submitting your complaint",
        description: "Please wait while we process your request...",
      });

      console.log("[handleSubmit] Attempting to submit, isOnline:", isOnline);
      const response = await fetch("/api/complaint/submit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: submitFormData,
      });

      console.log("[handleSubmit] Response status:", response.status);

      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error("[handleSubmit] Failed to parse response:", parseError);
        throw new Error(`Server returned invalid response (status: ${response.status})`);
      }

      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || `Failed to submit complaint (status: ${response.status})`);
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
      console.error("[handleSubmit] Submit error:", error);

      // Check if it's a network error (fetch failed)
      const isNetworkError = error instanceof TypeError && error.message.includes('fetch');

      setShowPopup(true);
      setSubmitStatus("error");
      setSubmitMessage({
        title: "Submission Failed",
        description: isNetworkError
          ? "Network error. Please check your internet connection and try again."
          : (error instanceof Error ? error.message : "An unexpected error occurred. Please try again."),
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
            onAutofillToggle={handleAutofillToggle}
            onAIUploadStart={handleAIUploadStart}
            onAIAnalysisComplete={handleAIAnalysisComplete}
            onAIAnalysisError={handleAIAnalysisError}
            highlightedCategory={autoFill.highlightedCategory}
            isAutoFilling={isAutoFilling}
            autoFillPhase={autoFill.phase}
          />
        );
      case 2:
        return (
          <Step2Details
            formData={formData}
            touched={touched}
            errors={errors}
            updateField={updateField}
            setFieldTouched={setFieldTouched}
            setErrors={setErrors}
            setPhoto={setPhoto}
            onValidationStatusChange={setImageValidationStatus}
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
            onUnserviceableLocation={(detected, available) => {
              setUnserviceableLocation({ detectedDistrict: detected, availableDistricts: available });
            }}
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
  // Disable during auto-fill or while image validation is in progress
  const isNextDisabled = isAutoFilling || (currentStep === 2 && (
    imageValidationStatus === "validating" ||
    imageValidationStatus === "invalid" ||
    imageValidationStatus === "error"
  ));
  const isSubmitBlockedByQuality =
    currentStep === 4 &&
    formData.qualityStatus === "ready" &&
    typeof formData.qualityScore === "number" &&
    formData.qualityScore < 50;
  const isSubmitPendingQualityCheck =
    currentStep === 4 &&
    (formData.qualityStatus === "checking" || formData.abuseStatus === "checking");

  // Get next step label for button text
  const getNextStepLabel = () => {
    if (currentStep >= 4) return "";
    const next = STEPS[currentStep]; // currentStep is 1-indexed, so STEPS[currentStep] is the next
    return next ? next.label.charAt(0) + next.label.slice(1).toLowerCase() : "Next";
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] py-10">
      <div className="py-8 sm:py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 tracking-tight">
              Register a Complaint
            </h1>
            <p className="text-gray-500 text-base max-w-2xl mx-auto">
              Help us serve you better by providing accurate information about your concern
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <StepProgress steps={STEPS} currentStep={currentStep} />
          </div>

          {/* Main Card */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Card Content */}
            <div className="p-6 sm:p-8">
              {/* Step Content with AnimatePresence */}
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

              {/* Error Summary (if any) */}
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
                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-red-800">
                            Please fix the following errors:
                          </p>
                          <ul className="mt-2 text-sm text-red-600 space-y-1">
                            {Object.values(errors).map(
                              (error, idx) =>
                                error && (
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

              {/* Navigation Buttons */}
              <div className={cn(
                "flex justify-between items-center mt-8 pt-6 border-t border-gray-100",
                isAutoFilling && "opacity-50 pointer-events-none"
              )}>
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous Step
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                )}

                {currentStep < 4 ? (
                  <Button
                    onClick={handleNext}
                    disabled={isNextDisabled}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 rounded-full text-white transition-all",
                      "bg-[#630ed4] hover:bg-[#5108b8]",
                      isNextDisabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {imageValidationStatus === "validating"
                      ? "Validating..."
                      : imageValidationStatus === "invalid"
                        ? "Invalid Image"
                        : `Next: ${getNextStepLabel()}`}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || isSubmitBlockedByQuality || isSubmitPendingQualityCheck}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition-all"
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

            {/* Security Footer */}
            <div className="px-6 sm:px-8 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <Lock className="h-3.5 w-3.5" />
                <span>Secure blockchain entry. Your privacy is our priority.</span>
              </div>
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

      {/* Location Permission Modal */}
      <LocationPermissionModal
        isOpen={autoFillState === "location-permission"}
        onResult={handleLocationResult}
      />

      {/* Unserviceable Location Popup — shown for both auto-fill and manual fill */}
      <AnimatePresence>
        {(autoFill.unserviceableInfo || unserviceableLocation) && (() => {
          const info = autoFill.unserviceableInfo || unserviceableLocation!;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden max-w-md w-full"
              >
                {/* Header */}
                <div className="bg-linear-to-r from-red-500 to-orange-500 px-6 py-4 flex items-center gap-3">
                  <MapPinOff className="h-6 w-6 text-white" />
                  <h3 className="text-white font-bold text-lg">Location Not Serviceable</h3>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                  <p className="text-gray-700">
                    Your detected location{" "}
                    <span className="font-semibold text-red-600">
                      &quot;{info.detectedDistrict}&quot;
                    </span>{" "}
                    is not in our list of operating districts.
                  </p>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-amber-800 mb-2">
                      Please select one of our operating districts:
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-auto">
                      {info.availableDistricts.map((d) => (
                        <span
                          key={d}
                          className="inline-block px-2.5 py-1 text-xs font-medium bg-white border border-amber-300 rounded-full text-amber-800"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      autoFill.dismissUnserviceable();
                      setUnserviceableLocation(null);
                      setAutoFillState("done");
                      // Clear the invalid district so user can pick a valid one
                      updateField("district", "");
                    }}
                    className="w-full bg-[#630ed4] hover:bg-[#5108b8] text-white rounded-xl"
                  >
                    OK, I&apos;ll select a valid district
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Auto-Fill Overlay */}
      <AnimatePresence>
        {isAutoFilling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <motion.div
              initial={{ y: 20, scale: 0.9 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.9 }}
              className="flex items-center gap-3 px-5 py-3 rounded-full bg-[#630ed4] text-white shadow-2xl border border-[#630ed4]/50"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Brain className="h-5 w-5" />
              </motion.div>
              <span className="text-sm font-medium">
                {autoFill.phase === "category" && "Selecting category..."}
                {autoFill.phase === "details" && "Filling complaint details..."}
                {autoFill.phase === "location" && (autoFill.locationStatus || "Filling location...")}
                {autoFill.phase === "review" && "Almost done..."}
              </span>
              <button
                type="button"
                onClick={handleStopAutoFill}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                title="Stop auto-fill"
              >
                <Square className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Sync Modal */}
      <AnimatePresence>
        {showOfflineSync && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="bg-white rounded-2xl shadow-2xl border-2 border-slate-200 overflow-hidden max-w-md w-full"
            >
              {/* Header */}
              <div className="bg-linear-to-r from-blue-500 to-indigo-500 px-6 py-4">
                <h3 className="text-white font-bold text-xl">Complaint Submission</h3>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Status Display */}
                <div className="flex flex-col items-center justify-center space-y-4">
                  <AnimatePresence mode="wait">
                    {syncStatus === "waiting" && (
                      <motion.div
                        key="waiting"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex flex-col items-center gap-4"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="p-4 bg-amber-100 rounded-full"
                        >
                          <Clock className="h-12 w-12 text-amber-600" />
                        </motion.div>
                        <div className="text-center">
                          <h4 className="text-xl font-semibold text-slate-800">Waiting for Connection</h4>
                          <p className="text-slate-500 mt-2">Your complaint will be submitted once internet is available</p>
                          <div className="mt-3 flex items-center justify-center gap-2 text-red-600">
                            <WifiOff className="h-4 w-4" />
                            <span className="text-sm font-medium">No Internet Connection</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {syncStatus === "syncing" && (
                      <motion.div
                        key="syncing"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex flex-col items-center gap-4"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="p-4 bg-blue-100 rounded-full"
                        >
                          <Loader2 className="h-12 w-12 text-blue-600" />
                        </motion.div>
                        <div className="text-center">
                          <h4 className="text-xl font-semibold text-slate-800">Syncing Complaint</h4>
                          <p className="text-slate-500 mt-2">Please wait while we submit your complaint...</p>
                          <p className="text-xs text-slate-400 mt-1">Attempt {retryCount}</p>
                        </div>
                      </motion.div>
                    )}

                    {syncStatus === "success" && (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex flex-col items-center gap-4"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          className="p-4 bg-green-100 rounded-full"
                        >
                          <CheckCircle className="h-12 w-12 text-green-600" />
                        </motion.div>
                        <div className="text-center">
                          <h4 className="text-xl font-semibold text-green-800">Success!</h4>
                          <p className="text-slate-500 mt-2">Your complaint has been submitted successfully</p>
                        </div>
                      </motion.div>
                    )}

                    {syncStatus === "error" && (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex flex-col items-center gap-4"
                      >
                        <motion.div
                          animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                          transition={{ duration: 0.5 }}
                          className="p-4 bg-red-100 rounded-full"
                        >
                          <XCircle className="h-12 w-12 text-red-600" />
                        </motion.div>
                        <div className="text-center">
                          <h4 className="text-xl font-semibold text-red-800">Submission Failed</h4>
                          <p className="text-slate-500 mt-2">Retrying automatically...</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Skeleton Pulse Animation - shown during waiting/syncing */}
                {(syncStatus === "waiting" || syncStatus === "syncing") && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        animate={{
                          opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                        className="h-4 bg-slate-200 rounded-full"
                        style={{ width: `${100 - i * 15}%` }}
                      />
                    ))}
                  </motion.div>
                )}

                {/* Info Message */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> This window will automatically close once your complaint is successfully submitted. Please keep it open.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
