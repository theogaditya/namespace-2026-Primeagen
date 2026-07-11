export interface CategoryInfo {
  surveyCategories: string[];
  backendCategories: string[];
  keywords: string[];
}

export const CATEGORY_MAP: Record<string, CategoryInfo> = {
  Infrastructure: {
    surveyCategories: [
      "damaged_roads", "potholes", "broken_footpath",
      "collapsed_bridge", "damaged_flyover", "bus_stop_infra",
      "boundary_wall_damage", "damaged_boundary_wall",
      "cracked_building_wall", "signboard_damage",
    ],
    backendCategories: ["Infrastructure"],
    keywords: [
      "road", "pothole", "bridge", "footpath", "flyover",
      "construction", "building", "infrastructure", "repair",
    ],
  },

  "Water Supply & Sanitation": {
    surveyCategories: [
      "water_shortage", "water_supply_interruptions",
      "contaminated_water", "water_supply_and_sanitation",
      "Water & Sewerage Budget", "Wastewater Treatment",
      "sewage_overflow", "blocked_drain", "waterlogging",
      "flooding",
    ],
    backendCategories: ["Water Supply & Sanitation"],
    keywords: [
      "water", "sanitation", "sewage", "drain", "flood",
      "waterlogging", "pipeline", "contaminated", "supply",
    ],
  },

  Health: {
    surveyCategories: ["health", "mosquito_breeding"],
    backendCategories: ["Health"],
    keywords: [
      "health", "hospital", "disease", "medical", "mosquito",
      "dengue", "malaria", "clinic", "sanitation",
    ],
  },

  Education: {
    surveyCategories: ["education"],
    backendCategories: ["Education"],
    keywords: [
      "education", "school", "college", "teacher", "student",
      "literacy", "classroom", "enrollment",
    ],
  },

  Environment: {
    surveyCategories: [
      "environment", "air_pollution", "noise_pollution",
      "tree_fall", "tree_fall_hazard",
      "solid_waste_mismanagement", "solid_waste_uncollected",
    ],
    backendCategories: ["Environment"],
    keywords: [
      "environment", "pollution", "air", "noise", "waste",
      "garbage", "tree", "green", "climate", "emission",
    ],
  },

  "Electricity & Power": {
    surveyCategories: [
      "electricity_and_power", "power_outage",
      "street_light_failure", "streetlight_outage",
      "broken_traffic_light",
    ],
    backendCategories: ["Electricity & Power"],
    keywords: [
      "electricity", "power", "streetlight", "outage",
      "transformer", "voltage", "light", "electric",
    ],
  },

  "Municipal Services": {
    surveyCategories: [
      "municipal_services", "open_manhole", "opened_manhole",
      "park_maintenance", "Community Toilets",
      "Toilet Complaints", "public_toilet_hygiene",
      "public_toilet_shortage", "encroachment",
    ],
    backendCategories: ["Municipal Services"],
    keywords: [
      "municipal", "manhole", "park", "toilet", "civic",
      "garbage", "cleaning", "sweeping", "encroachment",
    ],
  },

  Transportation: {
    surveyCategories: [
      "transportation", "transport_safety",
      "bus_stop_issues", "illegal_parking",
    ],
    backendCategories: ["Transportation"],
    keywords: [
      "transport", "bus", "traffic", "road", "vehicle",
      "parking", "metro", "railway", "commute",
    ],
  },

  "Police Services": {
    surveyCategories: [
      "police_services", "stray_animals", "stray_dogs",
    ],
    backendCategories: ["Police Services"],
    keywords: [
      "police", "crime", "safety", "security", "stray",
      "dog", "animal", "theft", "law",
    ],
  },

  "Housing & Urban Development": {
    surveyCategories: ["housing_and_urban_development"],
    backendCategories: ["Housing & Urban Development"],
    keywords: [
      "housing", "urban", "development", "slum",
      "construction", "building", "apartment", "colony",
    ],
  },

  "Social Welfare": {
    surveyCategories: [
      "social_welfare", "women_and_child_development",
    ],
    backendCategories: ["Social Welfare"],
    keywords: [
      "social", "welfare", "women", "child", "pension",
      "disability", "ration", "scheme", "benefit",
    ],
  },

  "Public Grievances": {
    surveyCategories: ["public_grievances"],
    backendCategories: ["Public Grievances"],
    keywords: [
      "grievance", "complaint", "public", "citizen",
      "redressal", "corruption", "service",
    ],
  },

  Revenue: {
    surveyCategories: ["revenue"],
    backendCategories: ["Revenue"],
    keywords: [
      "revenue", "tax", "property", "land", "registration",
      "mutation", "assessment",
    ],
  },

  Agriculture: {
    surveyCategories: ["agriculture", "rural_development"],
    backendCategories: [],
    keywords: [
      "agriculture", "farming", "crop", "irrigation",
      "rural", "farmer", "harvest", "soil",
    ],
  },

  "Fire & Emergency": {
    surveyCategories: ["fire_and_emergency"],
    backendCategories: [],
    keywords: [
      "fire", "emergency", "rescue", "disaster",
      "ambulance", "hazard",
    ],
  },

  "Sports & Youth Affairs": {
    surveyCategories: ["sports_and_youth_affairs"],
    backendCategories: [],
    keywords: [
      "sports", "youth", "playground", "stadium",
      "athletics", "recreation",
    ],
  },

  "Tourism & Culture": {
    surveyCategories: ["tourism_and_culture"],
    backendCategories: [],
    keywords: [
      "tourism", "culture", "heritage", "monument",
      "museum", "festival",
    ],
  },
};

