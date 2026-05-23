"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertCircle, MapPin, Loader2, AlertTriangle } from "lucide-react";

interface PlacesAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: { formatted_address: string; name?: string }) => void;
  onBlur?: () => void;
  error?: string;
  isValid?: boolean;
  touched?: boolean;
  helpText?: string;
  placeholder?: string;
  required?: boolean;
  apiKey: string;
  className?: string;
  /** City and state to filter/bias results */
  locationBias?: {
    city: string;
    state: string;
    district: string;
  };
  /** If true, user must select from dropdown - manual entry is cleared on blur */
  requireSelection?: boolean;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export function PlacesAutocomplete({
  label,
  value,
  onChange,
  onPlaceSelect,
  onBlur,
  error,
  isValid,
  touched,
  helpText,
  placeholder = "Start typing to search...",
  required,
  apiKey,
  className,
  locationBias,
  requireSelection = false,
}: PlacesAutocompleteProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [locationMismatch, setLocationMismatch] = useState(false);
  const [hasValidSelection, setHasValidSelection] = useState(false);
  const [inputValue, setInputValue] = useState(value); // Track input separately
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const inputId = label.toLowerCase().replace(/\s+/g, "-");
  const showError = touched && error;
  const showSuccess = touched && isValid && !error && !locationMismatch;

  // Check if a prediction matches the location bias
  const matchesLocationBias = useCallback((description: string): boolean => {
    if (!locationBias?.city && !locationBias?.state && !locationBias?.district) {
      return true; // No bias, accept all
    }
    
    const lowerDesc = description.toLowerCase();
    const city = locationBias.city?.toLowerCase() || "";
    const state = locationBias.state?.toLowerCase() || "";
    const district = locationBias.district?.toLowerCase() || "";
    
    // Check if any of the location components are in the description
    const cityMatch = city ? lowerDesc.includes(city) : false;
    const stateMatch = state ? lowerDesc.includes(state) : false;
    const districtMatch = district ? lowerDesc.includes(district) : false;
    
    return cityMatch || stateMatch || districtMatch;
  }, [locationBias]);

  // Fetch predictions from Google Places API
  const fetchPredictions = useCallback(async (input: string) => {
    if (!input || input.length < 3) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setLocationMismatch(false);
    
    try {
      // Add city/state to search query to bias results
      let searchQuery = input;
      if (locationBias?.city) {
        searchQuery = `${input}, ${locationBias.city}`;
      } else if (locationBias?.state) {
        searchQuery = `${input}, ${locationBias.state}`;
      }
      
      // Since we can't call the API directly from the browser due to CORS,
      // we'll use the Google Maps JavaScript API's AutocompleteService
      if (typeof window !== "undefined" && window.google?.maps?.places) {
        const service = new window.google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          {
            input: searchQuery,
            componentRestrictions: { country: "in" },
            types: ["geocode"],
          },
          (results: Prediction[] | null, status: string) => {
            setIsLoading(false);
            if (status === "OK" && results) {
              // Filter results to only show those matching the location bias
              const filteredResults = locationBias?.city || locationBias?.state
                ? results.filter(r => matchesLocationBias(r.description))
                : results;
              
              setPredictions(filteredResults);
              setIsOpen(filteredResults.length > 0);
            } else {
              setPredictions([]);
            }
          }
        );
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error fetching predictions:", err);
      setIsLoading(false);
      setPredictions([]);
    }
  }, [apiKey, locationBias, matchesLocationBias]);

  // Sync inputValue with external value changes
  React.useEffect(() => {
    setInputValue(value);
    // If value is set externally and matches, mark as valid selection
    if (value && matchesLocationBias(value)) {
      setHasValidSelection(true);
    }
  }, [value, matchesLocationBias]);

  // Debounced input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue); // Update local input value
    setHasValidSelection(false); // User is typing, not selecting
    setSelectedIndex(-1);
    setLocationMismatch(false); // Reset warning when user types

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(newValue);
    }, 300);
  };

  // Handle prediction selection
  const handleSelect = (prediction: Prediction) => {
    // Check if selected location matches the bias
    const matches = matchesLocationBias(prediction.description);
    setLocationMismatch(!matches);
    
    setInputValue(prediction.description);
    setHasValidSelection(true); // User made a valid selection
    onChange(prediction.description);
    onPlaceSelect?.({ formatted_address: prediction.description });
    setPredictions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || predictions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && predictions[selectedIndex]) {
          handleSelect(predictions[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load Google Maps script
  useEffect(() => {
    if (typeof window !== "undefined" && !window.google?.maps?.places) {
      const existingScript = document.getElementById("google-maps-script");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "google-maps-script";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }
  }, [apiKey]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <Label
        htmlFor={inputId}
        className={cn(
          "text-sm font-medium transition-colors",
          showError && "text-red-600",
          showSuccess && "text-green-600"
        )}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
          <MapPin className="h-4 w-4" />
        </div>
        <Input
          id={inputId}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={() => {
            // Delay to allow click on suggestion
            setTimeout(() => {
              // If requireSelection is true and user didn't select from dropdown, clear the value
              if (requireSelection && !hasValidSelection && inputValue) {
                setInputValue("");
                onChange("");
                setLocationMismatch(false);
              }
              onBlur?.();
            }, 250);
          }}
          onFocus={() => {
            if (predictions.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            "pl-10 transition-all duration-200",
            showError && "border-red-500 focus-visible:ring-red-500/20 focus-visible:border-red-500",
            showSuccess && "border-green-500 focus-visible:ring-green-500/20 focus-visible:border-green-500",
            className
          )}
          aria-invalid={showError ? "true" : "false"}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          role="combobox"
        />
        
        {/* Loading/Validation Icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
          {touched && !isLoading && showError && <XCircle className="h-5 w-5 text-red-500" />}
          {touched && !isLoading && showSuccess && <CheckCircle className="h-5 w-5 text-green-500" />}
        </div>

        {/* Predictions Dropdown */}
        {isOpen && predictions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {predictions.map((prediction, index) => (
              <button
                key={prediction.place_id}
                type="button"
                className={cn(
                  "w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3 border-b border-gray-100 last:border-0",
                  selectedIndex === index && "bg-blue-50"
                )}
                onClick={() => handleSelect(prediction)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {prediction.structured_formatting?.main_text || prediction.description}
                  </p>
                  {prediction.structured_formatting?.secondary_text && (
                    <p className="text-sm text-gray-500 truncate">
                      {prediction.structured_formatting.secondary_text}
                    </p>
                  )}
                </div>
              </button>
            ))}
            <div className="px-4 py-2 bg-gray-50 border-t">
              <img 
                src="https://developers.google.com/maps/documentation/images/powered_by_google_on_white.png" 
                alt="Powered by Google" 
                className="h-4"
              />
            </div>
          </div>
        )}
      </div>
      
      {showError && (
        <p className="text-sm text-red-600 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
      {locationMismatch && !showError && locationBias?.city && (
        <p className="text-sm text-amber-600 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertTriangle className="h-4 w-4" />
          This location may not be in {locationBias.city}. Please verify your selection.
        </p>
      )}
      {helpText && !showError && !locationMismatch && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
}
