import { prisma } from "@/lib/db";
import { countablePath, isBot, referrerHost, today } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One page view: bump today's counter for the path, and the referring host if
 * it came from elsewhere. Always 204: a beacon has nobody to report an error
 * to, and analytics must never be the reason a page misbehaves.
 *
 * ponytail: anyone can POST here and inflate a number. It is a vanity counter
 * for the owner, not billing; add a per-IP limit if the numbers start lying.
 */
export async function POST(req: Request) {
  const done = new Response(null, { status: 204 });
  if (isBot(req.headers.get("user-agent"))) return done;

  const body = (await req.json().catch(() => null)) as { path?: unknown; ref?: unknown } | null;
  const path = countablePath(body?.path);
  if (!path) return done;

  const day = today();
  const host = referrerHost(body?.ref, req.headers.get("host")?.split(":")[0] ?? null);

  try {
    await prisma.$transaction([
      prisma.pageStat.upsert({
        where: { day_path: { day, path } },
        create: { day, path, views: 1 },
        update: { views: { increment: 1 } },
      }),
      ...(host
        ? [
            prisma.refStat.upsert({
              where: { day_host: { day, host } },
              create: { day, host, views: 1 },
              update: { views: { increment: 1 } },
            }),
          ]
        : []),
    ]);
  } catch {
    /* counted next time */
  }
  return done;
}
