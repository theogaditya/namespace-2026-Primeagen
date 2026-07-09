"use client";

import { useState, useCallback, useRef } from "react";
import { reverseGeocode, matchDistrict } from "@/lib/api/reverseGeocode";
import { normalizeDistrictName } from "@/lib/location/normalizeDistrict";
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

export interface DraftLocation {
  district?: string;
  city?: string;
  pin?: string;
  locality?: string;
}

interface AutoFillSequenceOptions {
  updateField: (field: string, value: string | boolean) => void;
  setCurrentStep: (step: number) => void;
  goToStep: (step: number) => void;
  categories: { id: string; name: string; assignedDepartment: string }[];
  operatingDistricts: { id: string; name: string }[];
}

const AUTO_FILL_SLOWDOWN_FACTOR = 3.5;

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

  const resolveMatchedDistrict = useCallback(
    (...districtCandidates: Array<string | undefined>) => {
      for (const candidate of districtCandidates) {
        const normalizedCandidate = normalizeDistrictName(candidate);
        if (!normalizedCandidate) continue;

        const matchedDistrict = matchDistrict(
          normalizedCandidate,
          operatingDistricts
        );

        if (matchedDistrict) {
          return {
            detectedDistrict: normalizedCandidate,
            matchedDistrict,
          };
        }
      }

      const detectedDistrict =
        districtCandidates
          .map((candidate) => normalizeDistrictName(candidate))
          .find(Boolean) || "";

      return {
        detectedDistrict,
        matchedDistrict: null,
      };
    },
    [operatingDistricts]
  );

  const delay = (ms: number) =>
    new Promise<void>((resolve) => {
      setTimeout(() => {
        if (cancelledRef.current) resolve();
        else resolve();
      }, Math.round(ms * AUTO_FILL_SLOWDOWN_FACTOR));
    });

  const typeText = useCallback(
    (field: string, text: string, speed = 20): Promise<void> => {
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
    },
    [updateField]
  );

  const run = useCallback(
    async (
      aiResult: AIResult,
      userLocation: { lat: number; lng: number } | null,
      draftLocation?: DraftLocation
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
      if (draftLocation && (draftLocation.district || draftLocation.city)) {
        // Use the same direct-fill pattern as Quick Fill: GPS is authoritative when available,
        // with normalized draft values as a fallback.
        setLocationStatus("Filling location from AI draft...");

        if (userLocation) {
          setLocationStatus("Reverse geocoding your location...");
          const geo = await reverseGeocode(userLocation.lat, userLocation.lng);
          if (cancelledRef.current) { setPhase("stopped"); return; }

          const districtResolution = resolveMatchedDistrict(
            geo.district,
            draftLocation.district
          );

          if (!districtResolution.matchedDistrict) {
            setLocationStatus("Location not serviceable.");
            setUnserviceableInfo({
              detectedDistrict: districtResolution.detectedDistrict || "Unknown",
              availableDistricts: operatingDistricts.map((d) => d.name),
            });
            setPhase("stopped");
            return;
          }

          updateField("district", districtResolution.matchedDistrict);
          await delay(400);

          const resolvedPin = geo.pin || draftLocation.pin || "";
          const resolvedCity = geo.city || draftLocation.city || "";
          const resolvedLocality = geo.locality || draftLocation.locality || "";

          if (/^\d{6}$/.test(resolvedPin)) {
            setLocationStatus("Validating PIN...");
            updateField("pin", resolvedPin);
            await delay(600);

            try {
              const pinRes = await fetch(
                `/api/complaint/validate-pin?pin=${resolvedPin}&district=${encodeURIComponent(districtResolution.matchedDistrict)}`
              );
              const pinData = await pinRes.json();
              if (pinData.success && pinData.data?.valid && pinData.data.matchesSelectedDistrict) {
                updateField("city", pinData.data.city || resolvedCity);
              } else if (resolvedCity) {
                updateField("city", resolvedCity);
              }
            } catch {
              if (resolvedCity) {
                updateField("city", resolvedCity);
              }
            }
            await delay(300);
          } else if (resolvedCity) {
            updateField("city", resolvedCity);
            await delay(300);
          }

          if (resolvedLocality) {
            setLocationStatus("Filling locality...");
            updateField("locality", resolvedLocality);
            await delay(300);
          }

          // Set map coordinates — enables the map and places the marker
          updateField("latitude", String(userLocation.lat));
          updateField("longitude", String(userLocation.lng));
          setLocationStatus("Location filled from AI draft + GPS \u2713");
          await delay(800);
        } else {
          const districtResolution = resolveMatchedDistrict(draftLocation.district);

          if (draftLocation.district) {
            if (!districtResolution.matchedDistrict) {
              setLocationStatus("Location not serviceable.");
              setUnserviceableInfo({
                detectedDistrict: districtResolution.detectedDistrict || "Unknown",
                availableDistricts: operatingDistricts.map((d) => d.name),
              });
              setPhase("stopped");
              return;
            }

            updateField("district", districtResolution.matchedDistrict);
            await delay(400);
          }

          // No GPS — fall back to draft-only data for pin/city/locality
          if (draftLocation.pin && /^\d{6}$/.test(draftLocation.pin)) {
            setLocationStatus("Filling PIN code...");
            updateField("pin", draftLocation.pin);
            await delay(500);

            if (districtResolution.matchedDistrict) {
              try {
                const pinRes = await fetch(
                  `/api/complaint/validate-pin?pin=${draftLocation.pin}&district=${encodeURIComponent(districtResolution.matchedDistrict)}`
                );
                const pinData = await pinRes.json();
                if (pinData.success && pinData.data?.valid && pinData.data.matchesSelectedDistrict) {
                  if (pinData.data.city) {
                    updateField("city", pinData.data.city);
                  } else if (draftLocation.city) {
                    updateField("city", draftLocation.city);
                  }
                } else if (draftLocation.city) {
                  updateField("city", draftLocation.city);
                }
              } catch {
                if (draftLocation.city) {
                  updateField("city", draftLocation.city);
                }
              }
              await delay(300);
            }
          } else if (draftLocation.city) {
            setLocationStatus("Filling city...");
            updateField("city", draftLocation.city);
            await delay(300);
          }

          if (draftLocation.locality) {
            setLocationStatus("Filling locality...");
            updateField("locality", draftLocation.locality);
            await delay(300);
          }

          setLocationStatus("Location filled from AI draft \u2713");
          await delay(800);
        }
      } else if (userLocation) {
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
    [categories, operatingDistricts, updateField, goToStep, resolveMatchedDistrict, typeText]
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
