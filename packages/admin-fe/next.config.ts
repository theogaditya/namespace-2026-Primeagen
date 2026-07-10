import type { NextConfig } from "next";

const nextConfig: NextConfig & { api?: { bodyParser?: { sizeLimit?: string } } } = {
  // Increase server-side API body size to allow larger image uploads
  // This affects API routes and app-route handlers that accept multipart bodies.
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
  // If SELF_MATCH_BACKEND is provided, rewrite requests to /api/self-match
  // to that upstream. This proxies at the edge and avoids invoking the
  // Next.js app-route which can hit Vercel serverless size limits.
  async rewrites() {
    const dest = process.env.SELF_MATCH_BACKEND || process.env.NEXT_PUBLIC_API_URL_SELF_MATCH
    if (!dest) return []
    return [
      {
        source: '/api/self-match',
        destination: dest,
      },
    ]
  },
};

export default nextConfig;
