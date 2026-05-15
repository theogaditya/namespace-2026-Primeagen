import { NextResponse } from "next/server";

// Backend API URL
const BACKEND_URL = process.env.NEXT_PUBLIC_USER_BE_URL || "http://localhost:3000";

export interface Category {
  id: string;
  name: string;
  assignedDepartment: string;
  subCategories: string[];
}

interface CategoriesAPIResponse {
  success: boolean;
  data?: Category[];
  error?: string;
}

// Map category names to department enum values
const DEPARTMENT_MAP: Record<string, string> = {
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

export async function GET(): Promise<NextResponse<CategoriesAPIResponse>> {
  try {
    // Fetch categories from backend
    console.log("Fetching categories from:", `${BACKEND_URL}/api/categories`);
    const response = await fetch(`${BACKEND_URL}/api/categories`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    console.log("Categories response status:", response.status);

    if (!response.ok) {
      console.log("Backend categories failed, using fallback");
      throw new Error("Backend categories fetch failed");
    }

    const data = await response.json();
    console.log("Categories data received:", JSON.stringify(data).slice(0, 200));
    
    // Transform the data to ensure assignedDepartment uses enum format
    const categories = (data.data || data).map((cat: Category) => ({
      ...cat,
      // Convert "Infrastructure" -> "INFRASTRUCTURE" etc
      assignedDepartment: DEPARTMENT_MAP[cat.assignedDepartment] || cat.assignedDepartment.toUpperCase().replace(/ & /g, '_').replace(/ /g, '_'),
    }));
    
    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Categories API error:", error);
    
    // Return hardcoded categories as fallback (should not happen normally)
    const fallbackCategories: Category[] = [
      { id: "cat-infrastructure", name: "Infrastructure", assignedDepartment: "INFRASTRUCTURE", subCategories: [] },
      { id: "cat-education", name: "Education", assignedDepartment: "EDUCATION", subCategories: [] },
      { id: "cat-revenue", name: "Revenue", assignedDepartment: "REVENUE", subCategories: [] },
      { id: "cat-health", name: "Health", assignedDepartment: "HEALTH", subCategories: [] },
      { id: "cat-water", name: "Water Supply & Sanitation", assignedDepartment: "WATER_SUPPLY_SANITATION", subCategories: [] },
      { id: "cat-electricity", name: "Electricity & Power", assignedDepartment: "ELECTRICITY_POWER", subCategories: [] },
      { id: "cat-transportation", name: "Transportation", assignedDepartment: "TRANSPORTATION", subCategories: [] },
      { id: "cat-municipal", name: "Municipal Services", assignedDepartment: "MUNICIPAL_SERVICES", subCategories: [] },
      { id: "cat-police", name: "Police Services", assignedDepartment: "POLICE_SERVICES", subCategories: [] },
      { id: "cat-environment", name: "Environment", assignedDepartment: "ENVIRONMENT", subCategories: [] },
      { id: "cat-housing", name: "Housing & Urban Development", assignedDepartment: "HOUSING_URBAN_DEVELOPMENT", subCategories: [] },
      { id: "cat-social", name: "Social Welfare", assignedDepartment: "SOCIAL_WELFARE", subCategories: [] },
      { id: "cat-grievances", name: "Public Grievances", assignedDepartment: "PUBLIC_GRIEVANCES", subCategories: [] },
    ];

    return NextResponse.json({
      success: true,
      data: fallbackCategories,
    });
  }
}
