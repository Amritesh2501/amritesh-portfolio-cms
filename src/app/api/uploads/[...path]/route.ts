import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { UPLOAD_DIR } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Serves files written by the local storage driver.
 *
 * Next builds a manifest of `public/` at BUILD time, so a file uploaded through
 * the CMS afterwards is not served by `next start`: the bytes are on disk and
 * the row is in Postgres, but the URL 404s. Dev hides this because the dev
 * server reads `public/` per request.
 *
 * A `beforeFiles` rewrite in next.config.ts points /uploads/* here, so stored
 * URLs stay clean and rows written before this route existed keep working.
 *
 * Only reachable when STORAGE_DRIVER=local; the s3 driver stores absolute URLs.
 */
const ROOT = UPLOAD_DIR;

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;

  // Resolve, then confirm the result is still inside the upload directory.
  // This is the check that stops ../../ escaping to arbitrary files, and it is
  // done on the RESOLVED path rather than by inspecting the input string.
  const target = path.resolve(ROOT, segments.join("/"));
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const extension = path.extname(target).toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  // Only hand back types the uploader is allowed to store. An unexpected
  // extension on disk is not something to guess a content type for.
  if (!contentType) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const info = await stat(target);
    if (!info.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }

    const body = await readFile(target);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        // Keys carry a random suffix and are never reused, so a stored file at
        // a given URL is immutable. Replacing a file mints a new key.
        "Cache-Control": "public, max-age=31536000, immutable",
        // SVGs can carry script. Served from our own origin they would run
        // there, so this stops the browser treating one as an active document.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
