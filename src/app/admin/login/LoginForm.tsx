"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/actions/session";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(e.currentTarget);
    const result = await login(
      String(data.get("email") ?? ""),
      String(data.get("password") ?? ""),
    );

    if (!result.ok) {
      setError(result.error ?? "Sign in failed.");
      setPending(false);
      return;
    }

    // Full navigation so middleware sees the freshly set session cookie.
    router.replace(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-2">
        <label htmlFor="email" className="t-label text-[var(--fg)]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="field"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="password" className="t-label text-[var(--fg)]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
        />
      </div>

      {error ? (
        <p role="alert" className="t-meta text-[var(--accent)]">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-accent mt-2" disabled={pending}>
        {pending ? "Verifying" : "Sign in"}
      </button>
    </form>
  );
}
