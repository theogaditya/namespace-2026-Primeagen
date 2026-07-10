import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

declare global {
  // allow reuse of the pool in development hot reloads
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function getPool() {
  if (global.__pgPool) return global.__pgPool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString });
  if (process.env.NODE_ENV !== "production") global.__pgPool = pool;
  return pool;
}

export async function GET(request: NextRequest) {
  try {
    const pool = getPool();

    // Return all announcements without DB-side filtering; frontend will filter.
    const sql = `SELECT id, title, content, municipality, "isActive", priority, "startsAt", "expiresAt", "createdAt", "updatedAt"
      FROM announcements
      ORDER BY "createdAt" DESC`;

    const result = await pool.query(sql);
    const rows = result?.rows || [];

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error("Error fetching announcements from DB via pg:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
