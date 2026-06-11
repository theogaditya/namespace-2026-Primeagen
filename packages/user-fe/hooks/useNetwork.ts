"use client";

import { useState, useEffect, useRef } from "react";

interface NetworkState {
  isOnline: boolean;
  connectionType: string;
}

/**
 * Check actual internet connectivity by making a small request.
 * This is more reliable than just checking network interface status.
 */
async function checkActualConnectivity(): Promise<boolean> {
  try {
    // Use a small, fast endpoint to check connectivity
    // We use HEAD request to minimize data transfer
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch("https://www.google.com/favicon.ico", {
      method: "HEAD",
      mode: "no-cors", // Avoid CORS issues
      cache: "no-store",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return true; // If we get here, we have internet
  } catch (error) {
    console.log("[useNetwork] Connectivity check failed:", error);
    return false;
  }
}

/**
 * Unified network hook that works both in browser and Capacitor native app.
 * - Uses @capacitor/network for native platforms (Android/iOS) as base
 * - Additionally verifies actual internet connectivity
 * - Falls back to navigator.onLine for web browser
 */
export function useNetwork(): NetworkState {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline: true, // Assume online initially
    connectionType: "unknown",
  });
  
  const connectivityCheckRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let isMounted = true;

    const updateOnlineStatus = async (connected: boolean, connectionType: string) => {
      if (!isMounted) return;
      
      if (connected) {
        // Network says we're connected, but let's verify actual internet access
        const hasInternet = await checkActualConnectivity();
        console.log("[useNetwork] Network connected, actual internet:", hasInternet);
        
        if (isMounted) {
          setNetworkState({
            isOnline: hasInternet,
            connectionType: hasInternet ? connectionType : "none",
          });
        }
      } else {
        console.log("[useNetwork] Network disconnected");
        if (isMounted) {
          setNetworkState({
            isOnline: false,
            connectionType: "none",
          });
        }
      }
    };

    const setupNetworkListener = async () => {
      // Dynamically import Capacitor modules to avoid SSR issues
      try {
        const { Capacitor } = await import("@capacitor/core");
        
        // Check if we're running in a native Capacitor environment
        if (Capacitor.isNativePlatform()) {
          console.log("[useNetwork] Detected native platform, using Capacitor Network plugin");
          
          try {
            const { Network } = await import("@capacitor/network");
            
            // Get initial status
            const status = await Network.getStatus();
            console.log("[useNetwork] Initial network status:", status);
            await updateOnlineStatus(status.connected, status.connectionType);

            // Listen for changes
            const listener = await Network.addListener(
              "networkStatusChange",
              async (status) => {
                console.log("[useNetwork] Network status changed:", status);
                await updateOnlineStatus(status.connected, status.connectionType);
              }
            );

            // Periodically check actual connectivity when connected
            connectivityCheckRef.current = setInterval(async () => {
              if (isMounted) {
                const currentStatus = await Network.getStatus();
                if (currentStatus.connected) {
                  const hasInternet = await checkActualConnectivity();
                  if (isMounted && !hasInternet) {
                    console.log("[useNetwork] Lost actual internet connectivity");
                    setNetworkState({
                      isOnline: false,
                      connectionType: "none",
                    });
                  }
                }
              }
            }, 10000); // Check every 10 seconds

            cleanup = () => {
              console.log("[useNetwork] Removing Capacitor listener");
              listener.remove();
              if (connectivityCheckRef.current) {
                clearInterval(connectivityCheckRef.current);
              }
            };
            
            return; // Successfully set up Capacitor listener
          } catch (pluginError) {
            console.warn("[useNetwork] Capacitor Network plugin error, falling back to browser API:", pluginError);
          }
        } else {
          console.log("[useNetwork] Not a native platform, using browser API");
        }
      } catch (capacitorError) {
        console.log("[useNetwork] Capacitor not available, using browser API");
      }

      // Fallback: Web browser - Use navigator.onLine and window events
      const handleOnline = async () => {
        console.log("[useNetwork] Browser online event");
        await updateOnlineStatus(true, "unknown");
      };

      const handleOffline = () => {
        console.log("[useNetwork] Browser offline event");
        if (isMounted) {
          setNetworkState({
            isOnline: false,
            connectionType: "none",
          });
        }
      };

      // Set initial state with actual connectivity check
      await updateOnlineStatus(navigator.onLine, navigator.onLine ? "unknown" : "none");

      // Add listeners
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      cleanup = () => {
        console.log("[useNetwork] Removing browser listeners");
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        if (connectivityCheckRef.current) {
          clearInterval(connectivityCheckRef.current);
        }
      };
    };

    setupNetworkListener();

    return () => {
      isMounted = false;
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  return networkState;
}

export default useNetwork;
