"use client";

import React from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, Sparkles, Send, Shield, Clock, RefreshCw, WifiOff, CloudOff } from "lucide-react";

interface LoadingPopupProps {
  isOpen: boolean;
  status?: "loading" | "success" | "error" | "queued-offline" | "synced";
  message?: string;
  subMessage?: string;
  onClose?: () => void;
  /** For synced state - the complaint ID to view */
  complaintId?: string | null;
}

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.8, 
    y: 20,
    transition: { duration: 0.2 }
  },
};

const iconVariants: Variants = {
  hidden: { scale: 0, rotate: -180 },
  visible: { 
    scale: 1, 
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 15,
      delay: 0.1,
    }
  },
};

export function LoadingPopup({
  isOpen,
  status = "loading",
  message = "Submitting your complaint",
  subMessage = "Please wait while we process your request...",
  onClose,
  complaintId,
}: LoadingPopupProps) {
  const statusConfig = {
    loading: {
      icon: <Loader2 className="h-10 w-10 text-white" />,
      bgGradient: "from-orange-500 to-amber-600",
      glowColor: "rgba(249, 115, 22, 0.4)",
      ringColor: "ring-orange-200",
    },
    success: {
      icon: <CheckCircle2 className="h-10 w-10 text-white" />,
      bgGradient: "from-green-500 to-emerald-600",
      glowColor: "rgba(34, 197, 94, 0.4)",
      ringColor: "ring-green-200",
    },
    error: {
      icon: <XCircle className="h-10 w-10 text-white" />,
      bgGradient: "from-red-500 to-rose-600",
      glowColor: "rgba(239, 68, 68, 0.4)",
      ringColor: "ring-red-200",
    },
    "queued-offline": {
      icon: <RefreshCw className="h-10 w-10 text-white" />,
      bgGradient: "from-blue-500 to-cyan-600",
      glowColor: "rgba(59, 130, 246, 0.4)",
      ringColor: "ring-blue-200",
    },
    synced: {
      icon: <CheckCircle2 className="h-10 w-10 text-white" />,
      bgGradient: "from-green-500 to-emerald-600",
      glowColor: "rgba(34, 197, 94, 0.4)",
      ringColor: "ring-green-200",
    },
  };

  const config = statusConfig[status];

  const particleVariants: Variants = {
    animate: {
      y: [0, -20, 0],
      opacity: [0, 1, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
      },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            variants={backdropVariants}
            onClick={status !== "loading" ? onClose : undefined}
          />
          
          {/* Modal */}
          <motion.div 
            className="relative z-10"
            variants={modalVariants}
          >
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 max-w-sm mx-4 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-40 h-40 bg-linear-to-br from-orange-500 to-amber-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-linear-to-br from-orange-500 to-amber-500 rounded-full translate-x-1/2 translate-y-1/2" />
              </div>
              
              <div className="flex flex-col items-center text-center space-y-5 relative">
                {/* Animated Icon */}
                <motion.div 
                  className="relative"
                  variants={iconVariants}
                >
                  {/* Floating particles for loading state */}
                  {status === "loading" && (
                    <>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <motion.div
                          key={i}
                          className="absolute"
                          style={{
                            left: `${20 + (i % 3) * 25}%`,
                            top: `${10 + Math.floor(i / 3) * 60}%`,
                          }}
                          variants={particleVariants}
                          animate="animate"
                        >
                          <Sparkles className="h-3 w-3 text-orange-400" />
                        </motion.div>
                      ))}
                    </>
                  )}

                  {/* Floating particles for queued-offline state */}
                  {status === "queued-offline" && (
                    <>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <motion.div
                          key={i}
                          className="absolute"
                          style={{
                            left: `${20 + (i % 3) * 25}%`,
                            top: `${10 + Math.floor(i / 3) * 60}%`,
                          }}
                          variants={particleVariants}
                          animate="animate"
                        >
                          <Sparkles className="h-3 w-3 text-blue-400" />
                        </motion.div>
                      ))}
                    </>
                  )}
                  

                  
                  {/* Glow effect */}
                  <motion.div 
                    className={`absolute inset-0 rounded-full blur-2xl`}
                    style={{ backgroundColor: config.glowColor }}
                    animate={(status === "loading" || status === "queued-offline") ? {
                      scale: [1, 1.3, 1],
                      opacity: [0.3, 0.5, 0.3],
                    } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                  
                  {/* Main icon container */}
                  <motion.div 
                    className={`relative bg-linear-to-br ${config.bgGradient} rounded-2xl p-5 shadow-lg ring-4 ${config.ringColor}`}
                    animate={(status === "loading" || status === "queued-offline") ? { rotate: 360 } : {}}
                    transition={(status === "loading" || status === "queued-offline") ? { 
                      repeat: Infinity, 
                      duration: 2, 
                      ease: "linear" 
                    } : {}}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={status}
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        {config.icon}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
                
                {/* Text */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="text-xl font-bold text-gray-900">{message}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{subMessage}</p>
                </motion.div>
                
                {/* Progress Dots (only for loading) */}
                {status === "loading" && (
                  <motion.div 
                    className="flex space-x-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-3 w-3 rounded-full bg-linear-to-r from-orange-500 to-amber-500"
                        animate={{
                          y: [0, -8, 0],
                          scale: [1, 1.2, 1],
                        }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </motion.div>
                )}

                {/* Info badges for loading state */}
                {status === "loading" && (
                  <motion.div
                    className="flex flex-wrap gap-2 justify-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 text-xs font-medium rounded-full">
                      <Shield className="h-3 w-3" />
                      Secure
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                      <Send className="h-3 w-3" />
                      Sending
                    </span>
                  </motion.div>
                )}

                {/* Queued Offline State - Waiting for sync */}
                {status === "queued-offline" && (
                  <>
                    {/* Sync animation dots */}
                    <motion.div 
                      className="flex space-x-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="h-3 w-3 rounded-full bg-linear-to-r from-blue-500 to-cyan-500"
                          animate={{
                            y: [0, -8, 0],
                            scale: [1, 1.2, 1],
                          }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.15,
                          }}
                        />
                      ))}
                    </motion.div>

                    {/* Warning card for offline state */}
                    <motion.div
                      className="w-full p-4 bg-blue-50 border border-blue-200 rounded-2xl"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="flex items-center gap-3">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <RefreshCw className="h-5 w-5 text-blue-600" />
                        </motion.div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold text-blue-800">Waiting for Connection</p>
                          <p className="text-xs text-blue-600 mt-0.5">Please do not close this page while syncing</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Offline badges */}
                    <motion.div
                      className="flex flex-wrap gap-2 justify-center"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 text-xs font-medium rounded-full">
                        <WifiOff className="h-3 w-3" />
                        Offline Mode
                      </span>
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                        <CloudOff className="h-3 w-3" />
                        Saved Locally
                      </span>
                    </motion.div>
                  </>
                )}

                {/* Success state badges */}
                {status === "success" && (
                  <motion.div
                    className="flex flex-wrap gap-2 justify-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 text-xs font-medium rounded-full">
                      <CheckCircle2 className="h-3 w-3" />
                      Confirmed
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                      <Clock className="h-3 w-3" />
                      Tracking ID Assigned
                    </span>
                  </motion.div>
                )}

                {/* Synced state badges and button */}
                {status === "synced" && (
                  <>
                    <motion.div
                      className="flex flex-wrap gap-2 justify-center"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 text-xs font-medium rounded-full">
                        <CheckCircle2 className="h-3 w-3" />
                        Synced Successfully
                      </span>
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                        <Clock className="h-3 w-3" />
                        Tracking ID Assigned
                      </span>
                    </motion.div>

                    {/* View Complaint button for synced state */}
                    {onClose && (
                      <motion.button
                        onClick={onClose}
                        className="mt-2 px-8 py-3 rounded-xl text-sm font-semibold text-white bg-linear-to-r from-green-500 to-emerald-600 hover:shadow-lg transition-all shadow-md"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ delay: 0.4 }}
                      >
                        View Complaint
                      </motion.button>
                    )}
                  </>
                )}

                {/* Close button (for success/error only - not for queued-offline or synced) */}
                {(status === "success" || status === "error") && onClose && (
                  <motion.button
                    onClick={onClose}
                    className={`mt-2 px-8 py-3 rounded-xl text-sm font-semibold text-white bg-linear-to-r ${config.bgGradient} hover:shadow-lg transition-all shadow-md`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ delay: 0.4 }}
                  >
                    {status === "success" ? "View Complaint" : "Try Again"}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
