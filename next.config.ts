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

const config: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "cdn.simpleicons.org" },
      ...(s3Base
        ? [{ protocol: "https" as const, hostname: new URL(s3Base).hostname }]
        : []),
    ],
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
    ];
  },
};

export default config;
