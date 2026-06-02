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
  imageValidationStatus: "idle" | "validating" | "valid" | "invalid" | "error";
  
  // Step 3 - Location
  district: string;
  pin: string;
  city: string;
  locality: string;
  street: string;
  latitude: string;
  longitude: string;
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
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  { name: "Infrastructure", icon: "🏗️", color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-200" },
  { name: "Education", icon: "📚", color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  { name: "Revenue", icon: "💰", color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-200" },
  { name: "Health", icon: "🏥", color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-200" },
  { name: "Water Supply & Sanitation", icon: "💧", color: "text-cyan-600", bgColor: "bg-cyan-50", borderColor: "border-cyan-200" },
  { name: "Electricity & Power", icon: "⚡", color: "text-yellow-600", bgColor: "bg-yellow-50", borderColor: "border-yellow-200" },
  { name: "Transportation", icon: "🚌", color: "text-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  { name: "Municipal Services", icon: "🏛️", color: "text-indigo-600", bgColor: "bg-indigo-50", borderColor: "border-indigo-200" },
  { name: "Police Services", icon: "👮", color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-slate-200" },
  { name: "Environment", icon: "🌳", color: "text-emerald-600", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  { name: "Housing & Urban Development", icon: "🏠", color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  { name: "Social Welfare", icon: "🤝", color: "text-pink-600", bgColor: "bg-pink-50", borderColor: "border-pink-200" },
  { name: "Public Grievances", icon: "📝", color: "text-gray-600", bgColor: "bg-gray-50", borderColor: "border-gray-200" },
];

// Urgency levels with display info
export const URGENCY_OPTIONS: {
  value: ComplaintUrgency;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}[] = [
  { value: "LOW", label: "Low", description: "Non-urgent issue, can wait", color: "text-green-600", bgColor: "bg-green-50" },
  { value: "MEDIUM", label: "Medium", description: "Should be addressed soon", color: "text-yellow-600", bgColor: "bg-yellow-50" },
  { value: "HIGH", label: "High", description: "Requires quick attention", color: "text-orange-600", bgColor: "bg-orange-50" },
  { value: "CRITICAL", label: "Critical", description: "Emergency, needs immediate action", color: "text-red-600", bgColor: "bg-red-50" },
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
