"use client";

import React from "react";
import { FormInput } from "./FormInput";
import { Mail, Lock } from "lucide-react";

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginFormProps {
  formData: LoginFormData;
  touched: { [key: string]: boolean };
  errors: { [key: string]: string | undefined };
  updateField: (field: keyof LoginFormData, value: string) => void;
  setFieldTouched: (field: string) => void;
}

export function LoginForm({
  formData,
  touched,
  errors,
  updateField,
  setFieldTouched,
}: LoginFormProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <FormInput
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => updateField("email", e.target.value)}
          onBlur={() => setFieldTouched("email")}
          error={errors.email}
          touched={touched.email}
          isValid={touched.email && !errors.email && !!formData.email}
          icon={<Mail className="h-4 w-4" />}
          required
        />

        <FormInput
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={(e) => updateField("password", e.target.value)}
          onBlur={() => setFieldTouched("password")}
          error={errors.password}
          touched={touched.password}
          isValid={touched.password && !errors.password && !!formData.password}
          icon={<Lock className="h-4 w-4" />}
          required
        />
      </div>
    </div>
  );
}
