export type ComplaintUrgency = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ComplaintCategoryCatalog {
  name: string;
  subCategories: string[];
  learnedSubCategories?: string[];
}

export interface ComplaintFlowState {
  active: boolean;
  description?: string;
  category?: string;
  subCategory?: string;
  district?: string;
  city?: string;
  pin?: string;
  locality?: string;
  urgency?: ComplaintUrgency;
  detectLocationRequested?: boolean;
  photoAttached?: boolean;
  lastUpdatedAt: number;
}

interface ComplaintStateUpdateContext {
  categoryCatalog?: ComplaintCategoryCatalog[];
  imageAttached?: boolean;
}

const COMPLAINT_INTENT_PATTERNS = [
  /\b(register|file|submit|create)\b.{0,20}\b(complaint|issue|report)\b/i,
  /\b(complaint|issue|problem|pothole|garbage|drainage|water leak|street light|sewage)\b/i,
  /\bi want to (?:report|register|file)\b/i,
];

const LOCATION_LINE_REGEX =
  /city:\s*(?<city>[^,]+),\s*district:\s*(?<district>[^,]+),\s*state:\s*(?<state>[^,]+),\s*pin:\s*(?<pin>[A-Za-z0-9-]+)/i;

const URGENCY_REGEX =
  /\b(?<urgency>low|medium|high|critical|urgent|emergency)\b/i;

const SHORT_REPLY_REGEX = /^(yes|yeah|yep|ok|okay|sure|no|nah|skip|later)$/i;

