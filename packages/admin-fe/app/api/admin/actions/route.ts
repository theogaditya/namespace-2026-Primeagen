import { NextRequest, NextResponse } from "next/server";

const ADMIN_BE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization");

  try {
    const action = await req.json();

    let url: string;
    let method: string = "PUT";
    let body: Record<string, unknown> = {};

    switch (action.type) {
      case "ESCALATE_COMPLAINT":
        url = `${ADMIN_BE_URL}/api/state-admin/complaints/${action.complaintId}/escalate`;
        method = "PUT";
        body = {};
        break;

      case "UPDATE_COMPLAINT_STATUS":
        url = `${ADMIN_BE_URL}/api/state-admin/complaints/${action.complaintId}/status`;
        method = "PUT";
        body = { status: action.newStatus };
        break;

      case "CREATE_ANNOUNCEMENT":
        url = `${ADMIN_BE_URL}/api/municipal-admin/announcements`;
        method = "POST";
        body = {
          title: action.title,
          content: action.content,
          priority: action.priority,
          municipality: action.municipality,
        };
        break;

      case "TRIGGER_AUTO_ASSIGN":
        url = `${ADMIN_BE_URL}/api/auto-assign/batch?limit=${action.batchSize}`;
        method = "POST";
        body = {};
        break;

      case "UPDATE_MUNICIPAL_ADMIN_STATUS":
        url = `${ADMIN_BE_URL}/api/state-admin/municipal-admins/${action.municipalAdminId}/status`;
        method = "PATCH";
        body = { status: action.newStatus };
        break;

      case "NAVIGATE":
        // No API call -return the path for the frontend to navigate
        return NextResponse.json({ success: true, navigate: action.path });

      default:
        return NextResponse.json({ error: "Unknown action type" }, { status: 400 });
    }

    const upstream = await fetch(url, {
      method,
      headers: {
        Authorization: token || "",
        "Content-Type": "application/json",
      },
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    });

    const data = await upstream.json().catch(() => ({ success: upstream.ok }));
    return NextResponse.json(data, { status: upstream.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] admin/actions proxy error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
