import type { NextConfig } from "next";

const s3Base = process.env.S3_PUBLIC_BASE_URL;

// Server Actions cap request bodies at 1 MB by default, and media uploads go
// through a Server Action. Left at the default, any file over 1 MB dies inside
// the framework with an opaque error before assertUploadable() ever runs, so
// UPLOAD_MAX_BYTES would silently be a lie.
//
// The headroom matters as much as the limit: a file only slightly over
// UPLOAD_MAX_BYTES should be refused by our own validation, which explains the
// limit in plain language, not by the framework, which returns an opaque 500.
// 2 MB of slack covers multipart overhead and the usual near-miss upload.
// Files far beyond that are still cut off by the framework, which is the point:
// it stops us buffering an unbounded body.
const uploadMaxBytes = Number(process.env.UPLOAD_MAX_BYTES ?? 5 * 1024 * 1024);
const bodySizeLimit =
  `${Math.ceil(uploadMaxBytes / (1024 * 1024)) + 2}mb` as `${number}mb`;

// A CDN in front of the static assets: set ASSET_PREFIX to its origin (for
// example https://cdn.example.com, pulling from this app) and every
// /_next/static file is served from there. Unset, assets come from the app.
const assetPrefix = process.env.ASSET_PREFIX || undefined;

const config: NextConfig = {
  assetPrefix,
  experimental: {
    serverActions: { bodySizeLimit },
    // The site stylesheet goes into the HTML instead of a separate request,
    // so first paint no longer waits on a render-blocking CSS download.
    inlineCss: true,
  },
  images: {
    // Uploads are served as whatever was uploaded (often multi-MB PNGs). The
    // optimizer re-encodes them per browser; uploads have content-hashed
    // names, so the result can be cached for a year (by the browser and by
    // any CDN in front).
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "cdn.simpleicons.org" },
      ...(s3Base
        ? [{ protocol: "https" as const, hostname: new URL(s3Base).hostname }]
        : []),
    ],
  },
  async rewrites() {
    // Next serves public/ from a manifest built at BUILD time, so a file the
    // CMS uploads afterwards 404s under `next start`. beforeFiles runs ahead of
    // static file matching, so /uploads/* reaches the route handler that reads
    // from disk. Keeps stored URLs clean and old rows working.
    return {
      beforeFiles: [
        { source: "/uploads/:path*", destination: "/api/uploads/:path*" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // The security camera in the case room opens the visitor's own camera
        // (on request, never uploaded). Only this page gets it; a later match
        // overrides the key above.
        source: "/experiments",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default config;
