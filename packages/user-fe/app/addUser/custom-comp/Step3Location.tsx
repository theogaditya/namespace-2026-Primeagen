"use client";

import React, { useCallback, useState, useEffect } from "react";
import { FormInput } from "./FormInput";
import { PlacesAutocomplete } from "./PlacesAutocomplete";
import { LoadingPopup } from "./LoadingPopup";
import { FormField } from "./useSignupForm";
import { z } from "zod";
import { MapPin, Building2, Landmark } from "lucide-react";
const USER_BE_URL = process.env.NEXT_PUBLIC_USER_BE_URL || "http://localhost:3000";

interface Step3Props {
  formData: {
    pin: string;
    district: string;
    city: string;
    state: string;
    locality: string;
    street: string;
    municipal: string;
  };
  touched: { [key: string]: boolean };
  errors: { [key: string]: string | undefined };
  updateField: (field: FormField, value: string) => void;
  setFieldTouched: (field: string) => void;
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string | undefined }>>;
  apiKey: string;
}

// Individual field schemas for real-time validation
const pinSchema = z.object({ pin: z.string().regex(/^\d{6}$/, 'PIN must be 6 digits') });
const municipalSchema = z.object({ municipal: z.string().min(1, 'Municipal is required') });
const localitySchema = z.object({ locality: z.string().min(1, 'Locality is required') });

// List of valid Indian municipalities (simplified)
const validMunicipals = [
  "New Delhi Municipal Corporation",
  "Municipal Corporation of Greater Mumbai",
  "Bruhat Bengaluru Mahanagara Palike",
  "Municipal Corporation of Chennai",
  "Kolkata Municipal Corporation",
  "Ahmedabad Municipal Corporation",
  "Hyderabad Municipal Corporation",
  "Pune Municipal Corporation",
  "Jaipur Municipal Corporation",
  "Lucknow Municipal Corporation",
  // Add more as needed, or just validate format
];

export function Step3Location({
  formData,
  touched,
  errors,
  updateField,
  setFieldTouched,
  setErrors,
  apiKey,
}: Step3Props) {
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const validateField = useCallback((field: string, value: string, schema: z.ZodType) => {
    try {
      schema.parse({ [field]: value });
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        const zodError = e as z.ZodError;
        const fieldError = zodError.issues.find((err) => err.path.includes(field));
        setErrors((prev) => ({
          ...prev,
          [field]: fieldError?.message || "Invalid value",
        }));
      }
      return false;
    }
  }, [setErrors]);

  const fetchLocationByPin = async (pin: string) => {
    if (!/^\d{6}$/.test(pin)) return;
    
    setIsLoadingLocation(true);
    setPinError(null);
    
    try {
      const response = await fetch(`${USER_BE_URL}/api/users/location/${pin}`);
      const data = await response.json();
      
      if (data.success) {
        updateField("district", data.data.district);
        updateField("city", data.data.city);
        updateField("state", data.data.state);
        setErrors((prev) => ({
          ...prev,
          district: undefined,
          city: undefined,
          state: undefined,
        }));
      } else {
        setPinError(data.message || "Could not fetch location details");
        updateField("district", "");
        updateField("city", "");
        updateField("state", "");
      }
    } catch (error) {
      console.error("Error fetching location:", error);
      setPinError("Failed to fetch location. Please check your PIN code.");
      updateField("district", "");
      updateField("city", "");
      updateField("state", "");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    updateField("pin", value);
    
    if (value.length === 6) {
      validateField("pin", value, pinSchema);
      fetchLocationByPin(value);
    } else {
      // Clear location fields if PIN is incomplete
      updateField("district", "");
      updateField("city", "");
      updateField("state", "");
    }
  };

  const handleBlur = (field: FormField, value: string, schema?: z.ZodType) => {
    setFieldTouched(field);
    if (schema) {
      validateField(field, value, schema);
    }
  };

  const handleLocalitySelect = (place: any) => {
    // Extract address components if needed
    if (place.formatted_address) {
      updateField("locality", place.formatted_address);
    }
  };

  return (
    <div className="space-y-6">
      <LoadingPopup
        isOpen={isLoadingLocation}
        message="Fetching Location"
        subMessage="We're looking up your PIN code details..."
      />

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Location Details</h2>
        <p className="text-gray-500 mt-2">Help us locate your address accurately</p>
      </div>

      <div className="space-y-5">
        {/* PIN Code */}
        <FormInput
          label="PIN Code"
          value={formData.pin}
          onChange={handlePinChange}
          onBlur={() => handleBlur("pin", formData.pin, pinSchema)}
          error={errors.pin || (pinError || undefined)}
          isValid={formData.pin.length === 6 && !errors.pin && !pinError && !!formData.district}
          touched={touched.pin}
          placeholder="Enter 6-digit PIN code"
          helpText="Enter your PIN to auto-fill location details"
          required
          maxLength={6}
          icon={<MapPin className="h-4 w-4" />}
        />

        {/* Auto-filled fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">District</label>
            <div className="h-10 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
              {formData.district || <span className="text-gray-400 italic">Auto-filled from PIN</span>}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">City</label>
            <div className="h-10 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
              {formData.city || <span className="text-gray-400 italic">Auto-filled from PIN</span>}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">State</label>
            <div className="h-10 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
              {formData.state || <span className="text-gray-400 italic">Auto-filled from PIN</span>}
            </div>
          </div>
        </div>

        {/* Locality with Google Places */}
        <PlacesAutocomplete
          label="Locality / Area"
          value={formData.locality}
          onChange={(value) => updateField("locality", value)}
          onPlaceSelect={handleLocalitySelect}
          onBlur={() => handleBlur("locality", formData.locality, localitySchema)}
          error={errors.locality}
          isValid={!!formData.locality && !errors.locality}
          touched={touched.locality}
          placeholder="Start typing your locality..."
          helpText={formData.city ? `Select a locality from the dropdown in ${formData.city}` : "Enter PIN code first to enable location filtering"}
          required
          apiKey={apiKey}
          locationBias={{
            city: formData.city,
            state: formData.state,
            district: formData.district,
          }}
          requireSelection
        />

        {/* Street with Google Places */}
        <PlacesAutocomplete
          label="Street / House No. (Optional)"
          value={formData.street}
          onChange={(value) => updateField("street", value)}
          onPlaceSelect={(place) => {
            if (place.formatted_address) {
              updateField("street", place.formatted_address);
            }
          }}
          onBlur={() => setFieldTouched("street")}
          isValid={true}
          touched={touched.street}
          placeholder="Start typing your street..."
          helpText={formData.city ? `Select a street from the dropdown` : undefined}
          apiKey={apiKey}
          locationBias={{
            city: formData.city,
            state: formData.state,
            district: formData.district,
          }}
          requireSelection
        />

        {/* Municipal */}
        <FormInput
          label="Municipal Corporation / Council"
          value={formData.municipal}
          onChange={(e) => {
            updateField("municipal", e.target.value);
            if (touched.municipal) {
              validateField("municipal", e.target.value, municipalSchema);
            }
          }}
          onBlur={() => handleBlur("municipal", formData.municipal, municipalSchema)}
          error={errors.municipal}
          isValid={!!formData.municipal && !errors.municipal}
          touched={touched.municipal}
          placeholder="Enter your local municipal body"
          helpText="Name of your Municipal Corporation or Council"
          required
          icon={<Landmark className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}
