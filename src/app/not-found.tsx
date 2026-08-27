import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] items-center px-4">
      <div className="mx-auto w-full max-w-2xl">
        <p className="t-meta text-[var(--accent)]">404</p>
        <h1 className="t-display mt-4 text-[clamp(2.5rem,10vw,6rem)]">
          No route here
        </h1>
        <p className="mt-5 max-w-[50ch] text-sm leading-relaxed text-[var(--muted)]">
          The page does not exist, or the content behind it is not published yet.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-accent">
            Home
          </Link>
          <Link href="/projects" className="btn">
            All projects
          </Link>
        </div>
      </div>
    </main>
  );
}
