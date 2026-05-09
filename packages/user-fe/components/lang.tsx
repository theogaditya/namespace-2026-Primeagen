"use client";
import { useEffect } from "react";

// Extend the window for the Google Translate callback
declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
  }
}

export default function LanguageSelector() {
  useEffect(() => {
    // If the script is already there, don't add it again
    if (document.querySelector("script[src*='translate.google.com/translate_a/element.js']")) {
      return;
    }
    
    // Define the initialization function on the window object
    window.googleTranslateElementInit = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const googleTranslate = (window as any).google?.translate;
      if (googleTranslate?.TranslateElement) {
        new googleTranslate.TranslateElement(
          {
            pageLanguage: "en",
            // Add the languages you want to support
            includedLanguages: "en,hi,ta,te,kn,ml,mr,bn,gu,or,ja,pa,ur,as,ne,zh,ar,fr,de,es,it,pt,ru,vi",
            // This tells Google to only show the dropdown
            layout: googleTranslate.TranslateElement.InlineLayout.HORIZONTAL,
          },
          "google_translate_element"
        );
      }
    };

    // Create a script element and add it to the page
    const script = document.createElement("script");
    script.src =
      "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);

    // Cleanup function to remove the script when the component unmounts
    return () => {
      const scriptEl = document.querySelector("script[src*='translate.google.com/translate_a/element.js']");
      if (scriptEl) {
        document.body.removeChild(scriptEl);
      }
      delete window.googleTranslateElementInit;
    };
  }, []);

  // This is the div where the Google Translate dropdown will be rendered
  return (
     <div className="w-full">
      <p className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Choose your language from the dropdown below
      </p>
      <div 
        id="google_translate_element" 
        className="inline-block bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-300 dark:border-gray-700 p-2"
      />
    </div>
  );
}