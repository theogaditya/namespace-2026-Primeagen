"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, WifiOff, Wifi, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineComplaintSyncProps {
  complaintData: any;
  submitEndpoint: string;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
}

export default function OfflineComplaintSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"waiting" | "syncing" | "success" | "error">("waiting");
  const [pendingComplaint, setPendingComplaint] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log("Internet connection restored");
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log("Internet connection lost");
      setIsOnline(false);
    };

    // Check initial status
    setIsOnline(navigator.onLine);

    // Listen for connection changes
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Auto-submit when connection is restored
  useEffect(() => {
    if (isOnline && pendingComplaint && syncStatus === "waiting") {
      submitComplaint();
    }
  }, [isOnline, pendingComplaint, syncStatus]);

  // Submit complaint to server
  const submitComplaint = useCallback(async () => {
    if (!pendingComplaint) return;

    setIsSyncing(true);
    setSyncStatus("syncing");
    setRetryCount((prev) => prev + 1);

    try {
      const response = await fetch(pendingComplaint.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...pendingComplaint.headers,
        },
        body: JSON.stringify(pendingComplaint.data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setSyncStatus("success");
      
      // Call success callback after a short delay
      setTimeout(() => {
        pendingComplaint.onSuccess?.(result);
        setPendingComplaint(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to submit complaint:", error);
      setSyncStatus("error");
      
      // If still online, retry after a delay
      if (navigator.onLine) {
        setTimeout(() => {
          setSyncStatus("waiting");
          submitComplaint();
        }, 3000);
      } else {
        setSyncStatus("waiting");
      }
    } finally {
      setIsSyncing(false);
    }
  }, [pendingComplaint]);

  // Function to be called when user tries to submit complaint
  const handleComplaintSubmit = (complaintData: any, endpoint: string, headers?: any, onSuccess?: (response: any) => void, onError?: (error: any) => void) => {
    if (!navigator.onLine) {
      // Store complaint for later submission
      setPendingComplaint({
        data: complaintData,
        endpoint,
        headers,
        onSuccess,
        onError,
      });
      setSyncStatus("waiting");
      return;
    }

    // If online, submit immediately
    setPendingComplaint({
      data: complaintData,
      endpoint,
      headers,
      onSuccess,
      onError,
    });
    submitComplaint();
  };

  // Demo function for testing
  const testOfflineSubmit = () => {
    const demoComplaint = {
      title: "Test Complaint",
      description: "This is a test complaint submitted offline",
      category: "Infrastructure",
      urgency: "medium",
    };

    handleComplaintSubmit(
      demoComplaint,
      "/api/complaints/submit",
      { Authorization: "Bearer test-token" },
      (response) => {
        console.log("Success:", response);
        alert("Complaint submitted successfully!");
      },
      (error) => {
        console.error("Error:", error);
        alert("Failed to submit complaint");
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-6">
        {/* Connection Status Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg",
            isOnline
              ? "bg-green-50 border-2 border-green-200"
              : "bg-red-50 border-2 border-red-200"
          )}
        >
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-600" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-600" />
          )}
          <span className={cn("font-medium", isOnline ? "text-green-700" : "text-red-700")}>
            {isOnline ? "Connected to Internet" : "No Internet Connection"}
          </span>
        </motion.div>

        {/* Test Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={testOfflineSubmit}
          className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg transition-colors"
        >
          Test Offline Complaint Submission
        </motion.button>

        {/* Sync Status Card - Only shown when there's a pending complaint */}
        <AnimatePresence>
          {pendingComplaint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="bg-white rounded-2xl shadow-2xl border-2 border-slate-200 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4">
                <h3 className="text-white font-bold text-xl">Complaint Submission</h3>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Status Display */}
                <div className="flex flex-col items-center justify-center space-y-4">
                  <AnimatePresence mode="wait">
                    {syncStatus === "waiting" && (
                      <motion.div
                        key="waiting"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex flex-col items-center gap-4"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="p-4 bg-amber-100 rounded-full"
                        >
                          <Clock className="h-12 w-12 text-amber-600" />
                        </motion.div>
                        <div className="text-center">
                          <h4 className="text-xl font-semibold text-slate-800">Waiting for Connection</h4>
                          <p className="text-slate-500 mt-2">Your complaint will be submitted once internet is available</p>
                        </div>
                      </motion.div>
                    )}

                    {syncStatus === "syncing" && (
                      <motion.div
                        key="syncing"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex flex-col items-center gap-4"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="p-4 bg-blue-100 rounded-full"
                        >
                          <Loader2 className="h-12 w-12 text-blue-600" />
                        </motion.div>
                        <div className="text-center">
                          <h4 className="text-xl font-semibold text-slate-800">Syncing Complaint</h4>
                          <p className="text-slate-500 mt-2">Please wait while we submit your complaint...</p>
                          <p className="text-xs text-slate-400 mt-1">Attempt {retryCount}</p>
                        </div>
                      </motion.div>
                    )}

                    {syncStatus === "success" && (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex flex-col items-center gap-4"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          className="p-4 bg-green-100 rounded-full"
                        >
                          <CheckCircle className="h-12 w-12 text-green-600" />
                        </motion.div>
                        <div className="text-center">
                          <h4 className="text-xl font-semibold text-green-800">Success!</h4>
                          <p className="text-slate-500 mt-2">Your complaint has been submitted successfully</p>
                        </div>
                      </motion.div>
                    )}

                    {syncStatus === "error" && (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex flex-col items-center gap-4"
                      >
                        <motion.div
                          animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                          transition={{ duration: 0.5 }}
                          className="p-4 bg-red-100 rounded-full"
                        >
                          <XCircle className="h-12 w-12 text-red-600" />
                        </motion.div>
                        <div className="text-center">
                          <h4 className="text-xl font-semibold text-red-800">Submission Failed</h4>
                          <p className="text-slate-500 mt-2">Retrying automatically...</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Skeleton Pulse Animation - shown during waiting/syncing */}
                {(syncStatus === "waiting" || syncStatus === "syncing") && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        animate={{
                          opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                        className="h-4 bg-slate-200 rounded-full"
                        style={{ width: `${100 - i * 15}%` }}
                      />
                    ))}
                  </motion.div>
                )}

                {/* Info Message */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> This component automatically detects when your internet connection is restored and submits your complaint. Please keep this window open.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg p-6 border border-slate-200"
        >
          <h3 className="font-bold text-lg text-slate-800 mb-4">How It Works:</h3>
          <ol className="space-y-2 text-slate-600">
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-600">1.</span>
              <span>When you submit a complaint without internet, it will be queued</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-600">2.</span>
              <span>The sync card appears showing "Waiting for Connection"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-600">3.</span>
              <span>Once internet is back, it automatically submits your complaint</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-600">4.</span>
              <span>On success, the card shows a success message and auto-closes</span>
            </li>
          </ol>
        </motion.div>
      </div>
    </div>
  );
}
