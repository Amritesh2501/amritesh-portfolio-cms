// Scoped to the home route on purpose.
//
// A loading.tsx opens a Suspense boundary, which streams the shell and commits
// HTTP 200 before the page body runs. Placed one level up it would sit above
// /projects/[slug] and turn every unknown slug into a soft 404 (200 with 404
// content). The (home) route group keeps the skeleton on / without covering
// routes that need to answer 404.

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 pb-20 pt-20 sm:px-8 lg:px-12 lg:pt-24">
      <div className="grid gap-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
        <div className="grid gap-5">
          <div className="skeleton h-8 w-56 rounded-[var(--r-full)]" />
          <div className="skeleton h-28 w-full max-w-2xl" />
          <div className="skeleton h-5 w-72" />
          <div className="skeleton h-16 w-full max-w-lg" />
          <div className="mt-4 flex gap-3">
            <div className="skeleton h-12 w-36 rounded-[var(--r-full)]" />
            <div className="skeleton h-12 w-48 rounded-[var(--r-full)]" />
          </div>
        </div>
        <div className="skeleton h-80 w-full rounded-[var(--r-lg)]" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
