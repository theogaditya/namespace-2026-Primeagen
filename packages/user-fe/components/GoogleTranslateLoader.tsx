"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
  }
}

/**
 * Headless Google Translate loader — loads the translate script and
 * initialises it with a hidden element. The actual language switching
 * is driven by the `googtrans` cookie set from our custom dropdown.
 */
export default function GoogleTranslateLoader() {
  useEffect(() => {
    if (document.querySelector("script[src*='translate.google.com/translate_a/element.js']")) {
      return;
    }

    window.googleTranslateElementInit = () => {
      const gt = (window as any).google?.translate;
      if (gt?.TranslateElement) {
        new gt.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages:
              "en,hi,bn,te,mr,ta,gu,kn,ml,pa,or,ur,as,ne",
            autoDisplay: false,
          },
          "google_translate_element"
        );
      }
    };

    const script = document.createElement("script");
    script.src =
      "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      const el = document.querySelector(
        "script[src*='translate.google.com/translate_a/element.js']"
      );
      if (el) el.remove();
      delete window.googleTranslateElementInit;
    };
  }, []);

  return <div id="google_translate_element" className="hidden" />;
}
