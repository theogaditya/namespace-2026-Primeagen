import { NextRequest, NextResponse } from "next/server";

// Backend API URL
const BACKEND_URL = process.env.NEXT_PUBLIC_USER_BE_URL || "http://localhost:3000";

export interface OperatingDistrict {
  id: string;
  name: string;
  state: string;
  stateId: string;
}

interface DistrictsAPIResponse {
  success: boolean;
  data?: OperatingDistrict[];
  error?: string;
}

export async function GET(): Promise<NextResponse<DistrictsAPIResponse>> {
  try {
    // Fetch operating districts from backend
    const response = await fetch(`${BACKEND_URL}/api/districts`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Backend districts API error:", response.status);
      return NextResponse.json(
        { success: false, error: "Failed to fetch districts from backend" },
        { status: 502 }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      data: data.data || data,
    });
  } catch (error) {
    console.error("Districts API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch districts" },
      { status: 500 }
    );
  }
}
