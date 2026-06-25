"use client";

import { useState, useCallback, useRef } from "react";
import { reverseGeocode, matchDistrict } from "@/lib/api/reverseGeocode";
import { CATEGORY_DEPARTMENT_MAP, CATEGORY_DISPLAY, type ComplaintUrgency, type Department } from "./types";

export type AutoFillPhase =
  | "idle"
  | "category"
  | "details"
  | "location"
  | "review"
  | "done"
  | "stopped";

export interface AIResult {
  category: string;
  subCategory: string;
  complaint: string;
  urgency: string;
}

interface AutoFillSequenceOptions {
  updateField: (field: string, value: string | boolean) => void;
  setCurrentStep: (step: number) => void;
  goToStep: (step: number) => void;
  categories: { id: string; name: string; assignedDepartment: string }[];
  operatingDistricts: { id: string; name: string }[];
}

const AUTO_FILL_SLOWDOWN_FACTOR = 2.0;

export function useAutoFillSequence(options: AutoFillSequenceOptions) {
  const { updateField, setCurrentStep, goToStep, categories, operatingDistricts } = options;

  const [phase, setPhase] = useState<AutoFillPhase>("idle");
  const [highlightedCategory, setHighlightedCategory] = useState<string>("");
  const [typingField, setTypingField] = useState<string>("");
  const [typingText, setTypingText] = useState<string>("");
  const [highlightedUrgency, setHighlightedUrgency] = useState<string>("");
  const [locationStatus, setLocationStatus] = useState<string>("");
  const [unserviceableInfo, setUnserviceableInfo] = useState<{ detectedDistrict: string; availableDistricts: string[] } | null>(null);
  const cancelledRef = useRef(false);

  const delay = (ms: number) =>
    new Promise<void>((resolve) => {
      setTimeout(() => {
        if (cancelledRef.current) resolve();
        else resolve();
      }, Math.round(ms * AUTO_FILL_SLOWDOWN_FACTOR));
    });

  const typeText = (field: string, text: string, speed = 20): Promise<void> => {
    return new Promise((resolve) => {
      setTypingField(field);
      let idx = 0;

      const tick = () => {
        if (cancelledRef.current) {
          updateField(field, text);
          setTypingText("");
          setTypingField("");
          resolve();
          return;
        }

        idx++;
        const current = text.slice(0, idx);
        setTypingText(current);
        updateField(field, current);

        if (idx >= text.length) {
          setTypingText("");
          setTypingField("");
          resolve();
        } else {
          setTimeout(tick, Math.round(speed * AUTO_FILL_SLOWDOWN_FACTOR));
        }
      };

      tick();
    });
  };

  const run = useCallback(
    async (
      aiResult: AIResult,
      userLocation: { lat: number; lng: number } | null
    ) => {
      cancelledRef.current = false;

      // --- Phase 1: Category Selection ---
      setPhase("category");

      // Find matching category
      const matchedCat = categories.find(
        (c) => c.name.toLowerCase() === aiResult.category.toLowerCase()
      );

      if (matchedCat) {
        setHighlightedCategory(matchedCat.id);
        await delay(600);

        updateField("categoryId", matchedCat.id);
        updateField("categoryName", matchedCat.name);
        updateField("assignedDepartment", matchedCat.assignedDepartment);
        await delay(800);
      } else {
        // Fallback: use first matching category by partial name
        const partialMatch = categories.find((c) =>
          c.name.toLowerCase().includes(aiResult.category.toLowerCase()) ||
          aiResult.category.toLowerCase().includes(c.name.toLowerCase())
        );
        if (partialMatch) {
          setHighlightedCategory(partialMatch.id);
          await delay(600);
          updateField("categoryId", partialMatch.id);
          updateField("categoryName", partialMatch.name);
          updateField("assignedDepartment", partialMatch.assignedDepartment);
          await delay(800);
        }
      }

      if (cancelledRef.current) { setPhase("stopped"); return; }

      // Auto-advance to step 2
      setPhase("details");
      goToStep(2);
      await delay(500);

      // --- Phase 2: Details ---
      // Type subCategory
      await typeText("subCategory", aiResult.subCategory, 20);
      if (cancelledRef.current) { setPhase("stopped"); return; }
      await delay(300);

      // Type complaint description
      await typeText("description", aiResult.complaint, 15);
      if (cancelledRef.current) { setPhase("stopped"); return; }
      await delay(300);

      // Animate urgency selection
      const urgencyLevels = ["LOW", "MEDIUM", "HIGH"];
      const targetUrgency = aiResult.urgency || "MEDIUM";
      const targetIdx = urgencyLevels.indexOf(targetUrgency);

      for (let i = 0; i <= Math.max(targetIdx, 0); i++) {
        setHighlightedUrgency(urgencyLevels[i]);
        await delay(200);
      }
      updateField("urgency", targetUrgency);
      await delay(200);

      // Public toggle
      updateField("isPublic", true);
      await delay(600);

      if (cancelledRef.current) { setPhase("stopped"); return; }

      // Auto-advance to step 3
      setPhase("location");
      goToStep(3);
      await delay(500);

      // --- Phase 3: Location ---
      if (userLocation) {
        setLocationStatus("Reverse geocoding your location...");
        const geo = await reverseGeocode(userLocation.lat, userLocation.lng);

        if (cancelledRef.current) { setPhase("stopped"); return; }

        // Match district
        const matchedDistrict = matchDistrict(geo.district, operatingDistricts);

        if (matchedDistrict) {
          setLocationStatus("Filling district...");
          updateField("district", matchedDistrict);
          await delay(400);

          if (geo.pin) {
            setLocationStatus("Validating PIN...");
            updateField("pin", geo.pin);
            await delay(600);

            // Trigger PIN validation by waiting for the API
            try {
              const pinRes = await fetch(
                `/api/complaint/validate-pin?pin=${geo.pin}&district=${encodeURIComponent(matchedDistrict)}`
              );
              const pinData = await pinRes.json();
              if (pinData.success && pinData.data?.valid && pinData.data.matchesSelectedDistrict) {
                updateField("city", pinData.data.city || geo.city);
              } else {
                updateField("city", geo.city);
              }
            } catch {
              updateField("city", geo.city);
            }
            await delay(300);
          }

          if (geo.locality) {
            setLocationStatus("Filling locality...");
            updateField("locality", geo.locality);
            await delay(300);
          }

          // Set map coordinates
          updateField("latitude", String(userLocation.lat));
          updateField("longitude", String(userLocation.lng));
          setLocationStatus("Location filled from GPS ✓");
          await delay(800);
        } else {
          // District not found in operating districts — unserviceable
          setLocationStatus("Location not serviceable.");
          updateField("latitude", String(userLocation.lat));
          updateField("longitude", String(userLocation.lng));
          setUnserviceableInfo({
            detectedDistrict: geo.district || "Unknown",
            availableDistricts: operatingDistricts.map((d) => d.name),
          });
          setPhase("stopped");
          return;
        }
      } else {
        // No location — user fills manually
        setLocationStatus("Please fill your location details.");
        setPhase("done");
        return;
      }

      if (cancelledRef.current) { setPhase("stopped"); return; }

      // Auto-advance to step 4 (review)
      setPhase("review");
      goToStep(4);
      await delay(300);

      setPhase("done");
    },
    [categories, operatingDistricts, updateField, goToStep]
  );

  const stop = useCallback(() => {
    cancelledRef.current = true;
    setPhase("stopped");
    setTypingField("");
    setTypingText("");
    setHighlightedCategory("");
    setHighlightedUrgency("");
    setLocationStatus("");
  }, []);

  const reset = useCallback(() => {
    cancelledRef.current = true;
    setPhase("idle");
    setTypingField("");
    setTypingText("");
    setHighlightedCategory("");
    setHighlightedUrgency("");
    setLocationStatus("");
    setUnserviceableInfo(null);
  }, []);

  const dismissUnserviceable = useCallback(() => {
    setUnserviceableInfo(null);
  }, []);

  return {
    phase,
    highlightedCategory,
    typingField,
    typingText,
    highlightedUrgency,
    locationStatus,
    unserviceableInfo,
    run,
    stop,
    reset,
    dismissUnserviceable,
  };
}
