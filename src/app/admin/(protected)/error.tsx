"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Admin-side error boundary. Same idea as the public one, denser wording. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin render failed:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] items-center">
      <div className="w-full max-w-xl">
        <p className="t-meta text-[var(--accent)]">Error</p>
        <h1 className="t-display mt-4 text-[clamp(1.75rem,5vw,2.5rem)]">
          This screen could not load
        </h1>
        <p className="mt-5 max-w-[56ch] text-[0.9375rem] leading-relaxed text-[var(--muted)]">
          Usually the database is unreachable. Check that Postgres is running
          and that <code className="md-code">DATABASE_URL</code> is correct, then
          retry. Nothing was written.
        </p>

        {error.digest ? (
          <p className="mt-5 font-mono text-[0.75rem] text-[var(--muted)]">
            Reference: {error.digest}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="btn btn-accent">
            Retry
          </button>
          <Link href="/admin" className="btn">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
