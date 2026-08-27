import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-[100dvh] items-center overflow-hidden px-6">
      <div className="hero-wash" aria-hidden />
      <div className="relative mx-auto w-full max-w-2xl">
        <p className="t-meta text-[var(--accent)]">404</p>
        <h1 className="t-display-lg mt-5 text-[clamp(2.5rem,9vw,5.5rem)]">
          No route here
        </h1>
        <p className="t-lead mt-7 max-w-[48ch]">
          The page does not exist, or the content behind it is not published yet.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
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
