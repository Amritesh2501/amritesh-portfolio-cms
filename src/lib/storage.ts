import "server-only";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

/**
 * One interface, two drivers. Swap with STORAGE_DRIVER in .env, no code change.
 *
 * `local` writes into ./public/uploads and Next serves it statically. Good for
 * dev and single-box deploys. It does NOT survive an ephemeral filesystem
 * (Vercel, Fly machines) - use `s3` there.
 *
 * `s3` talks to any S3-compatible bucket over plain fetch with SigV4 signing.
 * No AWS SDK: the two calls we need (PUT object, DELETE object) are ~60 lines
 * of signing, and the SDK is 10 MB of dependency for that.
 */
export interface StoredObject {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  filename: string;
}

export interface StorageDriver {
  readonly name: string;
  put(file: File): Promise<StoredObject>;
  delete(key: string): Promise<void>;
}

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  "application/pdf",
] as const;

export const MAX_UPLOAD_BYTES = Number(
  process.env.UPLOAD_MAX_BYTES ?? 5 * 1024 * 1024,
);

export class UploadError extends Error {}

/** Trust boundary: never let a client-supplied name or type through unchecked. */
export function assertUploadable(file: File) {
  if (!file || file.size === 0) {
    throw new UploadError("No file received.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(
      `File is ${(file.size / 1024 / 1024).toFixed(1)} MB. Limit is ${(
        MAX_UPLOAD_BYTES /
        1024 /
        1024
      ).toFixed(1)} MB.`,
    );
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type as never)) {
    throw new UploadError(
      `Type "${file.type || "unknown"}" is not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}.`,
    );
  }
}

/** Strips directories, control chars and anything that could escape the folder. */
export function safeKey(originalName: string) {
  const ext = path.extname(originalName).toLowerCase().slice(0, 10);
  const base = path
    .basename(originalName, path.extname(originalName))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "file"}-${randomUUID().slice(0, 8)}${ext}`;
}

// ---------------------------------------------------------------------------
// local disk
// ---------------------------------------------------------------------------

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const localDriver: StorageDriver = {
  name: "local",
  async put(file) {
    assertUploadable(file);
    const key = safeKey(file.name);
    await mkdir(UPLOAD_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, key), buffer);
    return {
      key,
      url: `/uploads/${key}`,
      size: buffer.byteLength,
      mimeType: file.type,
      filename: file.name,
    };
  },
  async delete(key) {
    // Refuse anything that is not a bare filename we generated.
    if (key.includes("/") || key.includes("\\") || key.includes("..")) return;
    await unlink(path.join(UPLOAD_DIR, key)).catch(() => {});
  },
};

// ---------------------------------------------------------------------------
// s3-compatible
// ---------------------------------------------------------------------------

function hmac(key: Buffer | string, data: string) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: Buffer | string) {
  return createHash("sha256").update(data).digest("hex");
}

function s3Config() {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION || "us-east-1";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new UploadError(
      'STORAGE_DRIVER is "s3" but S3_ENDPOINT / S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are not all set.',
    );
  }
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";
  const publicBase =
    process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    (forcePathStyle
      ? `${endpoint.replace(/\/$/, "")}/${bucket}`
      : `${endpoint.replace(/^https?:\/\//, (m) => m)}`.replace(
          /^(https?:\/\/)/,
          `$1${bucket}.`,
        ));
  return {
    endpoint: endpoint.replace(/\/$/, ""),
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    forcePathStyle,
    publicBase,
  };
}

async function s3Request(
  method: "PUT" | "DELETE",
  key: string,
  body: Buffer,
  contentType?: string,
) {
  const cfg = s3Config();
  const objectUrl = cfg.forcePathStyle
    ? `${cfg.endpoint}/${cfg.bucket}/${key}`
    : `${cfg.endpoint.replace(/^(https?:\/\/)/, `$1${cfg.bucket}.`)}/${key}`;

  const url = new URL(objectUrl);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);

  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (contentType) headers["content-type"] = contentType;

  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders =
    Object.keys(headers)
      .sort()
      .map((h) => `${h}:${headers[h].trim()}`)
      .join("\n") + "\n";

  const canonicalRequest = [
    method,
    url.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${cfg.secretAccessKey}`, dateStamp), cfg.region), "s3"),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  const res = await fetch(objectUrl, {
    method,
    headers: {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body: method === "PUT" ? new Uint8Array(body) : undefined,
  });

  if (!res.ok && res.status !== 404) {
    throw new UploadError(
      `S3 ${method} failed: ${res.status} ${await res.text().catch(() => "")}`.slice(
        0,
        400,
      ),
    );
  }
  return { publicUrl: `${cfg.publicBase}/${key}` };
}

const s3Driver: StorageDriver = {
  name: "s3",
  async put(file) {
    assertUploadable(file);
    const key = `media/${safeKey(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { publicUrl } = await s3Request("PUT", key, buffer, file.type);
    return {
      key,
      url: publicUrl,
      size: buffer.byteLength,
      mimeType: file.type,
      filename: file.name,
    };
  },
  async delete(key) {
    if (key.includes("..")) return;
    await s3Request("DELETE", key, Buffer.alloc(0));
  },
};

export function getStorage(): StorageDriver {
  return process.env.STORAGE_DRIVER === "s3" ? s3Driver : localDriver;
}
