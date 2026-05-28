export interface UserLocation {
  pin: string;
  district: string;
  city: string;
  locality: string;
  street?: string;
  municipal: string;
  state: string;
}

export interface UserSignup {
  email: string;
  phoneNumber: string;
  name: string;
  password: string;
  dateOfBirth: Date;
  aadhaarId: string;
  preferredLanguage: string;
  disability?: string;
  location: UserLocation;
}

export interface PostalPincodeResponse {
  Message: string;
  Status: string;
  PostOffice: Array<{
    Name: string;
    Description: string | null;
    BranchType: string;
    DeliveryStatus: string;
    Circle: string;
    District: string;
    Division: string;
    Region: string;
    Block: string;
    State: string;
    Country: string;
    Pincode: string;
  }>;
}

// Complaint related types
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
  pin: string;
  district: string;
  city: string;
  locality: string;
  street?: string;
  latitude?: number;
  longitude?: number;
}

export interface CreateComplaint {
  categoryId: string;
  subCategory: string;
  description: string;
  urgency?: ComplaintUrgency;
  attachmentUrl?: string;
  assignedDepartment: Department;
  isPublic: boolean;
  location: ComplaintLocation;
}

// Response types for complaint queries
export interface ComplaintLocationResponse {
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

export interface ComplaintUserResponse {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
}

export interface ComplaintCategoryResponse {
  id: string;
  name: string;
  subCategories: string[];
  assignedDepartment: string;
}

export interface ComplaintResponse {
  id: string;
  seq: number;
  submissionDate: Date;
  complainantId: string | null;
  subCategory: string;
  description: string;
  urgency: ComplaintUrgency;
  attachmentUrl: string | null;
  status: ComplaintStatus;
  upvoteCount: number;
  isPublic: boolean;
  assignedAgentId: string | null;
  assignedDepartment: string;
  categoryId: string;
  dateOfResolution: Date | null;
  escalationLevel: string | null;
  sla: string | null;
  AIabusedFlag: boolean | null;
  AIimageVarificationStatus: boolean | null;
  AIstandardizedSubCategory: string | null;
  lastUpdated: Date;
  isDuplicate: boolean | null;
  location: ComplaintLocationResponse | null;
  User: ComplaintUserResponse | null;
  category: ComplaintCategoryResponse;
  hasLiked?: boolean; // Whether the current user has liked this complaint
}

export interface ComplaintListResponse {
  success: boolean;
  message: string;
  data: ComplaintResponse[];
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
  data: ComplaintResponse | null;
}