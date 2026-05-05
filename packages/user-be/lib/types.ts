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