"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Wrapper, Status } from "@googlemaps/react-wrapper";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Search,
  Loader2,
  Navigation,
  X,
  CheckCircle,
  AlertCircle,
  Crosshair,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";

// Default center (India)
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const DEFAULT_ZOOM = 5;

interface LatLng {
  lat: number;
  lng: number;
}

interface GoogleMapPickerProps {
  latitude: string;
  longitude: string;
  onLocationSelect: (lat: string, lng: string) => void;
  district?: string;
  city?: string;
  disabled?: boolean;
}

// Prediction type for Places Autocomplete
interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

// Inner Map Component
function MapComponent({
  center,
  zoom,
  onMapClick,
  markerPosition,
  onZoomChanged,
}: {
  center: LatLng;
  zoom: number;
  onMapClick: (latLng: LatLng) => void;
  markerPosition: LatLng | null;
  onZoomChanged?: (zoom: number) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || googleMapRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom,
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    });

    googleMapRef.current = map;

    // Add click listener
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      }
    });

    // Add zoom changed listener
    map.addListener("zoom_changed", () => {
      const newZoom = map.getZoom();
      if (newZoom && onZoomChanged) {
        onZoomChanged(newZoom);
      }
    });

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, []);

  // Update center when it changes
  useEffect(() => {
    if (googleMapRef.current) {
      googleMapRef.current.panTo(center);
    }
  }, [center]);

  // Update zoom when it changes
  useEffect(() => {
    if (googleMapRef.current) {
      googleMapRef.current.setZoom(zoom);
    }
  }, [zoom]);

  // Update marker when position changes
  useEffect(() => {
    if (!googleMapRef.current) return;

    if (markerPosition) {
      if (markerRef.current) {
        markerRef.current.setPosition(markerPosition);
      } else {
        markerRef.current = new google.maps.Marker({
          position: markerPosition,
          map: googleMapRef.current,
          animation: google.maps.Animation.DROP,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#10b981",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          },
        });
      }
    } else if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
  }, [markerPosition]);

  return <div ref={mapRef} className="w-full h-full rounded-xl" />;
}

// Loading render function
function renderLoading() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Loading map...</p>
      </div>
    </div>
  );
}

// Error render function
function renderError() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-red-50 rounded-xl">
      <div className="text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-600">Failed to load map</p>
        <p className="text-xs text-gray-500 mt-1">Please check your API key</p>
      </div>
    </div>
  );
}

// Render function for Wrapper
function render(status: Status): React.ReactElement {
  switch (status) {
    case Status.LOADING:
      return renderLoading();
    case Status.FAILURE:
      return renderError();
    default:
      return <></>;
  }
}

