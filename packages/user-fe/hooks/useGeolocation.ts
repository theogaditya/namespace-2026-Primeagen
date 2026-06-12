"use client";

import { useState, useCallback } from "react";

interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface GeolocationState {
  position: GeolocationPosition | null;
  error: string | null;
  isLoading: boolean;
}

interface UseGeolocationReturn extends GeolocationState {
  getCurrentPosition: () => Promise<GeolocationPosition | null>;
}

/**
 * Detect if running inside Capacitor native app.
 */
function isRunningInCapacitor(): boolean {
  if (typeof window === "undefined") return false;
  
  const win = window as any;
  
  // Check for Capacitor global
  if (win.Capacitor) {
    if (typeof win.Capacitor.isNativePlatform === "function") {
      if (win.Capacitor.isNativePlatform()) return true;
    }
    if (win.Capacitor.platform && win.Capacitor.platform !== "web") {
      return true;
    }
  }
  
  // Check for Android/iOS WebView indicators
  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroidWebView = userAgent.includes("wv") && userAgent.includes("android");
  const isIOSWebView = (win.webkit?.messageHandlers) && /iphone|ipad|ipod/.test(userAgent);
  
  if (isAndroidWebView || isIOSWebView) return true;
  if (win.androidBridge || win.webkit?.messageHandlers?.bridge) return true;
  
  return false;
}

/**
 * Unified geolocation hook that works both in browser and Capacitor native app.
 * - Uses @capacitor/geolocation for native platforms (Android/iOS)
 * - Falls back to navigator.geolocation for web browser
 */
export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isLoading: false,
  });

  const getCurrentPosition = useCallback(async (): Promise<GeolocationPosition | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const isCapacitorNative = isRunningInCapacitor();
    console.log("[useGeolocation] Is Capacitor native:", isCapacitorNative);

    if (isCapacitorNative) {
      // Try Capacitor Geolocation plugin
      try {
        console.log("[useGeolocation] Using Capacitor Geolocation plugin");
        const { Geolocation } = await import("@capacitor/geolocation");

        // Request permissions first
        const permStatus = await Geolocation.checkPermissions();
        console.log("[useGeolocation] Permission status:", permStatus);

        if (permStatus.location !== "granted") {
          const requestStatus = await Geolocation.requestPermissions();
          console.log("[useGeolocation] Permission request result:", requestStatus);
          
          if (requestStatus.location !== "granted") {
            const errorMsg = "Location permission denied. Please enable it in app settings.";
            setState({ position: null, error: errorMsg, isLoading: false });
            return null;
          }
        }

        // Get current position
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });

        console.log("[useGeolocation] Capacitor position:", position);

        const result: GeolocationPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        setState({ position: result, error: null, isLoading: false });
        return result;
      } catch (error: any) {
        console.error("[useGeolocation] Capacitor Geolocation error:", error);
        
        let errorMsg = "Failed to get location.";
        if (error.message) {
          if (error.message.includes("permission") || error.message.includes("denied")) {
            errorMsg = "Location permission denied. Please enable it in app settings.";
          } else if (error.message.includes("timeout")) {
            errorMsg = "Location request timed out. Please try again.";
          } else {
            errorMsg = error.message;
          }
        }

        setState({ position: null, error: errorMsg, isLoading: false });
        return null;
      }
    }

    // Fallback: Browser Geolocation API
    console.log("[useGeolocation] Using browser navigator.geolocation");
    
    if (!navigator.geolocation) {
      const errorMsg = "Geolocation is not supported by your browser";
      setState({ position: null, error: errorMsg, isLoading: false });
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("[useGeolocation] Browser position:", position);
          
          const result: GeolocationPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          setState({ position: result, error: null, isLoading: false });
          resolve(result);
        },
        (error) => {
          console.error("[useGeolocation] Browser geolocation error:", error);
          
          let errorMsg: string;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = "Location permission denied. Please enable it in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = "Location information is unavailable.";
              break;
            case error.TIMEOUT:
              errorMsg = "Location request timed out.";
              break;
            default:
              errorMsg = "An error occurred while getting your location.";
          }

          setState({ position: null, error: errorMsg, isLoading: false });
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return {
    ...state,
    getCurrentPosition,
  };
}

export default useGeolocation;
