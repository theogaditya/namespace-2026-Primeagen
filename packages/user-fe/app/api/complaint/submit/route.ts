import { NextRequest, NextResponse } from "next/server";

// Backend API URL
const BACKEND_URL = process.env.NEXT_PUBLIC_USER_BE_URL || "http://localhost:3000";

interface SubmitComplaintResponse {
  success: boolean;
  message?: string;
  data?: {
    categoryId: string;
    subCategory: string;
    assignedDepartment: string;
    submissionDate: string;
  };
  error?: string;
  errors?: Array<{ message: string; path: string[] }>;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<SubmitComplaintResponse>> {
  try {
    // Get auth token from cookies or headers
    const authToken = request.cookies.get("authToken")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required. Please log in." },
        { status: 401 }
      );
    }

    // Get form data (multipart for file upload)
    const formData = await request.formData();
    
    // Debug: Log form data entries
    console.log("=== Form Data Received ===");
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, typeof value === 'string' ? value : `[File: ${(value as File).name}]`);
    }

    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/api/complaints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    const data = await response.json();
    
    // Debug: Log backend response
    console.log("=== Backend Response ===");
    console.log("Status:", response.status);
    console.log("Data:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.message || "Failed to submit complaint",
          errors: data.errors,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message || "Complaint submitted successfully",
      data: data.data,
    });
  } catch (error) {
    console.error("Submit complaint error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit complaint" },
      { status: 500 }
    );
  }
}