export const VALID_CATEGORIES = Object.keys(CATEGORY_MAP);

export function simpleStem(word: string): string {
  let w = word.toLowerCase();
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  if (w.endsWith("ing") && w.length > 5) return w.slice(0, -3);
  if (w.endsWith("tion") && w.length > 5) return w.slice(0, -4);
  if (w.endsWith("ment") && w.length > 5) return w.slice(0, -4);
  if (w.endsWith("ness") && w.length > 5) return w.slice(0, -4);
  if (w.endsWith("ous") && w.length > 4) return w.slice(0, -3);
  if (w.endsWith("ed") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("es") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) return w.slice(0, -1);
  return w;
}

function stemTokens(text: string): Set<string> {
  const raw = text.toLowerCase().replace(/_/g, " ").replace(/-/g, " ").split(/\s+/).filter(t => t.length > 1);
  const stems = new Set<string>();
  for (const t of raw) {
    stems.add(t);
    stems.add(simpleStem(t));
  }
  return stems;
}

export function resolveCategory(userInput: string): string | null {
  if (!userInput || !userInput.trim()) return null;

  const query = userInput.trim();
  const queryLower = query.toLowerCase();

  // Strategy 1: Exact match (case-insensitive)
  for (const cat of VALID_CATEGORIES) {
    if (cat.toLowerCase() === queryLower) return cat;
  }

  // Strategy 2: Substring match
  for (const cat of VALID_CATEGORIES) {
    const catLower = cat.toLowerCase();
    if (queryLower.includes(catLower) || catLower.includes(queryLower)) {
      return cat;
    }
  }

  // Strategy 3: Match against surveyCategory names (dataset uses these)
  const queryStemmed = stemTokens(queryLower);
  for (const [cat, info] of Object.entries(CATEGORY_MAP)) {
    for (const sc of info.surveyCategories) {
      const scStemmed = stemTokens(sc);
      let overlap = 0;
      for (const qs of queryStemmed) {
        if (scStemmed.has(qs)) overlap++;
      }
      if (overlap >= 1) return cat;
    }
  }

  // Strategy 4: Stem-aware keyword matching
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [cat, info] of Object.entries(CATEGORY_MAP)) {
    const keywordStems = new Set<string>();
    for (const kw of info.keywords) {
      keywordStems.add(kw.toLowerCase());
      keywordStems.add(simpleStem(kw.toLowerCase()));
    }
    // Also add surveyCategory name tokens as keywords
    for (const sc of info.surveyCategories) {
      for (const token of sc.toLowerCase().replace(/_/g, " ").split(/\s+/)) {
        if (token.length > 2) {
          keywordStems.add(token);
          keywordStems.add(simpleStem(token));
        }
      }
    }

    let overlap = 0;
    for (const qt of queryStemmed) {
      if (keywordStems.has(qt)) {
        overlap += 1;
      } else {
        for (const kw of keywordStems) {
          if (qt.length >= 3 && kw.length >= 3 && (qt.includes(kw) || kw.includes(qt))) {
            overlap += 0.5;
            break;
          }
        }
      }
    }

    if (overlap > bestScore) {
      bestScore = overlap;
      bestMatch = cat;
    }
  }

  if (bestMatch && bestScore >= 0.5) return bestMatch;

  return null;
}

