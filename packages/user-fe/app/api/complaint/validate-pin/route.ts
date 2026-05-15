import { NextRequest, NextResponse } from "next/server";

interface PostalPincodeResponse {
  Message: string;
  Status: string;
  PostOffice: Array<{
    Name: string;
    District: string;
    State: string;
    Country: string;
    Pincode: string;
  }> | null;
}

interface PinValidationAPIResponse {
  success: boolean;
  data?: {
    valid: boolean;
    city?: string;
    district?: string;
    state?: string;
    matchesSelectedDistrict?: boolean;
  };
  error?: string;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<PinValidationAPIResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get("pin");
    const selectedDistrict = searchParams.get("district");

    if (!pin || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: "Invalid PIN code format. Must be 6 digits." },
        { status: 400 }
      );
    }

    // Fetch pin details from postal API
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pin}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to validate PIN code" },
        { status: 502 }
      );
    }

    const data: PostalPincodeResponse[] = await response.json();

    if (
      !data ||
      !data[0] ||
      data[0].Status !== "Success" ||
      !data[0].PostOffice ||
      data[0].PostOffice.length === 0
    ) {
      return NextResponse.json({
        success: true,
        data: {
          valid: false,
        },
      });
    }

    const postOffice = data[0].PostOffice[0];
    const pinDistrict = postOffice.District;
    const pinCity = postOffice.Name;
    const pinState = postOffice.State;

    // Check if PIN matches selected district (case-insensitive)
    let matchesSelectedDistrict = true;
    if (selectedDistrict) {
      matchesSelectedDistrict =
        pinDistrict.toLowerCase() === selectedDistrict.toLowerCase();
    }

    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        city: pinCity,
        district: pinDistrict,
        state: pinState,
        matchesSelectedDistrict,
      },
    });
  } catch (error) {
    console.error("PIN validation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate PIN code" },
      { status: 500 }
    );
  }
}
