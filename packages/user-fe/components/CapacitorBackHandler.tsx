"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App, type BackButtonListenerEvent } from "@capacitor/app";

export default function CapacitorBackHandler() {
  useEffect(() => {
    // Only run on native platforms (Android/iOS)
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const setupBackButton = async () => {
      // Listen for the hardware back button
      const backButtonListener = await App.addListener(
        "backButton",
        ({ canGoBack }: BackButtonListenerEvent) => {
          // If the webview can go back in history, navigate back
          if (canGoBack) {
            window.history.back();
          } else {
            // If we're at the root, minimize the app instead of closing
            App.minimizeApp();
          }
        }
      );

      // Cleanup listener on unmount
      return () => {
        backButtonListener.remove();
      };
    };

    const cleanup = setupBackButton();

    return () => {
      cleanup.then((remove) => remove && remove());
    };
  }, []);

  // This component doesn't render anything
  return null;
}
