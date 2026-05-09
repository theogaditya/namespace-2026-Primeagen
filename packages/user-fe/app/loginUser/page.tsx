"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  LoginForm,
  useLoginForm,
  LoadingPopup,
} from "./custom-comp";
import { CheckCircle, Loader2, LogIn } from "lucide-react";

export default function LoginUser() {
  const router = useRouter();
  const {
    formData,
    touched,
    errors,
    updateField,
    setFieldTouched,
    validateForm,
    setErrors,
  } = useLoginForm();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("authToken");
      if (token) {
        router.push("/dashboard");
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store JWT token and user data in localStorage
        localStorage.setItem("authToken", data.data.token);
        localStorage.setItem("userData", JSON.stringify(data.data.user));
        
        // Dispatch auth change event to update navbar
        window.dispatchEvent(new Event('authChange'));
        
        setSubmitSuccess(true);
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        // Handle specific error messages from backend
        if (response.status === 401) {
          setSubmitError("Invalid email or password. Please try again.");
        } else if (response.status === 403) {
          setSubmitError(data.message || "Your account is not active. Please contact support.");
        } else {
          setSubmitError(data.message || "Login failed. Please try again.");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
              Login Successful!
            </h2>
            <p className="text-gray-500 mb-4">
              Welcome back! Redirecting you to your dashboard...
            </p>
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Redirecting...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 py-8 px-4 flex items-center justify-center">
      <LoadingPopup
        isOpen={isSubmitting}
        message="Signing You In"
        subMessage="Please wait while we verify your credentials..."
      />

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4 shadow-lg">
            <LogIn className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-500 mt-2">Sign in to your SwarajDesk account</p>
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

            {/* Login Form */}
            <form onSubmit={handleSubmit}>
              <LoginForm
                formData={formData}
                touched={touched}
                errors={errors}
                updateField={updateField}
                setFieldTouched={setFieldTouched}
              />

              {/* Submit Button */}
              <div className="mt-8">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full gap-2 bg-blue-600 hover:bg-blue-700 h-12 text-base"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      Sign In
                      <LogIn className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <a href="/addUser" className="text-blue-600 hover:text-blue-700 font-medium">
              Create account
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
