// Scoped to the home route on purpose.
//
// A loading.tsx opens a Suspense boundary, which streams the shell and commits
// HTTP 200 before the page body runs. Placed one level up it would sit above
// /projects/[slug] and turn every unknown slug into a soft 404 (200 with 404
// content). The (home) route group keeps the skeleton on / without covering
// routes that need to answer 404.

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pt-16 sm:px-6 lg:px-10 lg:pt-24">
      <div className="grid gap-12 lg:grid-cols-[1.35fr_1fr]">
        <div className="grid gap-4">
          <div className="skeleton h-3 w-48" />
          <div className="skeleton h-24 w-full max-w-xl" />
          <div className="skeleton h-4 w-80" />
          <div className="skeleton h-4 w-64" />
          <div className="mt-4 flex gap-3">
            <div className="skeleton h-11 w-36" />
            <div className="skeleton h-11 w-44" />
          </div>
        </div>
        <div className="skeleton h-64 w-full" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
