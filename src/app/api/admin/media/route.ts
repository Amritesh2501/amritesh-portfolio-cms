import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * The one place a Route Handler is genuinely needed: the media picker fetches
 * on demand from a client component, which a Server Action cannot serve as a
 * plain GET. Auth is checked here exactly like every server action.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  const media = await prisma.media.findMany({
    where: query
      ? { filename: { contains: query, mode: "insensitive" } }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      url: true,
      filename: true,
      mimeType: true,
      size: true,
      alt: true,
    },
  });

  return NextResponse.json(
    { media },
    { headers: { "Cache-Control": "no-store" } },
  );
}
