"use client";

import React, { ReactNode } from "react";
import { motion } from "framer-motion";
import { RefreshCw, ArrowDown } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
  threshold?: number;
  className?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  threshold = 80,
  className,
}: PullToRefreshProps) {
  const { containerRef, isPulling, pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh,
    threshold,
    disabled,
  });

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-0 right-0 flex justify-center items-center pointer-events-none z-10"
        style={{
          top: -50,
          height: 50,
        }}
        animate={{
          y: showIndicator ? pullDistance + 10 : 0,
          opacity: showIndicator ? 1 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
        }}
      >
        <motion.div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full shadow-lg",
            isRefreshing 
              ? "bg-blue-500 text-white" 
              : progress >= 1 
                ? "bg-blue-500 text-white" 
                : "bg-white text-gray-500 border border-gray-200"
          )}
          animate={{
            rotate: isRefreshing ? 360 : progress * 180,
            scale: isRefreshing ? 1 : 0.8 + progress * 0.2,
          }}
          transition={{
            rotate: isRefreshing 
              ? { repeat: Infinity, duration: 1, ease: "linear" }
              : { duration: 0 },
            scale: { duration: 0.1 },
          }}
        >
          {isRefreshing ? (
            <RefreshCw className="w-5 h-5" />
          ) : progress >= 1 ? (
            <RefreshCw className="w-5 h-5" />
          ) : (
            <ArrowDown className="w-5 h-5" />
          )}
        </motion.div>
      </motion.div>

      {/* Content wrapper with pull animation */}
      <motion.div
        animate={{
          y: pullDistance > 0 ? pullDistance * 0.3 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
