"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OperatingDistrict } from "./types";
import { GoogleMapPicker } from "@/components/google-map-picker";
import {
  MapPin,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  List,
  X,
  Navigation,
  Sparkles,
  ChevronDown,
  Building,
  Map,
} from "lucide-react";

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
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

interface Step3Props {
  formData: {
    district: string;
    pin: string;
    city: string;
    locality: string;
    latitude: string;
    longitude: string;
  };
  touched: { [key: string]: boolean };
  errors: { [key: string]: string | undefined };
  updateField: (
    field: "district" | "pin" | "city" | "locality" | "latitude" | "longitude",
    value: string
  ) => void;
  setFieldTouched: (field: string) => void;
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string | undefined }>>;
}

export function Step3Location({
  formData,
  touched,
  errors,
  updateField,
  setFieldTouched,
  setErrors,
}: Step3Props) {
  // District state
  const [districts, setDistricts] = useState<OperatingDistrict[]>([]);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [showDistrictList, setShowDistrictList] = useState(false);
  const [districtSearchTerm, setDistrictSearchTerm] = useState("");
  const [districtValidationStatus, setDistrictValidationStatus] = useState<
    "idle" | "validating" | "valid" | "invalid"
  >("idle");

  // PIN state
  const [pinValidationStatus, setPinValidationStatus] = useState<
    "idle" | "validating" | "valid" | "invalid"
  >("idle");
  const [pinValidationMessage, setPinValidationMessage] = useState("");

  // Locality autocomplete state
  const [localityPredictions, setLocalityPredictions] = useState<Prediction[]>([]);
  const [showLocalityDropdown, setShowLocalityDropdown] = useState(false);
  const [isLoadingLocality, setIsLoadingLocality] = useState(false);

  // Fetch districts on mount
  useEffect(() => {
    const fetchDistricts = async () => {
      setIsLoadingDistricts(true);
      try {
        const response = await fetch("/api/complaint/districts");
        const data = await response.json();
        if (data.success && data.data) {
          setDistricts(data.data);
        }
      } catch (error) {
        console.error("Error fetching districts:", error);
      } finally {
        setIsLoadingDistricts(false);
      }
    };
    fetchDistricts();
  }, []);

  // Validate district against operating districts (case-insensitive)
  const validateDistrict = useCallback(
    (districtName: string) => {
      if (!districtName.trim()) {
        setDistrictValidationStatus("idle");
        return;
      }

      setDistrictValidationStatus("validating");
      const found = districts.find(
        (d) => d.name.toLowerCase() === districtName.trim().toLowerCase()
      );

      if (found) {
        setDistrictValidationStatus("valid");
        // Update the district name to match the canonical name from the database
        if (found.name !== districtName) {
          updateField("district", found.name);
        }
        setErrors((prev) => ({ ...prev, district: undefined }));
      } else {
        setDistrictValidationStatus("invalid");
        setErrors((prev) => ({
          ...prev,
          district: "Invalid district. Please select an operational district.",
        }));
      }
    },
    [districts, setErrors, updateField]
  );

  // Handle district input change
  const handleDistrictChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updateField("district", value);
    setDistrictSearchTerm(value);
    
    // Show dropdown with suggestions as user types
    if (value.length > 0) {
      setShowDistrictList(true);
      // Check if any districts match while typing
      const matches = districts.filter((d) =>
        d.name.toLowerCase().includes(value.toLowerCase())
      );
      if (matches.length === 0 && value.length >= 2) {
        setDistrictValidationStatus("invalid");
      } else {
        setDistrictValidationStatus("idle");
      }
    } else {
      setShowDistrictList(false);
      setDistrictValidationStatus("idle");
    }
    
    // Clear PIN and city when district changes
    if (value !== formData.district) {
      updateField("pin", "");
      updateField("city", "");
      setPinValidationStatus("idle");
    }
  };

  // Handle district blur - validate
  const handleDistrictBlur = () => {
    setFieldTouched("district");
    if (formData.district) {
      validateDistrict(formData.district);
    }
  };

  // Handle district selection from list
  const handleDistrictSelect = (district: OperatingDistrict) => {
    updateField("district", district.name);
    setDistrictSearchTerm(district.name);
    setShowDistrictList(false);
    setDistrictValidationStatus("valid");
    setErrors((prev) => ({ ...prev, district: undefined }));
    setFieldTouched("district");
    
    // Clear PIN validation when district changes
    setPinValidationStatus("idle");
    updateField("pin", "");
    updateField("city", "");
  };

  // Validate PIN against selected district
  const validatePin = async (pin: string) => {
    if (!/^\d{6}$/.test(pin)) {
      setPinValidationStatus("idle");
      return;
    }

    if (!formData.district) {
      setErrors((prev) => ({ ...prev, pin: "Please select a district first" }));
      return;
    }

    setPinValidationStatus("validating");
    setPinValidationMessage("Validating PIN code...");

    try {
      const response = await fetch(
        `/api/complaint/validate-pin?pin=${pin}&district=${encodeURIComponent(formData.district)}`
      );
      const data = await response.json();

      if (data.success && data.data?.valid) {
        if (data.data.matchesSelectedDistrict) {
          setPinValidationStatus("valid");
          setPinValidationMessage("");
          updateField("city", data.data.city || "");
          setErrors((prev) => ({ ...prev, pin: undefined, city: undefined }));
        } else {
          setPinValidationStatus("invalid");
          setPinValidationMessage(
            `This PIN code belongs to ${data.data.district}, not ${formData.district}`
          );
          setErrors((prev) => ({
            ...prev,
            pin: `Invalid PIN for ${formData.district}`,
          }));
          updateField("city", "");
        }
      } else {
        setPinValidationStatus("invalid");
        setPinValidationMessage("Invalid PIN code");
        setErrors((prev) => ({ ...prev, pin: "Invalid PIN code" }));
        updateField("city", "");
      }
    } catch (error) {
      console.error("PIN validation error:", error);
      setPinValidationStatus("invalid");
      setPinValidationMessage("Failed to validate PIN");
    }
  };

  // Handle PIN input change
  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    updateField("pin", value);
    
    if (value.length === 6) {
      validatePin(value);
    } else {
      setPinValidationStatus("idle");
      setPinValidationMessage("");
      updateField("city", "");
    }
  };

  // Fetch locality predictions
  const fetchLocalityPredictions = useCallback(
    async (input: string) => {
      if (!input || input.length < 3 || !formData.district || !formData.pin) {
        setLocalityPredictions([]);
        setShowLocalityDropdown(false);
        return;
      }

      setIsLoadingLocality(true);

      try {
        if (typeof window !== "undefined" && window.google?.maps?.places) {
          const service = new window.google.maps.places.AutocompleteService();
          // Include district and PIN in search to ensure results are within the area
          const searchQuery = `${input}, ${formData.pin}, ${formData.district}, India`;
          
          service.getPlacePredictions(
            {
              input: searchQuery,
              componentRestrictions: { country: "in" },
              // Removed types restriction to allow all place types including landmarks, malls, etc.
            },
            (results, status) => {
              setIsLoadingLocality(false);
              if (status === "OK" && results) {
                // Filter to only show results in the selected district
                const filtered = results.filter((r) =>
                  r.description.toLowerCase().includes(formData.district.toLowerCase())
                );
                setLocalityPredictions(filtered.slice(0, 6)); // Limit to 6 results
                setShowLocalityDropdown(filtered.length > 0);
              } else {
                setLocalityPredictions([]);
              }
            }
          );
        } else {
          setIsLoadingLocality(false);
        }
      } catch (err) {
        console.error("Error fetching locality predictions:", err);
        setIsLoadingLocality(false);
      }
    },
    [formData.district, formData.pin]
  );

  // Handle locality input change with debounce
  const handleLocalityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updateField("locality", value);
    
    // Debounced fetch
    const timeoutId = setTimeout(() => {
      fetchLocalityPredictions(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  // Handle locality selection
  const handleLocalitySelect = (prediction: Prediction) => {
    // Extract just the locality/area name from the prediction
    const localityName = prediction.structured_formatting?.main_text || prediction.description.split(",")[0];
    updateField("locality", localityName);
    setLocalityPredictions([]);
    setShowLocalityDropdown(false);
    setFieldTouched("locality");
    setErrors((prev) => ({ ...prev, locality: undefined }));
  };

  // Filter districts for dropdown - use formData.district for live filtering
  const filteredDistricts = districts.filter((d) =>
    d.name.toLowerCase().includes(formData.district.toLowerCase())
  );

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="text-center mb-8" variants={headerVariants}>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-emerald-100 to-teal-100 text-emerald-700 text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          Step 3 of 4
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Location Details</h2>
        <p className="text-gray-500">Help us locate the issue accurately for faster resolution</p>
      </motion.div>

      {/* District Input */}
      <motion.div className="space-y-2 relative" variants={itemVariants}>
        <div className="flex items-center justify-between">
          <Label
            htmlFor="district"
            className={cn(
              "text-sm font-semibold",
              touched.district && errors.district && "text-red-600"
            )}
          >
            District <span className="text-red-500">*</span>
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowDistrictList(!showDistrictList)}
            className="text-xs text-emerald-600 hover:text-emerald-700 gap-1 h-auto py-1 hover:bg-emerald-50"
          >
            <List className="h-3 w-3" />
            {showDistrictList ? "Hide" : "Browse"} districts
          </Button>
        </div>
        
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <MapPin className="h-5 w-5" />
          </div>
          <Input
            id="district"
            value={formData.district}
            onChange={handleDistrictChange}
            onBlur={(e) => {
              // Delay blur to allow click on dropdown items
              setTimeout(() => {
                handleDistrictBlur();
                // Only hide if not clicking on dropdown
                if (!e.relatedTarget?.closest('.district-dropdown')) {
                  setShowDistrictList(false);
                }
              }, 150);
            }}
            onFocus={() => setShowDistrictList(true)}
            placeholder="Enter or select your district"
            className={cn(
              "pl-11 pr-12 h-12 rounded-xl border-2 text-base transition-all",
              touched.district && errors.district && "border-red-300",
              districtValidationStatus === "valid" && "border-emerald-400 bg-emerald-50/50"
            )}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {districtValidationStatus === "validating" && (
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            )}
            {districtValidationStatus === "valid" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </motion.div>
            )}
            {districtValidationStatus === "invalid" && (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        </div>

        {touched.district && errors.district && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-600 flex items-center gap-1"
          >
            <AlertCircle className="h-4 w-4" />
            {errors.district}
          </motion.p>
        )}

        {/* District List Modal */}
        <AnimatePresence>
          {showDistrictList && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="district-dropdown absolute left-0 right-0 z-50 mt-1 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl max-h-64 overflow-hidden"
            >
              <div className="sticky top-0 bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  {filteredDistricts.length > 0 
                    ? `Available Districts (${filteredDistricts.length})`
                    : "No Matches Found"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowDistrictList(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-auto max-h-48">
                {isLoadingDistricts ? (
                  <div className="p-6 text-center text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Loading districts...
                  </div>
                ) : filteredDistricts.length === 0 ? (
                  <div className="p-6 text-center">
                    <XCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                    <p className="text-red-600 font-medium">
                      {formData.district 
                        ? `"${formData.district}" is not available`
                        : "No districts found"}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      Please select from available operating districts
                    </p>
                  </div>
                ) : (
                  filteredDistricts.map((district, index) => {
                    // Highlight matching text
                    const searchTerm = formData.district.toLowerCase();
                    const districtName = district.name;
                    const matchIndex = districtName.toLowerCase().indexOf(searchTerm);
                    
                    let highlightedName;
                    if (matchIndex >= 0 && searchTerm.length > 0) {
                      const before = districtName.slice(0, matchIndex);
                      const match = districtName.slice(matchIndex, matchIndex + searchTerm.length);
                      const after = districtName.slice(matchIndex + searchTerm.length);
                      highlightedName = (
                        <>
                          {before}
                          <span className="bg-emerald-200 text-emerald-800 rounded px-0.5">{match}</span>
                          {after}
                        </>
                      );
                    } else {
                      highlightedName = districtName;
                    }
                    
                    return (
                      <motion.button
                        key={district.id}
                        type="button"
                        onClick={() => handleDistrictSelect(district)}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-emerald-100 transition-colors">
                            <Building className="h-4 w-4 text-gray-500 group-hover:text-emerald-600" />
                          </div>
                          <span className="font-medium text-gray-800">{highlightedName}</span>
                        </div>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                          {district.state}
                        </span>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* PIN Code */}
      <motion.div className="space-y-2" variants={itemVariants}>
        <Label
          htmlFor="pin"
          className={cn(
            "text-sm font-semibold",
            touched.pin && errors.pin && "text-red-600"
          )}
        >
          PIN Code <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id="pin"
            value={formData.pin}
            onChange={handlePinChange}
            onBlur={() => setFieldTouched("pin")}
            placeholder="Enter 6-digit PIN code"
            maxLength={6}
            disabled={!formData.district || districtValidationStatus !== "valid"}
            className={cn(
              "h-12 rounded-xl border-2 text-base pr-12 font-mono tracking-wider transition-all",
              touched.pin && errors.pin && "border-red-300",
              pinValidationStatus === "valid" && "border-emerald-400 bg-emerald-50/50",
              (!formData.district || districtValidationStatus !== "valid") && "bg-gray-50 cursor-not-allowed"
            )}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {pinValidationStatus === "validating" && (
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            )}
            {pinValidationStatus === "valid" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </motion.div>
            )}
            {pinValidationStatus === "invalid" && (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        </div>
        {!formData.district && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Please select a district first
          </p>
        )}
        {pinValidationMessage && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "text-sm flex items-center gap-1",
              pinValidationStatus === "invalid" ? "text-red-600" : "text-gray-500"
            )}
          >
            <AlertCircle className="h-4 w-4" />
            {pinValidationMessage}
          </motion.p>
        )}
        {touched.pin && errors.pin && !pinValidationMessage && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-600 flex items-center gap-1"
          >
            <AlertCircle className="h-4 w-4" />
            {errors.pin}
          </motion.p>
        )}
      </motion.div>

      {/* City (Auto-filled) */}
      <motion.div className="space-y-2" variants={itemVariants}>
        <Label htmlFor="city" className="text-sm font-semibold">
          City <span className="text-red-500">*</span>
        </Label>
        <div className={cn(
          "h-12 px-4 rounded-xl border-2 flex items-center transition-all",
          formData.city
            ? "bg-emerald-50/50 border-emerald-200 text-gray-900"
            : "bg-gray-50 border-gray-200 text-gray-400"
        )}>
          {formData.city ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="font-medium">{formData.city}</span>
            </div>
          ) : (
            <span className="italic text-sm">Auto-filled from PIN code</span>
          )}
        </div>
      </motion.div>

      {/* Locality */}
      <motion.div className="space-y-2 relative" variants={itemVariants}>
        <Label
          htmlFor="locality"
          className={cn(
            "text-sm font-semibold",
            touched.locality && errors.locality && "text-red-600"
          )}
        >
          Locality / Area <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Navigation className="h-5 w-5" />
          </div>
          <Input
            id="locality"
            value={formData.locality}
            onChange={handleLocalityChange}
            onFocus={() => localityPredictions.length > 0 && setShowLocalityDropdown(true)}
            onBlur={() => {
              setFieldTouched("locality");
              setTimeout(() => setShowLocalityDropdown(false), 200);
            }}
            placeholder="Start typing your locality name..."
            className={cn(
              "pl-11 pr-12 h-12 rounded-xl border-2 text-base transition-all",
              touched.locality && errors.locality && "border-red-300",
              (!formData.district || !formData.pin || pinValidationStatus !== "valid") && "bg-gray-50 cursor-not-allowed"
            )}
            disabled={!formData.district || !formData.pin || pinValidationStatus !== "valid"}
          />
          {isLoadingLocality && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}
        </div>
        
        {/* Locality Predictions Dropdown */}
        <AnimatePresence>
          {showLocalityDropdown && localityPredictions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl max-h-52 overflow-auto"
            >
              {localityPredictions.map((prediction, index) => (
                <motion.button
                  key={prediction.place_id}
                  type="button"
                  onClick={() => handleLocalitySelect(prediction)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors"
                >
                  <p className="font-medium text-gray-900 truncate">
                    {prediction.structured_formatting?.main_text || prediction.description}
                  </p>
                  {prediction.structured_formatting?.secondary_text && (
                    <p className="text-xs text-gray-500 truncate">
                      {prediction.structured_formatting.secondary_text}
                    </p>
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {(!formData.district || !formData.pin || pinValidationStatus !== "valid") && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Please select district and enter valid PIN first
          </p>
        )}
        {touched.locality && errors.locality && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-600 flex items-center gap-1"
          >
            <AlertCircle className="h-4 w-4" />
            {errors.locality}
          </motion.p>
        )}
      </motion.div>

      {/* Interactive Map for Location Selection */}
      <motion.div variants={itemVariants}>
        <div className="p-4 bg-gray-50 rounded-2xl border-2 border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Map className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-semibold text-gray-700">
              Select Location on Map <span className="text-gray-400 font-normal">(Optional)</span>
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Click on the map, search for a location, or use your current location to set precise coordinates.
          </p>
          <GoogleMapPicker
            latitude={formData.latitude}
            longitude={formData.longitude}
            onLocationSelect={(lat, lng) => {
              updateField("latitude", lat);
              updateField("longitude", lng);
            }}
            district={formData.district}
            city={formData.city}
            disabled={!formData.district || !formData.pin || pinValidationStatus !== "valid"}
          />
          {(!formData.district || !formData.pin || pinValidationStatus !== "valid") && (
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-3">
              <AlertCircle className="h-3 w-3" />
              Please select district and enter valid PIN first to enable map selection
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
