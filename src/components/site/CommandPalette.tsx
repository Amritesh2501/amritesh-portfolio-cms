"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Command = { id: string; label: string; hint: string; run: () => void; keywords?: string };

export type PaletteProject = { slug: string; title: string; keywords: string };

/** The home page's sections, in page order. Ones missing from the page are harmless: the jump does nothing. */
const SECTIONS = [
  ["work", "Selected work"],
  ["about", "About"],
  ["experience", "Experience"],
  ["testimonials", "Kind words"],
  ["stack", "Stack and GitHub"],
  ["contact", "Contact"],
] as const;

/**
 * Cmd/Ctrl+K. Motivated: this is a developer portfolio and its audience already
 * has the muscle memory. It navigates sections and jumps to the CMS, nothing
 * decorative.
 */
export function CommandPalette({
  navItems,
  projects = [],
  hasNow = false,
  hasChat = false,
  email = "",
}: {
  navItems: { id: string; label: string; href: string }[];
  /** Every published project, to jump straight to its case study. */
  projects?: PaletteProject[];
  hasNow?: boolean;
  /** The assistant is switched on: offer to ask it whatever was typed. */
  hasChat?: boolean;
  email?: string;
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
      ...SECTIONS.filter(([id]) => !navItems.some((n) => n.href === `/#${id}`)).map(([id, label]) => ({
        id: `section-${id}`,
        label,
        hint: "section",
        run: go(`/#${id}`),
      })),
      ...projects.map((pr) => ({
        id: `project-${pr.slug}`,
        label: pr.title,
        hint: "project",
        keywords: pr.keywords,
        run: go(`/projects/${pr.slug}`),
      })),
      { id: "all-projects", label: "All projects", hint: "page", run: go("/projects") },
      ...(hasNow ? [{ id: "now", label: "What I'm doing now", hint: "page", keywords: "now current", run: go("/now") }] : []),
      { id: "experiments", label: "Experiments (the case room)", hint: "page", keywords: "game play", run: go("/experiments") },
      ...(email
        ? [
            {
              id: "copy-email",
              label: `Copy email (${email})`,
              hint: "action",
              keywords: "contact mail",
              run: () => {
                void navigator.clipboard?.writeText(email);
                setOpen(false);
              },
            },
          ]
        : []),
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
  }, [navItems, router, projects, hasNow, email]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    const hits = commands.filter((c) => `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q));
    // Whatever was typed can also go to the assistant, as the last option.
    if (hasChat && q.length > 2) {
      hits.push({
        id: "ask",
        label: `Ask: "${query.trim()}"`,
        hint: "assistant",
        run: () => {
          setOpen(false);
          window.dispatchEvent(new CustomEvent("chatbot:ask", { detail: query.trim() }));
        },
      });
    }
    return hits;
  }, [commands, query, hasChat]);

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
      <div className="w-full max-w-lg overflow-hidden rounded-[var(--r-md)] border border-[var(--line-strong)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
        <div className="flex items-center gap-2.5 border-b border-[var(--line)] px-4">
          <span aria-hidden className="t-meta text-[var(--accent-ink)]">
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
            placeholder={hasChat ? "Jump to a page or project, or ask a question" : "Jump to a page or project"}
            aria-label="Search commands"
            className="w-full bg-transparent py-3.5 text-[0.9375rem] tracking-[-0.012em] text-[var(--fg)] outline-none placeholder:text-[var(--muted)]"
          />
          <kbd className="t-meta rounded-[var(--r-xs)] border border-[var(--line)] px-2 py-1 text-[0.6875rem]">esc</kbd>
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
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors"
                  style={{
                    background: i === cursor ? "var(--accent)" : "transparent",
                    color: i === cursor ? "#fff" : "var(--fg)",
                  }}
                >
                  <span className="text-[0.9375rem] tracking-[-0.012em]">{command.label}</span>
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
