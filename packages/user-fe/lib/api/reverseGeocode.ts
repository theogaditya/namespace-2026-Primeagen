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
    const district = /^khordha$/i.test(districtRaw.trim())
      ? "Khorda"
      : districtRaw;

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
  if (!geocodedDistrict) return null;

  const normalized = geocodedDistrict.toLowerCase().trim();

  // Exact match
  const exact = operatingDistricts.find(
    (d) => d.name.toLowerCase().trim() === normalized
  );
  if (exact) return exact.name;

  // Partial match (geocoded name contains district name or vice versa)
  const partial = operatingDistricts.find(
    (d) =>
      normalized.includes(d.name.toLowerCase().trim()) ||
      d.name.toLowerCase().trim().includes(normalized)
  );
  if (partial) return partial.name;

  return null;
}
