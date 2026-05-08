"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingPopupProps {
  isOpen: boolean;
  message?: string;
  subMessage?: string;
}

export function LoadingPopup({
  isOpen,
  message = "Please wait",
  subMessage = "We're signing you in...",
}: LoadingPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200" />
      
      {/* Modal */}
      <div className="relative z-10 animate-in zoom-in-95 fade-in duration-300">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 max-w-sm mx-4">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Animated Loader */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-linear-to-r from-blue-500 to-purple-500 blur-xl opacity-30 animate-pulse" />
              <div className="relative bg-linear-to-r from-blue-500 to-purple-600 rounded-full p-4">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            </div>
            
            {/* Text */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">{message}</h3>
              <p className="text-sm text-gray-500">{subMessage}</p>
            </div>
            
            {/* Progress Dots */}
            <div className="flex space-x-2">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-2 w-2 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
