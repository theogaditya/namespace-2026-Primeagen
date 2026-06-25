"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Loader2, CheckCircle, XCircle, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGeolocation } from "@/hooks/useGeolocation";

interface LocationPermissionModalProps {
  isOpen: boolean;
  onResult: (coords: { lat: number; lng: number } | null) => void;
}

type PermissionState = "prompt" | "loading" | "success" | "denied" | "error";

export function LocationPermissionModal({ isOpen, onResult }: LocationPermissionModalProps) {
  const [state, setState] = useState<PermissionState>("prompt");
  const { getCurrentPosition } = useGeolocation();

  const handleEnable = async () => {
    setState("loading");
    const pos = await getCurrentPosition();
    if (pos) {
      setState("success");
      setTimeout(() => onResult({ lat: pos.latitude, lng: pos.longitude }), 800);
    } else {
      setState("denied");
    }
  };

  const handleSkip = () => {
    onResult(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
        >
          {/* Header icon area */}
          <div className="bg-gradient-to-br from-[#630ed4] to-[#8b5cf6] p-8 flex items-center justify-center">
            <motion.div
              animate={
                state === "loading"
                  ? { rotate: 360 }
                  : state === "success"
                  ? { scale: [1, 1.2, 1] }
                  : {}
              }
              transition={
                state === "loading"
                  ? { duration: 2, repeat: Infinity, ease: "linear" }
                  : { duration: 0.4 }
              }
              className="p-4 bg-white/20 rounded-full"
            >
              {state === "success" ? (
                <CheckCircle className="h-10 w-10 text-white" />
              ) : state === "denied" || state === "error" ? (
                <XCircle className="h-10 w-10 text-white" />
              ) : state === "loading" ? (
                <Loader2 className="h-10 w-10 text-white" />
              ) : (
                <Navigation className="h-10 w-10 text-white" />
              )}
            </motion.div>
          </div>

          {/* Content */}
          <div className="p-6 text-center space-y-4">
            {state === "prompt" && (
              <>
                <h3 className="text-xl font-bold text-gray-900">Enable Location Services</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Quick Fill needs your location to auto-fill district, city, and locality.
                  This makes the process much faster.
                </p>
                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleEnable}
                    className="w-full py-3 px-4 rounded-xl bg-[#630ed4] text-white font-semibold hover:bg-[#5108b8] transition-colors flex items-center justify-center gap-2"
                  >
                    <MapPin className="h-4 w-4" />
                    Enable Location
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Skip — I'll fill manually
                  </button>
                </div>
              </>
            )}

            {state === "loading" && (
              <>
                <h3 className="text-xl font-bold text-gray-900">Getting Your Location</h3>
                <p className="text-sm text-gray-500">
                  Please allow location access when prompted by your browser...
                </p>
              </>
            )}

            {state === "success" && (
              <>
                <h3 className="text-xl font-bold text-emerald-700">Location Found!</h3>
                <p className="text-sm text-gray-500">Proceeding to image upload...</p>
              </>
            )}

            {(state === "denied" || state === "error") && (
              <>
                <h3 className="text-xl font-bold text-gray-900">Location Unavailable</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Location access was denied or unavailable. You can still use Quick Fill — you'll just need to enter your location details manually.
                </p>
                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleEnable}
                    className="w-full py-3 px-4 rounded-xl border-2 border-[#630ed4] text-[#630ed4] font-medium hover:bg-[#630ed4]/5 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="w-full py-3 px-4 rounded-xl bg-[#630ed4] text-white font-semibold hover:bg-[#5108b8] transition-colors"
                  >
                    Continue Without Location
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
