import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user?.id) redirect("/admin");

  const { callbackUrl } = await searchParams;

  // Only same-origin paths are accepted, so ?callbackUrl=https://evil.example
  // cannot turn the login page into an open redirect.
  const safeCallback =
    callbackUrl && /^\/admin(\/|$)/.test(callbackUrl) ? callbackUrl : "/admin";

  return (
    <main className="relative isolate flex min-h-[100dvh] items-center justify-center overflow-hidden px-6">
      <div className="hero-wash" aria-hidden />
      <div className="relative w-full max-w-sm">
        <div className="card overflow-hidden shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
            <span className="t-meta text-[var(--fg)]">authenticate</span>
            <span className="t-meta text-[var(--accent)]">restricted</span>
          </div>

          <div className="p-6 sm:p-8">
            <h1 className="t-display text-[1.75rem]">CMS access</h1>
            <p className="mt-2 t-meta text-[0.625rem] leading-relaxed">
              Credentials are verified on the server against a hashed password.
            </p>

            <div className="mt-6">
              <LoginForm callbackUrl={safeCallback} />
            </div>
          </div>
        </div>

        <p className="mt-6 text-center t-meta text-[0.625rem]">
          <a href="/" className="hover:text-[var(--fg)]">
            Back to the site
          </a>
        </p>
      </div>
    </main>
  );
}
