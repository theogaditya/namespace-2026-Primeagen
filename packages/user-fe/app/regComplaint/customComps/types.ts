import { z } from "zod";

// Department enum matching backend
export type Department =
  | "INFRASTRUCTURE"
  | "EDUCATION"
  | "REVENUE"
  | "HEALTH"
  | "WATER_SUPPLY_SANITATION"
  | "ELECTRICITY_POWER"
  | "TRANSPORTATION"
  | "MUNICIPAL_SERVICES"
  | "POLICE_SERVICES"
  | "ENVIRONMENT"
  | "HOUSING_URBAN_DEVELOPMENT"
  | "SOCIAL_WELFARE"
  | "PUBLIC_GRIEVANCES";

export type ComplaintUrgency = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type QualityRating = "poor" | "fair" | "good" | "excellent";
export type ReviewAnalysisStatus = "idle" | "checking" | "ready" | "error";

// Category type from database
export interface Category {
  id: string;
  name: string;
  assignedDepartment: string;
  subCategories: string[];
}

// Operating district type from database
export interface OperatingDistrict {
  id: string;
  name: string;
  state: string;
  stateId: string;
}

export interface DedupMatch {
  id: string;
  seq: number;
  description: string;
  similarity: number;
  status: string;
  upvoteCount: number;
  pin?: string;
  district?: string;
}

export interface QualityBreakdown {
  clarity: number;
  evidence: number;
  location: number;
  completeness: number;
}

export interface AbuseFlaggedPhrase {
  original: string;
  masked: string;
  language: string;
  category: "abuse" | "threat" | "obscenity" | "hate_speech" | "personal_attack";
  severity: "low" | "medium" | "high";
}

export interface AbuseMetadata {
  severity?: "none" | "low" | "medium" | "high";
  clean_text?: string;
  explanation_en?: string;
  explanation_hi?: string;
  flagged_spans?: Array<{
    original: string;
    category?: string;
  }>;
  flagged_phrases?: AbuseFlaggedPhrase[];
  source?: string;
}

// Form state interface
export interface ComplaintFormState {
  // Step 1 - Category Selection
  categoryId: string;
  categoryName: string;
  assignedDepartment: Department | "";
  
  // Step 2 - Complaint Details
  subCategory: string;
  description: string;
  urgency: ComplaintUrgency;
  isPublic: boolean;
  photo: File | null;
  photoPreview: string;
  imageValidationStatus: "idle" | "validating" | "valid" | "invalid" | "error" | "unavailable";
  
  // Step 3 - Location
  district: string;
  pin: string;
  city: string;
  locality: string;
  street: string;
  latitude: string;
  longitude: string;

  // Step 4 - Review AI metadata
  dedupStatus: ReviewAnalysisStatus;
  dedupMatches: DedupMatch[];
  dedupSuggestion: string;
  dedupConfidence: number | null;
  hasSimilarComplaints: boolean;
  isDuplicate: boolean;

  qualityStatus: ReviewAnalysisStatus;
  qualityScore: number | null;
  qualityBreakdown: QualityBreakdown | null;
  qualitySuggestions: string[];
  qualityRating: QualityRating | null;

  abuseStatus: ReviewAnalysisStatus;
  abuseDetected: boolean;
  abuseSeverity: "none" | "low" | "medium" | "high" | null;
  abuseSanitizedText: string;
  abuseMetadata: AbuseMetadata | null;
}

export type ComplaintFormField = keyof ComplaintFormState;

// Category to Department mapping
export const CATEGORY_DEPARTMENT_MAP: Record<string, Department> = {
  "Infrastructure": "INFRASTRUCTURE",
  "Education": "EDUCATION",
  "Revenue": "REVENUE",
  "Health": "HEALTH",
  "Water Supply & Sanitation": "WATER_SUPPLY_SANITATION",
  "Electricity & Power": "ELECTRICITY_POWER",
  "Transportation": "TRANSPORTATION",
  "Municipal Services": "MUNICIPAL_SERVICES",
  "Police Services": "POLICE_SERVICES",
  "Environment": "ENVIRONMENT",
  "Housing & Urban Development": "HOUSING_URBAN_DEVELOPMENT",
  "Social Welfare": "SOCIAL_WELFARE",
  "Public Grievances": "PUBLIC_GRIEVANCES",
};

// Categories with icons and colors for display
export const CATEGORY_DISPLAY: {
  name: string;
  icon: string;
  lucideIcon: string;
  keywords: string;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  { name: "Infrastructure", icon: "🏗️", lucideIcon: "Wrench", keywords: "Roads, Bridges, Buildings", color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-200" },
  { name: "Education", icon: "📚", lucideIcon: "GraduationCap", keywords: "Schools, Colleges, Libraries", color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  { name: "Revenue", icon: "💰", lucideIcon: "Coins", keywords: "Tax, Land Records, Property", color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-200" },
  { name: "Health", icon: "🏥", lucideIcon: "HeartPulse", keywords: "Hospitals, Clinics, Medicine", color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-200" },
  { name: "Water Supply & Sanitation", icon: "💧", lucideIcon: "Droplets", keywords: "Water, Drainage, Sewage", color: "text-cyan-600", bgColor: "bg-cyan-50", borderColor: "border-cyan-200" },
  { name: "Electricity & Power", icon: "⚡", lucideIcon: "Zap", keywords: "Power Supply, Outages, Meters", color: "text-yellow-600", bgColor: "bg-yellow-50", borderColor: "border-yellow-200" },
  { name: "Transportation", icon: "🚌", lucideIcon: "Bus", keywords: "Roads, Public Transit, Traffic", color: "text-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  { name: "Municipal Services", icon: "🏛️", lucideIcon: "Building2", keywords: "Waste, Street Lights, Parks", color: "text-indigo-600", bgColor: "bg-indigo-50", borderColor: "border-indigo-200" },
  { name: "Police Services", icon: "👮", lucideIcon: "Shield", keywords: "Safety, Complaints, Security", color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-slate-200" },
  { name: "Environment", icon: "🌳", lucideIcon: "TreePine", keywords: "Pollution, Wildlife, Forests", color: "text-emerald-600", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  { name: "Housing & Urban Development", icon: "🏠", lucideIcon: "LayoutGrid", keywords: "Housing, Planning, Permits", color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  { name: "Social Welfare", icon: "🤝", lucideIcon: "HandHelping", keywords: "Pensions, Aid, Disabilities", color: "text-pink-600", bgColor: "bg-pink-50", borderColor: "border-pink-200" },
  { name: "Public Grievances", icon: "📝", lucideIcon: "Users", keywords: "General Issues, Feedback", color: "text-gray-600", bgColor: "bg-gray-50", borderColor: "border-gray-200" },
];

// Urgency levels with display info
export const URGENCY_OPTIONS: {
  value: ComplaintUrgency;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}[] = [
  { value: "LOW", label: "Low", description: "General maintenance", color: "text-green-600", bgColor: "bg-green-50" },
  { value: "MEDIUM", label: "Medium", description: "Routine priority", color: "text-yellow-600", bgColor: "bg-yellow-50" },
  { value: "HIGH", label: "High", description: "Needs urgent attention", color: "text-orange-600", bgColor: "bg-orange-50" },
];

// Helper function to count words
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// API response types
export interface CategoriesResponse {
  success: boolean;
  data?: Category[];
  error?: string;
}

export interface DistrictsResponse {
  success: boolean;
  data?: OperatingDistrict[];
  error?: string;
}

export interface PinValidationResponse {
  success: boolean;
  data?: {
    valid: boolean;
    city?: string;
    district?: string;
    state?: string;
  };
  error?: string;
}
