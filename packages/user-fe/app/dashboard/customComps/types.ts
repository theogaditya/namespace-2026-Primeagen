// Types for dashboard components

export type ComplaintUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ComplaintStatus =
  | 'REGISTERED'
  | 'UNDER_PROCESSING'
  | 'FORWARDED'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'REJECTED'
  | 'ESCALATED_TO_MUNICIPAL_LEVEL'
  | 'ESCALATED_TO_STATE_LEVEL'
  | 'DELETED';

export type Department =
  | 'INFRASTRUCTURE'
  | 'EDUCATION'
  | 'REVENUE'
  | 'HEALTH'
  | 'WATER_SUPPLY_SANITATION'
  | 'ELECTRICITY_POWER'
  | 'TRANSPORTATION'
  | 'MUNICIPAL_SERVICES'
  | 'POLICE_SERVICES'
  | 'ENVIRONMENT'
  | 'HOUSING_URBAN_DEVELOPMENT'
  | 'SOCIAL_WELFARE'
  | 'PUBLIC_GRIEVANCES';

export interface ComplaintLocation {
  id: string;
  complaintId: string;
  pin: string;
  district: string;
  city: string;
  locality: string;
  street: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ComplaintUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
}

export interface ComplaintCategory {
  id: string;
  name: string;
  subCategories: string[];
  assignedDepartment: string;
}

// Assigned personnel types
export interface AssignedAgent {
  id: string;
  fullName: string;
  department: Department;
  dateOfCreation: string;
}

export interface MunicipalAdmin {
  id: string;
  fullName: string;
  department: Department;
  municipality: string;
  dateOfCreation: string;
}

export interface StateAdmin {
  id: string;
  fullName: string;
  department: Department;
  state: string;
  dateOfCreation: string;
}

export interface Complaint {
  id: string;
  seq: number;
  submissionDate: string;
  complainantId: string | null;
  subCategory: string;
  description: string;
  urgency: ComplaintUrgency;
  attachmentUrl: string | null;
  status: ComplaintStatus;
  upvoteCount: number;
  hasLiked?: boolean; // Whether the current user has liked this complaint
  isPublic: boolean;
  assignedAgentId: string | null;
  assignedDepartment: string;
  categoryId: string;
  dateOfResolution: string | null;
  escalationLevel: string | null;
  sla: string | null;
  AIabusedFlag: boolean | null;
  AIimageVarificationStatus: boolean | null;
  AIstandardizedSubCategory: string | null;
  lastUpdated: string;
  isDuplicate: boolean | null;
  managedByMunicipalAdminId: string | null;
  escalatedToStateAdminId: string | null;
  location: ComplaintLocation | null;
  User: ComplaintUser | null;
  category: ComplaintCategory;
  // Assigned personnel
  assignedAgent: AssignedAgent | null;
  managedByMunicipalAdmin: MunicipalAdmin | null;
  escalatedToStateAdmin: StateAdmin | null;
}

export interface ComplaintListResponse {
  success: boolean;
  message: string;
  data: Complaint[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SingleComplaintResponse {
  success: boolean;
  message: string;
  data: Complaint | null;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  preferredLanguage: string;
  disability: string | null;
  status: string;
  dateOfCreation: string;  // API returns dateOfCreation not createdAt
  lastUpdated?: string;
  location?: {
    id?: string;
    userId?: string;
    pin: string;
    district: string;
    city: string;
    locality: string;
    street?: string;
    municipal?: string;
    country?: string;
    state?: string;
  };
}

// Status display configuration
export const STATUS_CONFIG: Record<ComplaintStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
  REGISTERED: { label: 'Registered', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  UNDER_PROCESSING: { label: 'Processing', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  FORWARDED: { label: 'Forwarded', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  ON_HOLD: { label: 'On Hold', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  COMPLETED: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  REJECTED: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  ESCALATED_TO_MUNICIPAL_LEVEL: { label: 'Municipal Escalated', color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  ESCALATED_TO_STATE_LEVEL: { label: 'State Escalated', color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-200' },
  DELETED: { label: 'Deleted', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
};

// Urgency display configuration
export const URGENCY_CONFIG: Record<ComplaintUrgency, { label: string; color: string; bgColor: string; icon: string }> = {
  LOW: { label: 'Low', color: 'text-green-600', bgColor: 'bg-green-100', icon: '🟢' },
  MEDIUM: { label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: '🟡' },
  HIGH: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: '🟠' },
  CRITICAL: { label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-100', icon: '🔴' },
};

// Department display configuration
export const DEPARTMENT_CONFIG: Record<Department, { label: string; icon: string }> = {
  INFRASTRUCTURE: { label: 'Infrastructure', icon: '🏗️' },
  EDUCATION: { label: 'Education', icon: '📚' },
  REVENUE: { label: 'Revenue', icon: '💰' },
  HEALTH: { label: 'Health', icon: '🏥' },
  WATER_SUPPLY_SANITATION: { label: 'Water & Sanitation', icon: '💧' },
  ELECTRICITY_POWER: { label: 'Electricity', icon: '⚡' },
  TRANSPORTATION: { label: 'Transportation', icon: '🚌' },
  MUNICIPAL_SERVICES: { label: 'Municipal', icon: '🏛️' },
  POLICE_SERVICES: { label: 'Police', icon: '👮' },
  ENVIRONMENT: { label: 'Environment', icon: '🌳' },
  HOUSING_URBAN_DEVELOPMENT: { label: 'Housing', icon: '🏠' },
  SOCIAL_WELFARE: { label: 'Social Welfare', icon: '🤝' },
  PUBLIC_GRIEVANCES: { label: 'Grievances', icon: '📝' },
};

// Helper functions
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(dateString);
}
