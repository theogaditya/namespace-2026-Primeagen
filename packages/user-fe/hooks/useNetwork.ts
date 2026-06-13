"use client";

import { useState, useEffect } from "react";

interface NetworkState {
  isOnline: boolean;
  connectionType: string;
}

/**
 * Detect if running inside Capacitor native app.
 * Checks multiple indicators since remote URLs may not have all Capacitor features.
 */
function isRunningInCapacitor(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check for Capacitor bridge
  const win = window as any;
  
  // Method 1: Check Capacitor global
  if (win.Capacitor) {
    console.log("[useNetwork] Found window.Capacitor");
    // Try isNativePlatform if available
    if (typeof win.Capacitor.isNativePlatform === "function") {
      const result = win.Capacitor.isNativePlatform();
      console.log("[useNetwork] Capacitor.isNativePlatform():", result);
      if (result) return true;
    }
    // Check platform
    if (win.Capacitor.platform && win.Capacitor.platform !== "web") {
      console.log("[useNetwork] Capacitor.platform:", win.Capacitor.platform);
      return true;
    }
  }
  
  // Method 2: Check for Android/iOS specific indicators
  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroidWebView = userAgent.includes("wv") && userAgent.includes("android");
  const isIOSWebView = (win.webkit?.messageHandlers) && /iphone|ipad|ipod/.test(userAgent);
  
  if (isAndroidWebView || isIOSWebView) {
    console.log("[useNetwork] Detected WebView via userAgent/webkit");
    return true;
  }
  
  // Method 3: Check for Capacitor-specific globals
  if (win.androidBridge || win.webkit?.messageHandlers?.bridge) {
    console.log("[useNetwork] Found native bridge");
    return true;
  }
  
  return false;
}

/**
 * Unified network hook that works both in browser and Capacitor native app.
 * - Uses @capacitor/network for native platforms (Android/iOS)
 * - Falls back to navigator.onLine for web browser
 */
export function useNetwork(): NetworkState {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    connectionType: "unknown",
  });

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let isMounted = true;

    const setupNetworkListener = async () => {
      const isCapacitorNative = isRunningInCapacitor();
      console.log("[useNetwork] Is Capacitor native (final):", isCapacitorNative);

      if (isCapacitorNative) {
        console.log("[useNetwork] Setting up Capacitor Network plugin");
        
        try {
          // Dynamically import to avoid SSR issues
          const { Network } = await import("@capacitor/network");
          
          // Get initial status
          const status = await Network.getStatus();
          console.log("[useNetwork] Initial Capacitor status:", JSON.stringify(status));
          
          if (isMounted) {
            setNetworkState({
              isOnline: status.connected,
              connectionType: status.connectionType,
            });
          }

          // Listen for changes
          const listener = await Network.addListener(
            "networkStatusChange",
            (status) => {
              console.log("[useNetwork] Capacitor status changed:", JSON.stringify(status));
              if (isMounted) {
                setNetworkState({
                  isOnline: status.connected,
                  connectionType: status.connectionType,
                });
              }
            }
          );

          cleanup = () => {
            console.log("[useNetwork] Removing Capacitor listener");
            listener.remove();
          };
          
          return; // Successfully set up Capacitor listener
        } catch (pluginError) {
          console.error("[useNetwork] Capacitor Network plugin error:", pluginError);
          // Fall through to browser fallback
        }
      }

      // Fallback: Web browser - Use navigator.onLine and window events
      console.log("[useNetwork] Using browser navigator.onLine fallback");
      
      const handleOnline = () => {
        console.log("[useNetwork] Browser: online");
        if (isMounted) {
          setNetworkState({ isOnline: true, connectionType: "unknown" });
        }
      };

      const handleOffline = () => {
        console.log("[useNetwork] Browser: offline");
        if (isMounted) {
          setNetworkState({ isOnline: false, connectionType: "none" });
        }
      };

      // Set initial state
      const initialOnline = navigator.onLine;
      console.log("[useNetwork] Browser initial online:", initialOnline);
      
      if (isMounted) {
        setNetworkState({
          isOnline: initialOnline,
          connectionType: initialOnline ? "unknown" : "none",
        });
      }

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      cleanup = () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    };

    setupNetworkListener();

    return () => {
      isMounted = false;
      if (cleanup) cleanup();
    };
  }, []);

  return networkState;
}

export default useNetwork;
