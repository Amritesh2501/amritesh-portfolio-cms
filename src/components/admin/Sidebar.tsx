"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { logout } from "@/actions/session";

export type SidebarLink = { href: string; label: string; badge?: number };
export type SidebarGroup = { title: string; links: SidebarLink[] };

export function Sidebar({
  groups,
  user,
}: {
  groups: SidebarGroup[];
  user: { name: string; email: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const nav = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <div className="border-b border-[var(--line)] px-4 py-4">
        <Link href="/admin" className="block" onClick={() => setOpen(false)}>
          <span className="t-display text-base">CMS</span>
        </Link>
        <p className="t-meta mt-1 text-[0.625rem]">Content control</p>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {groups.map((group) => (
          <div key={group.title} className="px-2 py-2">
            <p className="t-meta px-2 py-1.5 text-[0.5625rem]">{group.title}</p>
            <ul>
              {group.links.map((link) => {
                const active =
                  pathname === link.href ||
                  (link.href !== "/admin" && pathname.startsWith(`${link.href}/`));
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className="flex items-center justify-between gap-2 px-2 py-2 font-mono text-[0.75rem] transition-colors"
                      style={{
                        background: active ? "var(--accent)" : "transparent",
                        color: active ? "#fff" : "var(--muted)",
                      }}
                    >
                      <span>{link.label}</span>
                      {link.badge ? (
                        <span
                          className="min-w-5 border px-1 text-center text-[0.625rem] tabular-nums"
                          style={{
                            borderColor: active
                              ? "rgba(255,255,255,0.5)"
                              : "var(--line-strong)",
                          }}
                        >
                          {link.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--line)] px-4 py-4">
        <p className="t-meta text-[0.625rem] text-[var(--fg)]">{user.name}</p>
        <p className="t-meta mt-0.5 break-all text-[0.5625rem]">{user.email}</p>
        <div className="mt-3 flex gap-2">
          <Link href="/" target="_blank" className="btn btn-sm flex-1">
            Site
          </Link>
          <button
            type="button"
            className="btn btn-sm flex-1"
            disabled={pending}
            onClick={() => startTransition(() => void logout())}
          >
            {pending ? "..." : "Sign out"}
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      <div className="sticky top-0 z-[var(--z-nav)] flex items-center justify-between border-b border-[var(--line)] bg-[var(--bg)] px-4 py-3 lg:hidden">
        <Link href="/admin" className="t-display text-sm">
          CMS
        </Link>
        <button
          type="button"
          className="btn btn-sm"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      <aside className="hidden w-56 shrink-0 border-r border-[var(--line)] lg:sticky lg:top-0 lg:block lg:h-[100dvh]">
        {nav}
      </aside>

      {open ? (
        <div className="fixed inset-0 top-[53px] z-[var(--z-overlay)] bg-[var(--bg)] lg:hidden">
          {nav}
        </div>
      ) : null}
    </>
  );
}
