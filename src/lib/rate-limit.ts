import "server-only";
import { prisma } from "@/lib/db";

/**
 * Fixed-window limiter backed by Postgres.
 *
 * ponytail: DB-backed rather than in-memory because the contact form is the one
 * public write path and an in-memory counter resets on every deploy and does
 * nothing across multiple instances. Swap for Redis/Upstash only if the contact
 * form ever becomes hot enough for the extra round-trip to matter.
 */
export async function rateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: boolean; remaining: number; retryAfterSeconds: number }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

  const existing = await prisma.rateLimit.findUnique({ where: { bucket } });

  if (!existing || existing.expiresAt <= now) {
    await prisma.rateLimit.upsert({
      where: { bucket },
      create: { bucket, count: 1, expiresAt },
      update: { count: 1, expiresAt },
    });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000),
      ),
    };
  }

  const updated = await prisma.rateLimit.update({
    where: { bucket },
    data: { count: { increment: 1 } },
  });

  return {
    ok: true,
    remaining: Math.max(0, limit - updated.count),
    retryAfterSeconds: 0,
  };
}

/** Best-effort client IP behind common proxies. */
export function clientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
