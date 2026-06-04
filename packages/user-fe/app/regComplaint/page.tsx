"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useOfflineQueue } from "@/lib/offlineQueue/useOfflineQueue";
import {
  ArrowLeft,
  ArrowRight,
  Send,
  AlertCircle,
  FileWarning,
  Sparkles,
  Shield,
  ClipboardList,
  FileText,
  MapPin,
  Eye,
  CheckCircle,
  Landmark,
  Users,
  HelpCircle,
  MessageSquare,
  WifiOff,
  Cloud,
  CloudOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SwarajAIChat } from "@/components/swaraj-ai-chat";
import {
  useComplaintForm,
  Step1Category,
  Step2Details,
  Step3Location,
  Step4Review,
  LoadingPopup,
  step1Schema,
  step2Schema,
  step3Schema,
  type ImageValidationStatus,
} from "./customComps";

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
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
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 20,
    },
  },
};

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

const floatingIconVariants: Variants = {
  initial: { y: 0 },
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Step configuration with enhanced icons
const STEPS = [
  {
    id: 1,
    label: "Category",
    description: "Select department",
    icon: <ClipboardList className="h-5 w-5" />,
    gradient: "from-orange-500 to-amber-500",
    bgGlow: "bg-orange-500/20",
  },
  {
    id: 2,
    label: "Details",
    description: "Describe issue",
    icon: <FileText className="h-5 w-5" />,
    gradient: "from-blue-500 to-cyan-500",
    bgGlow: "bg-blue-500/20",
  },
  {
    id: 3,
    label: "Location",
    description: "Add address",
    icon: <MapPin className="h-5 w-5" />,
    gradient: "from-emerald-500 to-teal-500",
    bgGlow: "bg-emerald-500/20",
  },
  {
    id: 4,
    label: "Review",
    description: "Confirm & submit",
    icon: <Eye className="h-5 w-5" />,
    gradient: "from-purple-500 to-pink-500",
    bgGlow: "bg-purple-500/20",
  },
];

// Floating background icons
const FLOATING_ICONS = [
  { icon: <Landmark className="w-8 h-8" />, x: -350, y: -200, delay: 0, color: "text-orange-300" },
  { icon: <Shield className="w-7 h-7" />, x: 350, y: -180, delay: 0.5, color: "text-blue-300" },
  { icon: <Users className="w-6 h-6" />, x: -380, y: 100, delay: 1, color: "text-emerald-300" },
  { icon: <HelpCircle className="w-7 h-7" />, x: 380, y: 120, delay: 1.5, color: "text-purple-300" },
  { icon: <MessageSquare className="w-6 h-6" />, x: -300, y: -50, delay: 2, color: "text-amber-300" },
  { icon: <Sparkles className="w-5 h-5" />, x: 300, y: -30, delay: 2.5, color: "text-pink-300" },
];

// Enhanced Step Progress Component
function EnhancedStepProgress({
  steps,
  currentStep,
}: {
  steps: typeof STEPS;
  currentStep: number;
}) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative flex justify-between items-center">
        {/* Background line */}
        <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200 rounded-full -z-10" />
        
        {/* Progress line */}
        <motion.div
          className="absolute top-6 left-0 h-1 bg-linear-to-r from-orange-500 via-blue-500 to-emerald-500 rounded-full -z-10"
          initial={{ width: "0%" }}
          animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />

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
              {/* Glow effect for current step */}
              {isCurrent && (
                <motion.div
                  className={cn("absolute w-16 h-16 rounded-full blur-xl", step.bgGlow)}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 0.6 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                />
              )}

              {/* Step Circle */}
              <motion.div
                className={cn(
                  "relative w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 shadow-lg",
                  isCompleted && "bg-linear-to-br from-green-400 to-emerald-500 text-white",
                  isCurrent &&
                    `bg-linear-to-br ${step.gradient} text-white ring-4 ring-white shadow-xl`,
                  isUpcoming && "bg-white text-gray-400 border-2 border-gray-200"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <CheckCircle className="h-6 w-6" />
                  </motion.div>
                ) : (
                  step.icon
                )}
              </motion.div>

              {/* Step Label */}
              <motion.div
                className="mt-3 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <p
                  className={cn(
                    "text-sm font-semibold transition-colors",
                    isCompleted && "text-emerald-600",
                    isCurrent && "text-gray-900",
                    isUpcoming && "text-gray-400"
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                  {step.description}
                </p>
              </motion.div>
            </motion.div>
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

  // Toast notification state
  const [notification, setNotification] = useState<{
    show: boolean;
    title: string;
    description: string;
    variant: "default" | "destructive" | "success";
  } | null>(null);

  // Show notification helper
  const showNotification = (title: string, description: string, variant: "default" | "destructive" | "success" = "default") => {
    setNotification({ show: true, title, description, variant });
    // Auto-hide after 5 seconds
    setTimeout(() => setNotification(null), 5000);
  };

  // Offline queue hook for handling submissions
  const {
    queueCount,
    online,
    isSyncing,
    manualSync,
  } = useOfflineQueue({
    autoSync: true,
    onSyncStart: () => {
      // If popup is showing queued-offline state, keep it showing
      if (showPopup && submitStatus === "queued-offline") {
        // Update message to show syncing in progress
        setSubmitMessage({
          title: "Syncing Your Complaint",
          description: "Your complaint is being submitted to the server...",
        });
      } else {
        showNotification("Syncing queued complaints", "Your queued complaints are being submitted...", "default");
      }
    },
    onSyncComplete: (result) => {
      // If popup is showing queued-offline state and sync succeeded, update to synced state
      if (showPopup && submitStatus === "queued-offline" && result.successCount > 0) {
        setSubmitStatus("synced");
        setSubmitMessage({
          title: "Complaint Submitted!",
          description: "Your complaint has been successfully synced and submitted.",
        });
        setWasQueuedOffline(false); // No longer offline queued
        setPendingOfflineId(null);
      } else if (result.successCount > 0) {
        showNotification("Sync Complete", `${result.successCount} complaint(s) submitted successfully!`, "success");
      }
      
      if (result.failedCount > 0) {
        if (showPopup && submitStatus === "queued-offline") {
          // Keep showing the queued-offline state if sync failed
          setSubmitMessage({
            title: "Complaint Saved Offline",
            description: "Sync failed. Will retry when connection is stable.",
          });
        } else {
          showNotification("Some complaints failed", `${result.failedCount} complaint(s) couldn't be submitted. They'll retry automatically.`, "destructive");
        }
      }
    },
    onSyncError: (error) => {
      if (showPopup && submitStatus === "queued-offline") {
        // Keep showing queued-offline state on error
        setSubmitMessage({
          title: "Complaint Saved Offline",
          description: "Sync error occurred. Will retry automatically.",
        });
      } else {
        showNotification("Sync Error", error.message, "destructive");
      }
    },
    onQueued: (id) => {
      console.log("[RegisterComplaint] Complaint queued with ID:", id);
      setPendingOfflineId(id);
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | "queued-offline" | "synced">("loading");
  const [submitMessage, setSubmitMessage] = useState({ title: "", description: "" });
  const [showPopup, setShowPopup] = useState(false);
  const [complaintId, setComplaintId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [imageValidationStatus, setImageValidationStatus] = useState<ImageValidationStatus>("idle");
  const [wasQueuedOffline, setWasQueuedOffline] = useState(false);
  const [pendingOfflineId, setPendingOfflineId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Handle next step with validation
  const handleNext = () => {
    const { schema, data } = getStepValidationData(currentStep);
    const isValid = validateStep(currentStep, schema, data);
    if (isValid) {
      nextStep();
    }
  };

  // Handle form submission with offline queue support
  const handleSubmit = async () => {
    // Validate step 4 (final check)
    const { schema, data } = getStepValidationData(3); // Re-validate step 3 before submit
    const isValid = validateStep(3, schema, data);
    if (!isValid) return;

    setIsSubmitting(true);
    setShowPopup(true);
    setWasQueuedOffline(false);
    setPendingOfflineId(null);

    // Check if we're offline - queue immediately if so
    if (!online) {
      setSubmitStatus("loading");
      setSubmitMessage({
        title: "You're offline",
        description: "Saving your complaint locally...",
      });

      try {
        // Import queueComplaint dynamically to avoid SSR issues
        const { queueComplaint } = await import("@/lib/offlineQueue");
        const result = await queueComplaint(formData);

        if (result.success) {
          setSubmitStatus("queued-offline");
          setWasQueuedOffline(true);
          setPendingOfflineId(result.queuedId || null);
          setSubmitMessage({
            title: "Complaint Saved Offline!",
            description: "Your complaint will be automatically submitted when you're back online.",
          });
          resetForm();
        } else {
          throw new Error(result.error || "Failed to save complaint offline");
        }
      } catch (error) {
        console.error("Offline queue error:", error);
        setSubmitStatus("error");
        setSubmitMessage({
          title: "Failed to Save",
          description: error instanceof Error ? error.message : "Could not save your complaint. Please try again.",
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Online submission
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
      const submitFormData = new FormData();
      submitFormData.append("categoryId", formData.categoryId);
      submitFormData.append("assignedDepartment", formData.assignedDepartment);
      submitFormData.append("subCategory", formData.subCategory);
      submitFormData.append("description", formData.description);
      submitFormData.append("urgency", formData.urgency);
      submitFormData.append("isPublic", String(formData.isPublic));

      // Build location object as expected by backend
      const locationData: {
        district: string;
        pin: string;
        city: string;
        locality: string;
        latitude?: number;
        longitude?: number;
      } = {
        district: formData.district,
        pin: formData.pin,
        city: formData.city,
        locality: formData.locality,
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
      
      // If online submission fails, try to queue it offline
      try {
        console.log("[RegisterComplaint] Online submission failed, attempting to queue offline...");
        const { queueComplaint } = await import("@/lib/offlineQueue");
        const queueResult = await queueComplaint(formData);
        
        if (queueResult.success) {
          setSubmitStatus("queued-offline");
          setWasQueuedOffline(true);
          setPendingOfflineId(queueResult.queuedId || null);
          setSubmitMessage({
            title: "Complaint Saved for Later",
            description: "We couldn't submit right now, but your complaint has been saved and will be submitted automatically.",
          });
          resetForm();
        } else {
          throw error; // Use original error
        }
      } catch (queueError) {
        setSubmitStatus("error");
        setSubmitMessage({
          title: "Submission Failed",
          description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle popup close
  const handlePopupClose = () => {
    // Don't allow closing while in queued-offline state (waiting for sync)
    if (submitStatus === "queued-offline") {
      return; // Prevent closing - user must wait for sync
    }
    
    setShowPopup(false);
    if (submitStatus === "success" || submitStatus === "synced") {
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
          <Step1Category
            formData={formData}
            touched={touched}
            errors={errors}
            updateField={updateField}
            setFieldTouched={setFieldTouched}
            setErrors={setErrors}
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
          />
        );
      case 4:
        return <Step4Review formData={formData} goToStep={goToStep} />;
      default:
        return null;
    }
  };

  // Check if current step has errors
  const hasStepErrors = Object.keys(errors).filter((k) => errors[k]).length > 0;
  const currentStepConfig = STEPS[currentStep - 1];
  
  // Check if Next button should be disabled (validation in progress or invalid image on step 2)
  const isNextDisabled = currentStep === 2 && (
    imageValidationStatus === "validating" || 
    imageValidationStatus === "invalid" ||
    imageValidationStatus === "error"
  );

  return (
    <div className="min-h-screen relative overflow-hidden bg-linear-to-b from-slate-50 via-white to-slate-100 py-10">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-linear-to-r from-orange-100/20 via-transparent to-blue-100/20 rounded-full blur-3xl" />
      </div>

      {/* Floating Background Icons */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {FLOATING_ICONS.map((item, index) => (
          <motion.div
            key={index}
            className={cn(
              "absolute opacity-20",
              item.color,
              mounted ? "opacity-20" : "opacity-0"
            )}
            style={{
              transform: `translate(${item.x}px, ${item.y}px)`,
            }}
            variants={floatingIconVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: item.delay }}
          >
            {item.icon}
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 py-8 sm:py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-10"
            initial="hidden"
            animate="visible"
            variants={headerVariants}
          >
            {/* Connection Status & Queue Indicator */}
            <div className="flex justify-center gap-2 mb-4">
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-orange-100 to-amber-100 text-orange-700 text-sm font-medium"
                whileHover={{ scale: 1.05 }}
              >
                <Sparkles className="w-4 h-4" />
                AI-Powered Complaint System
              </motion.div>
              
              {/* Offline/Online Status */}
              <motion.div
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors",
                  online 
                    ? "bg-green-100 text-green-700" 
                    : "bg-amber-100 text-amber-700"
                )}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {online ? (
                  <>
                    <Cloud className="w-4 h-4" />
                    <span className="hidden sm:inline">Online</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="w-4 h-4" />
                    <span className="hidden sm:inline">Offline</span>
                  </>
                )}
              </motion.div>

              {/* Queued Complaints Badge */}
              {queueCount > 0 && (
                <motion.div
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium cursor-pointer"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => {
                    if (online && !isSyncing) {
                      manualSync();
                    }
                  }}
                  title={online ? "Click to sync now" : "Will sync when online"}
                >
                  <WifiOff className="w-4 h-4" />
                  {queueCount} pending
                  {isSyncing && (
                    <motion.div
                      className="w-3 h-3 border-2 border-blue-700 border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                </motion.div>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
              Register a Complaint
            </h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Help us serve you better by providing accurate information about your concern
            </p>
          </motion.div>

          {/* Progress Steps */}
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <EnhancedStepProgress steps={STEPS} currentStep={currentStep} />
          </motion.div>

          {/* Main Card */}
          <motion.div
            className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
          >
            {/* Card Header */}
            <div
              className={cn(
                "relative px-6 sm:px-8 py-6 bg-linear-to-r text-white overflow-hidden",
                currentStepConfig.gradient
              )}
            >
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
              </div>

              <div className="relative z-10">
                <motion.div
                  className="flex items-center gap-3"
                  key={currentStep}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    {currentStepConfig.icon}
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">
                      Step {currentStep}: {currentStepConfig.label}
                    </h2>
                    <p className="text-white/80 text-sm mt-0.5">
                      {currentStepConfig.description}
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>

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
                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                      <div className="flex items-start gap-3">
                        <div className="p-1 bg-red-100 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        </div>
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
              <motion.div
                className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-gray-100"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className={cn(
                      "flex items-center gap-2 px-6 py-5 rounded-xl border-2 transition-all",
                      currentStep === 1 ? "invisible" : "hover:bg-gray-50 hover:border-gray-300"
                    )}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </Button>
                </motion.div>

                <div className="flex items-center gap-2 text-sm text-gray-500 order-first sm:order-0">
                  <FileWarning className="h-4 w-4" />
                  <span className="hidden sm:inline">All fields marked with * are required</span>
                  <span className="sm:hidden">* Required fields</span>
                </div>

                {currentStep < 4 ? (
                  <motion.div whileHover={{ scale: isNextDisabled ? 1 : 1.02 }} whileTap={{ scale: isNextDisabled ? 1 : 0.98 }}>
                    <Button
                      onClick={handleNext}
                      disabled={isNextDisabled}
                      className={cn(
                        "flex items-center gap-2 px-8 py-5 rounded-xl text-white shadow-lg transition-all bg-linear-to-r",
                        currentStepConfig.gradient,
                        isNextDisabled 
                          ? "opacity-50 cursor-not-allowed grayscale" 
                          : "hover:shadow-xl hover:brightness-110"
                      )}
                    >
                      {imageValidationStatus === "validating" 
                        ? "Validating..." 
                        : imageValidationStatus === "invalid" 
                          ? "Invalid Image" 
                          : "Next"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative"
                  >
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-8 py-5 rounded-xl bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all"
                    >
                      <Send className="h-4 w-4" />
                      Submit Complaint
                    </Button>
                    {/* Pulse animation for submit button */}
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-linear-to-r from-green-500 to-emerald-500 -z-10"
                      animate={{
                        scale: [1, 1.05, 1],
                        opacity: [0.5, 0, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </motion.div>
                )}
              </motion.div>
            </div>
          </motion.div>

          {/* Help Text */}
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-sm text-gray-500">
              Need help? Contact our support team at{" "}
              <a
                href="mailto:support@swarajdesk.gov.in"
                className="text-orange-600 hover:text-orange-700 font-medium hover:underline transition-colors"
              >
                support@swarajdesk.gov.in
              </a>
            </p>
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

      {/* AI Chatbot */}
      <SwarajAIChat />

      {/* Toast Notification */}
      <AnimatePresence>
        {notification && notification.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className={cn(
              "fixed bottom-6 left-1/2 z-50 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm max-w-md",
              notification.variant === "destructive" && "bg-red-50/90 border-red-200 text-red-800",
              notification.variant === "success" && "bg-green-50/90 border-green-200 text-green-800",
              notification.variant === "default" && "bg-white/90 border-gray-200 text-gray-800"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-1 rounded-lg",
                notification.variant === "destructive" && "bg-red-100",
                notification.variant === "success" && "bg-green-100",
                notification.variant === "default" && "bg-blue-100"
              )}>
                {notification.variant === "destructive" ? (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                ) : notification.variant === "success" ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Cloud className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{notification.title}</p>
                <p className="text-xs opacity-80 mt-0.5">{notification.description}</p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
