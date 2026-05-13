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