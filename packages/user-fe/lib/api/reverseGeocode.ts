import { normalizeDistrictName } from "@/lib/location/normalizeDistrict";

export interface ReverseGeocodeResult {
  district: string;
  city: string;
  locality: string;
  pin: string;
  state: string;
  formattedAddress: string;
}

/**
 * Reverse geocodes a lat/lng pair via our server-side `/api/geocode/reverse`
 * proxy route.
 *
 * Using a server-side proxy instead of the browser-side Google Maps Geocoder
 * avoids two common problems:
 *   1. "REQUEST_DENIED" / "This API key is not authorized" errors caused by
 *      HTTP-referrer restrictions on the API key.
 *   2. The Google Maps JS API not being loaded yet (e.g. during Quick Fill AI,
 *      which runs before the GoogleMapPicker component mounts on Step 3).
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  const empty: ReverseGeocodeResult = {
    district: "",
    city: "",
    locality: "",
    pin: "",
    state: "",
    formattedAddress: "",
  };

  try {
    const response = await fetch(
      `/api/geocode/reverse?lat=${lat}&lng=${lng}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      console.error("[reverseGeocode] Server route returned", response.status);
      return empty;
    }

    const json = await response.json();

    if (!json.success || !json.data) {
      console.error("[reverseGeocode] Server route error:", json.error);
      return empty;
    }

    const d = json.data;

    return {
      // Normalize the district name so it matches our operating-districts list
      district: normalizeDistrictName(d.district),
      city: d.city || "",
      locality: d.locality || "",
      pin: d.pin || "",
      state: d.state || "",
      formattedAddress: d.formattedAddress || "",
    };
  } catch (error) {
    console.error("[reverseGeocode] Error:", error);
    return empty;
  }
}

export function matchDistrict(
  geocodedDistrict: string,
  operatingDistricts: { id: string; name: string }[]
): string | null {
  const normalized = normalizeDistrictName(geocodedDistrict).toLowerCase();
  if (!normalized) return null;

  const normalizedDistricts = operatingDistricts.map((district) => ({
    original: district,
    normalizedName: normalizeDistrictName(district.name).toLowerCase(),
  }));

  // Exact match
  const exact = normalizedDistricts.find(
    (district) => district.normalizedName === normalized
  );
  if (exact) return exact.original.name;

  // Partial match (geocoded name contains district name or vice versa)
  const partial = normalizedDistricts.find(
    (district) =>
      normalized.includes(district.normalizedName) ||
      district.normalizedName.includes(normalized)
  );
  if (partial) return partial.original.name;

  return null;
}
