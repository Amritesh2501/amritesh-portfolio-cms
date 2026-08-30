"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Public-site error boundary.
 *
 * Without this, a database blip renders an opaque 500 with no explanation and
 * no way forward. The specific message is stripped from production builds by
 * React, so the digest is the only handle on what happened: it is printed here
 * and matches the line in the server log.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Public site render failed:", error);
  }, [error]);

  return (
    <main className="relative isolate flex min-h-[70dvh] items-center overflow-hidden px-6">
      <div className="hero-wash" aria-hidden />
      <div className="relative mx-auto w-full max-w-2xl">
        <p className="t-meta text-[var(--accent)]">Service interrupted</p>
        <h1 className="t-display-lg mt-5 text-[clamp(2rem,7vw,4rem)]">
          This section could not load
        </h1>
        <p className="t-lead mt-7 max-w-[52ch]">
          The content for this page could not be fetched. That is almost always
          the database being briefly unavailable, not something you did.
        </p>

        {error.digest ? (
          <p className="mt-6 font-mono text-[0.75rem] text-[var(--muted)]">
            Reference: {error.digest}
          </p>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="btn btn-accent">
            Try again
          </button>
          <Link href="/" className="btn">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
