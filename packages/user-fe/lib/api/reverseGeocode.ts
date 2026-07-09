import { normalizeDistrictName } from "@/lib/location/normalizeDistrict";

export interface ReverseGeocodeResult {
  district: string;
  city: string;
  locality: string;
  pin: string;
  state: string;
  formattedAddress: string;
}

function extractComponent(
  components: google.maps.GeocoderAddressComponent[],
  ...types: string[]
): string {
  for (const type of types) {
    const comp = components.find((c) => c.types.includes(type));
    if (comp) return comp.long_name;
  }
  return "";
}

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

  if (typeof window === "undefined" || !window.google?.maps) {
    return empty;
  }

  try {
    const geocoder = new google.maps.Geocoder();
    const response = await geocoder.geocode({ location: { lat, lng } });

    if (!response.results?.length) return empty;

    // Collect all address components across every result for broader coverage.
    // Google returns multiple results at different granularity levels —
    // the district name may appear only in a less-specific result.
    const allComponents: google.maps.GeocoderAddressComponent[] = [];
    for (const r of response.results) {
      for (const c of r.address_components) {
        allComponents.push(c);
      }
    }

    // For district, try level_3 first (often the actual district in India),
    // then fall back to level_2 (can be a revenue division like "Central Division").
    const districtRaw =
      extractComponent(allComponents, "administrative_area_level_3") ||
      extractComponent(allComponents, "administrative_area_level_2");
    const district = normalizeDistrictName(districtRaw);

    // Use the most detailed result (first one) for the remaining fields
    const result = response.results[0];
    const components = result.address_components;

    return {
      district,
      city: extractComponent(
        components,
        "locality",
        "administrative_area_level_3"
      ),
      locality: extractComponent(
        components,
        "sublocality_level_1",
        "sublocality",
        "neighborhood"
      ),
      pin: extractComponent(components, "postal_code"),
      state: extractComponent(components, "administrative_area_level_1"),
      formattedAddress: result.formatted_address || "",
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
