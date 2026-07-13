import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side reverse geocoding proxy.
 *
 * Strategy (in order):
 *   1. Google Geocoding REST API  — best quality, requires Geocoding API enabled
 *   2. OpenStreetMap Nominatim   — free, no key needed, great fallback for India
 *
 * Using server-side calls avoids browser HTTP-referrer restrictions and the
 * "This API key is not authorized to use the geocoder" client-side error.
 */

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GeocodeResult {
  address_components: AddressComponent[];
  formatted_address: string;
  types: string[];
}

interface GoogleGeocodeResponse {
  status: string;
  error_message?: string;
  results: GeocodeResult[];
}

interface NominatimAddress {
  county?: string;           // often the district in India
  state_district?: string;   // also used for district
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  neighbourhood?: string;
  postcode?: string;
  state?: string;
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
  error?: string;
}

interface ReverseGeocodeData {
  district: string;
  city: string;
  locality: string;
  pin: string;
  state: string;
  formattedAddress: string;
}

interface ReverseGeocodeAPIResponse {
  success: boolean;
  data?: ReverseGeocodeData;
  source?: "google" | "nominatim";
  error?: string;
}

function extractComponent(
  components: AddressComponent[],
  ...types: string[]
): string {
  for (const type of types) {
    const comp = components.find((c) => c.types.includes(type));
    if (comp) return comp.long_name;
  }
  return "";
}

// ─── Google Geocoding ────────────────────────────────────────────────────────

async function tryGoogleGeocode(
  lat: string,
  lng: string,
  apiKey: string
): Promise<ReverseGeocodeData | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=en`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;

    const data: GoogleGeocodeResponse = await res.json();
    if (data.status !== "OK" || !data.results?.length) {
      console.warn("[geocode/reverse] Google status:", data.status, data.error_message ?? "");
      return null;
    }

    // Collect components from all results for broadest coverage
    const allComponents: AddressComponent[] = data.results.flatMap(
      (r) => r.address_components
    );
    const primary = data.results[0].address_components;

    const district =
      extractComponent(allComponents, "administrative_area_level_3") ||
      extractComponent(allComponents, "administrative_area_level_2");

    return {
      district,
      city: extractComponent(primary, "locality", "administrative_area_level_3"),
      locality: extractComponent(
        primary,
        "sublocality_level_1",
        "sublocality",
        "neighborhood"
      ),
      pin: extractComponent(primary, "postal_code"),
      state: extractComponent(primary, "administrative_area_level_1"),
      formattedAddress: data.results[0].formatted_address || "",
    };
  } catch (err) {
    console.error("[geocode/reverse] Google fetch error:", err);
    return null;
  }
}

// ─── Nominatim (OpenStreetMap) fallback ──────────────────────────────────────

async function tryNominatimGeocode(
  lat: string,
  lng: string
): Promise<ReverseGeocodeData | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1&accept-language=en`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        // Nominatim requires a descriptive User-Agent; using the app name here
        "User-Agent": "SwarajDesk-GovComplaintsApp/1.0 (contact@abhasbehera.in)",
        "Accept-Language": "en",
      },
    });

    if (!res.ok) {
      console.warn("[geocode/reverse] Nominatim HTTP error:", res.status);
      return null;
    }

    const data: NominatimResponse = await res.json();
    if (data.error || !data.address) {
      console.warn("[geocode/reverse] Nominatim error:", data.error);
      return null;
    }

    const addr = data.address;

    // In India, `county` usually holds the district / taluk name
    const district = addr.county || addr.state_district || "";
    const city = addr.city || addr.town || addr.village || "";
    const locality = addr.suburb || addr.neighbourhood || "";

    return {
      district,
      city,
      locality,
      pin: addr.postcode || "",
      state: addr.state || "",
      formattedAddress: data.display_name || "",
    };
  } catch (err) {
    console.error("[geocode/reverse] Nominatim fetch error:", err);
    return null;
  }
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest
): Promise<NextResponse<ReverseGeocodeAPIResponse>> {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng || isNaN(Number(lat)) || isNaN(Number(lng))) {
    return NextResponse.json(
      { success: false, error: "Invalid lat/lng parameters" },
      { status: 400 }
    );
  }

  // 1. Try Google first (better quality for Indian districts)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  if (apiKey) {
    const googleResult = await tryGoogleGeocode(lat, lng, apiKey);
    if (googleResult) {
      return NextResponse.json({
        success: true,
        source: "google",
        data: googleResult,
      });
    }
  }

  // 2. Fall back to Nominatim (free, no key, works even if Google key is restricted)
  console.log("[geocode/reverse] Falling back to Nominatim for", lat, lng);
  const nominatimResult = await tryNominatimGeocode(lat, lng);
  if (nominatimResult) {
    return NextResponse.json({
      success: true,
      source: "nominatim",
      data: nominatimResult,
    });
  }

  return NextResponse.json(
    { success: false, error: "All geocoding providers failed" },
    { status: 502 }
  );
}
