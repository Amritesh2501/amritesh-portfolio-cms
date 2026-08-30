import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Liveness AND readiness in one.
 *
 * The container healthcheck used to hit /admin/login, which renders without
 * touching the database. That reported "healthy" while every public page was
 * returning 500, which is exactly backwards. This endpoint actually round-trips
 * to Postgres, so a database the app cannot reach shows up as unhealthy.
 *
 * It deliberately leaks nothing: no connection string, no driver internals.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", database: "up", latencyMs: Date.now() - startedAt },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "error", database: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