export function GoogleMapPicker({
  latitude,
  longitude,
  onLocationSelect,
  district,
  city,
  disabled = false,
}: GoogleMapPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate marker position from lat/lng strings
  const markerPosition: LatLng | null =
    latitude && longitude
      ? { lat: parseFloat(latitude), lng: parseFloat(longitude) }
      : null;

  // Calculate center - use marker position if available, otherwise default
  const center: LatLng = markerPosition || DEFAULT_CENTER;

  // Handle map click
  const handleMapClick = useCallback(
    (latLng: LatLng) => {
      if (disabled) return;
      onLocationSelect(latLng.lat.toFixed(6), latLng.lng.toFixed(6));
      setLocationError(null);
    },
    [disabled, onLocationSelect]
  );

  // Initialize Places services when Google Maps is loaded
  const initializePlacesServices = useCallback(() => {
    if (typeof google !== "undefined" && google.maps && google.maps.places) {
      if (!autocompleteServiceRef.current) {
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      }
      if (!placesServiceRef.current) {
        // Create a dummy element for PlacesService
        const dummyElement = document.createElement("div");
        placesServiceRef.current = new google.maps.places.PlacesService(dummyElement);
      }
    }
  }, []);

  // Fetch predictions
  const fetchPredictions = useCallback(
    (input: string) => {
      if (!input || input.length < 2) {
        setPredictions([]);
        setShowPredictions(false);
        return;
      }

      initializePlacesServices();

      if (!autocompleteServiceRef.current) {
        return;
      }

      setIsSearching(true);

      // Build search query with context
      let searchInput = input;
      if (city) searchInput += `, ${city}`;
      if (district) searchInput += `, ${district}`;
      searchInput += ", India";

      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: searchInput,
          componentRestrictions: { country: "in" },
        },
        (results, status) => {
          setIsSearching(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results.slice(0, 5));
            setShowPredictions(true);
          } else {
            setPredictions([]);
          }
        }
      );
    },
    [city, district, initializePlacesServices]
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchPredictions(value);
    }, 300);
  };

  // Handle prediction selection
  const handlePredictionSelect = (prediction: PlacePrediction) => {
    initializePlacesServices();

    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["geometry"],
      },
      (place, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          place?.geometry?.location
        ) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          onLocationSelect(lat.toFixed(6), lng.toFixed(6));
          setZoom(15);
          setSearchQuery(prediction.structured_formatting?.main_text || "");
          setShowPredictions(false);
          setPredictions([]);
          setLocationError(null);
        }
      }
    );
  };

  // Handle "Use my location" button
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        onLocationSelect(lat.toFixed(6), lng.toFixed(6));
        setZoom(15);
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location permission denied. Please enable it in your browser settings.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out.");
            break;
          default:
            setLocationError("An error occurred while getting your location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Handle zoom in/out
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 1, 20));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 1, 1));

  // Clear selection
  const handleClearLocation = () => {
    onLocationSelect("", "");
    setSearchQuery("");
    setZoom(DEFAULT_ZOOM);
    setLocationError(null);
  };

  return (
    <div className={cn("space-y-4", disabled && "opacity-60 pointer-events-none")}>
      {/* Search Bar */}
      <div className="relative">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search className="h-5 w-5" />
          </div>
          <Input
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => predictions.length > 0 && setShowPredictions(true)}
            placeholder="Search for a location..."
            disabled={disabled}
            className="pl-11 pr-20 h-12 rounded-xl border-2 text-base"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isSearching && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setPredictions([]);
                  setShowPredictions(false);
                }}
                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-4 w-4 text-gray-400" />
              </Button>
            )}
          </div>
        </div>

        {/* Predictions Dropdown */}
        <AnimatePresence>
          {showPredictions && predictions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl overflow-hidden"
            >
              {predictions.map((prediction, index) => (
                <motion.button
                  key={prediction.place_id}
                  type="button"
                  onClick={() => handlePredictionSelect(prediction)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors flex items-start gap-3"
                >
                  <MapPin className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {prediction.structured_formatting?.main_text || prediction.description}
                    </p>
                    {prediction.structured_formatting?.secondary_text && (
                      <p className="text-xs text-gray-500 truncate">
                        {prediction.structured_formatting.secondary_text}
                      </p>
                    )}
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Map Container */}
      <div className="relative">
        <div className="h-[300px] rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg">
          {GOOGLE_API_KEY ? (
            <Wrapper apiKey={GOOGLE_API_KEY} render={render} libraries={["places"]}>
              <MapComponent
                center={center}
                zoom={zoom}
                onMapClick={handleMapClick}
                markerPosition={markerPosition}
                onZoomChanged={setZoom}
              />
            </Wrapper>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Google Maps API key not configured</p>
              </div>
            </div>
          )}
        </div>

        {/* Map Controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={handleZoomIn}
            className="h-10 w-10 rounded-xl bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={handleZoomOut}
            className="h-10 w-10 rounded-xl bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
        </div>

        {/* Crosshair Hint */}
        {!markerPosition && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="text-center bg-white/90 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg">
              <Crosshair className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
              <p className="text-sm text-gray-600">Click on the map to select location</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleUseMyLocation}
          disabled={disabled || isGettingLocation}
          className="flex items-center gap-2 rounded-xl border-2 hover:bg-emerald-50 hover:border-emerald-300 transition-all"
        >
          {isGettingLocation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          Use My Location
        </Button>

        {markerPosition && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleClearLocation}
            className="flex items-center gap-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl"
          >
            <X className="h-4 w-4" />
            Clear Selection
          </Button>
        )}
      </div>

      {/* Error Message */}
      {locationError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {locationError}
        </motion.div>
      )}

      {/* Selected Coordinates Display */}
      {markerPosition && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl"
        >
          <div className="p-2 bg-emerald-100 rounded-lg">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800">Location Selected</p>
            <p className="text-xs text-emerald-600 font-mono">
              {latitude}, {longitude}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
