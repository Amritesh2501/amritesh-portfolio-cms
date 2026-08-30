"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Root boundary, inside the root layout.
 *
 * This is what catches an error thrown by a NESTED layout, which a sibling
 * error.tsx in that same segment cannot: a layout's own failure bubbles past
 * its segment boundary to the one above. Without this file, a failure in
 * (site)/layout.tsx renders the framework's bare 500 page.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Render failed:", error);
  }, [error]);

  return (
    <main className="relative isolate flex min-h-[100dvh] items-center overflow-hidden px-6">
      <div className="hero-wash" aria-hidden />
      <div className="relative mx-auto w-full max-w-2xl">
        <p className="t-meta text-[var(--accent)]">Service interrupted</p>
        <h1 className="t-display-lg mt-5 text-[clamp(2rem,7vw,4rem)]">
          The site could not load
        </h1>
        <p className="t-lead mt-7 max-w-[52ch]">
          Content could not be fetched. This is almost always the database being
          briefly unavailable rather than anything you did.
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
