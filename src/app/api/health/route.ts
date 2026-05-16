import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Health check endpoint — useful for uptime monitoring and deployment checks.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "atomquest-goal-portal",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.0.0",
    },
    { status: 200 }
  );
}