function cleanValue(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function inferUrgency(message: string): ComplaintUrgency | undefined {
  const match = message.match(URGENCY_REGEX)?.groups?.urgency?.toUpperCase();
  if (!match) return undefined;
  if (match === "URGENT" || match === "EMERGENCY") return "HIGH";
  if (match === "LOW" || match === "MEDIUM" || match === "HIGH" || match === "CRITICAL") {
    return match;
  }
  return undefined;
}

function inferLocation(message: string) {
  const structured = message.match(LOCATION_LINE_REGEX)?.groups;
  if (structured) {
    return {
      city: cleanValue(structured.city),
      district: cleanValue(structured.district),
      pin: cleanValue(structured.pin),
    };
  }

  const city = message.match(/\bcity\s*[:=-]\s*([^,.\n]+)/i)?.[1];
  const district = message.match(/\bdistrict\s*[:=-]\s*([^,.\n]+)/i)?.[1];
  const pin = message.match(/\bpin\s*[:=-]\s*([0-9]{6})\b/i)?.[1];
  const locality = message.match(/\blocality\s*[:=-]\s*([^,.\n]+)/i)?.[1];

  return {
    city: cleanValue(city),
    district: cleanValue(district),
    pin: cleanValue(pin),
    locality: cleanValue(locality),
  };
}

function inferCategory(
  message: string,
  categoryCatalog: ComplaintCategoryCatalog[] | undefined
): Pick<ComplaintFlowState, "category" | "subCategory"> {
  if (!categoryCatalog || categoryCatalog.length === 0) {
    return {};
  }

  const normalized = normalizeText(message);

  let bestCategory: string | undefined;
  let bestSubCategory: string | undefined;
  let bestScore = 0;

  for (const category of categoryCatalog) {
    const categoryName = normalizeText(category.name);
    if (categoryName && normalized.includes(categoryName) && categoryName.length > bestScore) {
      bestCategory = category.name;
      bestScore = categoryName.length;
    }

    const subCategories = [...category.subCategories, ...(category.learnedSubCategories || [])];
    for (const subCategory of subCategories) {
      const normalizedSub = normalizeText(subCategory);
      if (normalizedSub && normalized.includes(normalizedSub) && normalizedSub.length > bestScore) {
        bestCategory = category.name;
        bestSubCategory = subCategory;
        bestScore = normalizedSub.length;
      }
    }
  }

  return {
    category: bestCategory,
    subCategory: bestSubCategory,
  };
}

function shouldTreatAsDescription(message: string, active: boolean): boolean {
  const trimmed = message.trim();
  if (!trimmed || SHORT_REPLY_REGEX.test(trimmed)) return false;
  if (trimmed.length < 20) return false;
  if (LOCATION_LINE_REGEX.test(trimmed)) return false;
  if (trimmed.match(/\bcity\s*[:=-]|\bdistrict\s*[:=-]|\bpin\s*[:=-]/i)) return false;
  return active || looksLikeComplaintIntent(trimmed);
}

export function looksLikeComplaintIntent(message: string): boolean {
  return COMPLAINT_INTENT_PATTERNS.some((pattern) => pattern.test(message));
}

export function normalizeComplaintFlowState(
  state?: Partial<ComplaintFlowState> | null
): ComplaintFlowState | null {
  if (!state) return null;
  if (!state.active && !state.description && !state.category && !state.subCategory) {
    return null;
  }

  return {
    active: Boolean(state.active),
    description: cleanValue(state.description),
    category: cleanValue(state.category),
    subCategory: cleanValue(state.subCategory),
    district: cleanValue(state.district),
    city: cleanValue(state.city),
    pin: cleanValue(state.pin),
    locality: cleanValue(state.locality),
    urgency: state.urgency,
    detectLocationRequested: Boolean(state.detectLocationRequested),
    photoAttached: Boolean(state.photoAttached),
    lastUpdatedAt: typeof state.lastUpdatedAt === "number" ? state.lastUpdatedAt : Date.now(),
  };
}

export function getMissingComplaintFields(state: ComplaintFlowState | null): string[] {
  if (!state?.active) return [];
  const missing: string[] = [];
  if (!state.description) missing.push("description");
  if (!state.category) missing.push("category");
  if (!state.subCategory) missing.push("subCategory");
  if (!state.district && !state.city) missing.push("location");
  if (!state.urgency) missing.push("urgency");
  return missing;
}

export function updateComplaintStateFromUserMessage(
  state: ComplaintFlowState | null,
  message: string,
  context: ComplaintStateUpdateContext = {}
): ComplaintFlowState | null {
  const trimmed = message.trim();
  if (!trimmed) return state;

  const active = state?.active || looksLikeComplaintIntent(trimmed) || Boolean(context.imageAttached);
  if (!active) return state;

  const nextState: ComplaintFlowState = {
    active: true,
    description: state?.description,
    category: state?.category,
    subCategory: state?.subCategory,
    district: state?.district,
    city: state?.city,
    pin: state?.pin,
    locality: state?.locality,
    urgency: state?.urgency,
    detectLocationRequested: state?.detectLocationRequested,
    photoAttached: state?.photoAttached || Boolean(context.imageAttached),
    lastUpdatedAt: Date.now(),
  };

  const inferredLocation = inferLocation(trimmed);
  if (inferredLocation.city) nextState.city = inferredLocation.city;
  if (inferredLocation.district) nextState.district = inferredLocation.district;
  if (inferredLocation.pin) nextState.pin = inferredLocation.pin;
  if (inferredLocation.locality) nextState.locality = inferredLocation.locality;
  if (inferredLocation.city || inferredLocation.district || inferredLocation.pin || inferredLocation.locality) {
    nextState.detectLocationRequested = false;
  }

  const inferredUrgency = inferUrgency(trimmed);
  if (inferredUrgency) nextState.urgency = inferredUrgency;

  const inferredCategory = inferCategory(trimmed, context.categoryCatalog);
  if (!nextState.category && inferredCategory.category) {
    nextState.category = inferredCategory.category;
  }
  if (!nextState.subCategory && inferredCategory.subCategory) {
    nextState.subCategory = inferredCategory.subCategory;
  }

  if (!nextState.description && shouldTreatAsDescription(trimmed, active)) {
    nextState.description = trimmed;
  }

  return normalizeComplaintFlowState(nextState);
}

export function applyComplaintDraftToState(
  state: ComplaintFlowState | null,
  draft?: Record<string, unknown>
): ComplaintFlowState | null {
  if (!draft) return state;

  const nextState: ComplaintFlowState = {
    active: false,
    description: cleanValue(typeof draft.description === "string" ? draft.description : undefined),
    category: cleanValue(typeof draft.category === "string" ? draft.category : undefined),
    subCategory: cleanValue(typeof draft.subCategory === "string" ? draft.subCategory : undefined),
    district: cleanValue(typeof draft.district === "string" ? draft.district : undefined),
    city: cleanValue(typeof draft.city === "string" ? draft.city : undefined),
    pin: cleanValue(typeof draft.pin === "string" ? draft.pin : undefined),
    locality: cleanValue(typeof draft.locality === "string" ? draft.locality : undefined),
    urgency:
      typeof draft.urgency === "string" &&
      ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(draft.urgency)
        ? (draft.urgency as ComplaintUrgency)
        : state?.urgency,
    detectLocationRequested: false,
    photoAttached: state?.photoAttached,
    lastUpdatedAt: Date.now(),
  };

  return normalizeComplaintFlowState(nextState);
}

export function buildComplaintStateSystemContext(state: ComplaintFlowState | null): string | null {
  if (!state?.active) return null;

  const knownFields = [
    state.description ? `description=${JSON.stringify(state.description)}` : null,
    state.category ? `category=${JSON.stringify(state.category)}` : null,
    state.subCategory ? `subCategory=${JSON.stringify(state.subCategory)}` : null,
    state.district ? `district=${JSON.stringify(state.district)}` : null,
    state.city ? `city=${JSON.stringify(state.city)}` : null,
    state.pin ? `pin=${JSON.stringify(state.pin)}` : null,
    state.locality ? `locality=${JSON.stringify(state.locality)}` : null,
    state.urgency ? `urgency=${state.urgency}` : null,
    `detectLocationRequested=${state.detectLocationRequested ? "true" : "false"}`,
    `photoAttached=${state.photoAttached ? "true" : "false"}`,
  ].filter(Boolean);

  const missingFields = getMissingComplaintFields(state);

  return [
    "SERVER COMPLAINT STATE:",
    "This server-provided complaint state is authoritative. Do not ask for fields that are already present here.",
    `Known fields: ${knownFields.join(", ") || "none"}.`,
    `Missing required fields: ${missingFields.join(", ") || "none"}.`,
    "Ask only for the single next most useful missing field.",
    state.detectLocationRequested
      ? "Location detection has already been requested in this session. Do not call detectLocation again unless the state is cleared."
      : "If the user explicitly agrees to automatic location detection and location is still missing, you may call detectLocation.",
    missingFields.length === 0
      ? "All required fields are already available. Call createComplaintDraft now."
      : "Use the state to continue the workflow instead of relying on long-term memory.",
  ].join("\n");
}
