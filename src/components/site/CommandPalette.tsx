"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Command = { id: string; label: string; hint: string; run: () => void };

/**
 * Cmd/Ctrl+K. Motivated: this is a developer portfolio and its audience already
 * has the muscle memory. It navigates sections and jumps to the CMS, nothing
 * decorative.
 */
export function CommandPalette({
  navItems,
}: {
  navItems: { id: string; label: string; href: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => {
      setOpen(false);
      if (href.startsWith("/#")) {
        const id = href.slice(2);
        if (window.location.pathname === "/") {
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
          return;
        }
      }
      router.push(href);
    };

    return [
      ...navItems.map((item) => ({
        id: item.id,
        label: item.label,
        hint: "section",
        run: go(item.href),
      })),
      { id: "all-projects", label: "All projects", hint: "page", run: go("/projects") },
      { id: "cms", label: "Open CMS", hint: "admin", run: go("/admin") },
      {
        id: "top",
        label: "Back to top",
        hint: "action",
        run: () => {
          setOpen(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
      },
    ];
  }, [navItems, router]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setCursor(0);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => setCursor(0), [query]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[var(--z-toast)] flex items-start justify-center px-4 pt-[12vh]"
      style={{ background: "color-mix(in srgb, var(--bg) 82%, transparent)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-lg border border-[var(--line-strong)] bg-[var(--surface)]">
        <div className="flex items-center gap-2 border-b border-[var(--line-strong)] px-3">
          <span aria-hidden className="t-meta text-[var(--accent)]">
            {">"}
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, results.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              }
              if (e.key === "Enter") {
                e.preventDefault();
                results[cursor]?.run();
              }
            }}
            placeholder="Jump to"
            aria-label="Search commands"
            className="w-full bg-transparent py-3 font-mono text-sm text-[var(--fg)] outline-none placeholder:text-[var(--muted)]"
          />
          <kbd className="t-meta border border-[var(--line)] px-1.5 py-0.5">esc</kbd>
        </div>

        {results.length === 0 ? (
          <p className="px-4 py-6 t-meta">Nothing matches that.</p>
        ) : (
          <ul className="max-h-[50vh] overflow-y-auto py-1">
            {results.map((command, i) => (
              <li key={command.id}>
                <button
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={command.run}
                  aria-current={i === cursor}
                  className="flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left transition-colors"
                  style={{
                    background: i === cursor ? "var(--accent)" : "transparent",
                    color: i === cursor ? "#fff" : "var(--fg)",
                  }}
                >
                  <span className="font-mono text-[0.8125rem]">{command.label}</span>
                  <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] opacity-60">
                    {command.hint}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
