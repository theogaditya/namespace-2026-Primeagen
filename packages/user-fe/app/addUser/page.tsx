"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  StepProgress,
  Step1PersonalInfo,
  Step2Identity,
  Step3Location,
  Step4Password,
  useSignupForm,
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  LoadingPopup,
} from "./custom-comp";
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, UserPlus } from "lucide-react";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";

const steps = [
  { id: 1, label: "Personal", description: "Basic info" },
  { id: 2, label: "Identity", description: "Verification" },
  { id: 3, label: "Location", description: "Address" },
  { id: 4, label: "Security", description: "Password" },
];

export default function AddUser() {
  const {
    formData,
    touched,
    errors,
    currentStep,
    isLoaded,
    updateField,
    setFieldTouched,
    validateStep,
    nextStep,
    prevStep,
    resetForm,
    setErrors,
  } = useSignupForm();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleNext = () => {
    let isValid = false;

    switch (currentStep) {
      case 1:
        isValid = validateStep(1, step1Schema, {
          name: formData.name,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          dateOfBirth: formData.dateOfBirth,
        });
        break;
      case 2:
        isValid = validateStep(2, step2Schema, {
          aadhaarId: formData.aadhaarId,
          preferredLanguage: formData.preferredLanguage,
          disability: formData.disability,
        });
        break;
      case 3:
        isValid = validateStep(3, step3Schema, {
          pin: formData.pin,
          district: formData.district,
          city: formData.city,
          state: formData.state,
          locality: formData.locality,
          street: formData.street,
          municipal: formData.municipal,
        });
        break;
      case 4:
        isValid = validateStep(4, step4Schema, {
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        });
        break;
    }

    if (isValid) {
      if (currentStep === 4) {
        handleSubmit();
      } else {
        nextStep();
      }
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      name: formData.name,
      password: formData.password,
      dateOfBirth: formData.dateOfBirth,
      aadhaarId: formData.aadhaarId,
      preferredLanguage: formData.preferredLanguage,
      disability: formData.disability || undefined,
      location: {
        pin: formData.pin,
        district: formData.district,
        city: formData.city,
        locality: formData.locality,
        street: formData.street || undefined,
        municipal: formData.municipal,
        state: formData.state,
      },
    };

    try {
      const response = await fetch("http://localhost:3000/api/users/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitSuccess(true);
        resetForm();
      } else {
        setSubmitError(data.message || "Failed to create account. Please try again.");
      }
    } catch (error) {
      console.error("Signup error:", error);
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while form data loads from localStorage
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Success state
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="pt-10 pb-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Account Created Successfully!
            </h2>
            <p className="text-gray-500 mb-8">
              Welcome aboard! Your account has been created. You can now log in to access our services.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => window.location.href = "/loginUser"}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Go to Login
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitSuccess(false);
                }}
                className="w-full"
              >
                Create Another Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1PersonalInfo
            formData={{
              name: formData.name,
              email: formData.email,
              phoneNumber: formData.phoneNumber,
              dateOfBirth: formData.dateOfBirth,
            }}
            touched={touched}
            errors={errors}
            updateField={updateField}
            setFieldTouched={setFieldTouched}
            setErrors={setErrors}
          />
        );
      case 2:
        return (
          <Step2Identity
            formData={{
              aadhaarId: formData.aadhaarId,
              preferredLanguage: formData.preferredLanguage,
              disability: formData.disability,
            }}
            touched={touched}
            errors={errors}
            updateField={updateField}
            setFieldTouched={setFieldTouched}
            setErrors={setErrors}
          />
        );
      case 3:
        return (
          <Step3Location
            formData={{
              pin: formData.pin,
              district: formData.district,
              city: formData.city,
              state: formData.state,
              locality: formData.locality,
              street: formData.street,
              municipal: formData.municipal,
            }}
            touched={touched}
            errors={errors}
            updateField={updateField}
            setFieldTouched={setFieldTouched}
            setErrors={setErrors}
            apiKey={GOOGLE_API_KEY}
          />
        );
      case 4:
        return (
          <Step4Password
            formData={{
              password: formData.password,
              confirmPassword: formData.confirmPassword,
            }}
            touched={touched}
            errors={errors}
            updateField={updateField}
            setFieldTouched={setFieldTouched}
            setErrors={setErrors}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <LoadingPopup
        isOpen={isSubmitting}
        message="Creating Your Account"
        subMessage="Please wait while we set up your account..."
      />

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4 shadow-lg">
            <UserPlus className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Your Account</h1>
          <p className="text-gray-500 mt-2">Join SwarajDesk to file and track your complaints</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <StepProgress steps={steps} currentStep={currentStep} />
        </div>

        {/* Form Card */}
        <Card className="shadow-xl border-0 overflow-hidden">
          <CardContent className="p-8">
            {/* Error Alert */}
            {submitError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{submitError}</p>
              </div>
            )}

            {/* Step Content */}
            <div className="min-h-[400px]">
              {renderStep()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              <Button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : currentStep === 4 ? (
                  <>
                    Create Account
                    <CheckCircle className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <a href="/loginUser" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}