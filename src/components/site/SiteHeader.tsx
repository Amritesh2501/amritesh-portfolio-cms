"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export type NavItem = { id: string; label: string; href: string; external: boolean };

export function SiteHeader({
  logoText,
  logoImage,
  navItems,
  availability,
}: {
  logoText: string;
  logoImage: string;
  navItems: NavItem[];
  availability: { status: string; text: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    // IntersectionObserver on a 1px sentinel instead of a scroll listener:
    // no per-frame work on the main thread.
    const sentinel = document.getElementById("scroll-sentinel");
    if (!sentinel) return;
    const io = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { rootMargin: "0px" },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const live = availability?.status === "OPEN";

  return (
    <>
      <div id="scroll-sentinel" aria-hidden className="absolute top-0 h-px w-full" />
      <header
        className="sticky top-0 z-[var(--z-nav)] border-b border-[var(--line)] transition-colors duration-200"
        style={{
          background: scrolled
            ? "color-mix(in srgb, var(--bg) 92%, transparent)"
            : "var(--bg)",
          backdropFilter: scrolled ? "blur(8px)" : undefined,
        }}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-10">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="Home"
            onClick={() => setOpen(false)}
          >
            {logoImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoImage} alt="" className="h-7 w-auto" />
            ) : (
              <span className="border border-[var(--fg)] px-2 py-1 font-[family-name:var(--font-display)] text-sm font-black tracking-tighter">
                {logoText}
              </span>
            )}
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className="t-label text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {availability?.text ? (
              <span className="hidden items-center gap-2 border border-[var(--line-strong)] px-2.5 py-1.5 md:inline-flex">
                {/* Real semantic state: whether he is open to work right now. */}
                <span
                  aria-hidden
                  className="h-1.5 w-1.5"
                  style={{ background: live ? "#4af626" : "var(--muted)" }}
                />
                <span className="t-meta text-[var(--fg)]">{availability.text}</span>
              </span>
            ) : null}

            <button
              type="button"
              className="btn btn-sm lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "Close" : "Menu"}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-nav"
            className="fixed inset-0 top-16 z-[var(--z-overlay)] border-t border-[var(--line)] bg-[var(--bg)] lg:hidden"
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <nav aria-label="Mobile" className="flex flex-col">
              {navItems.map((item, i) => (
                <Link
                  key={item.id}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  onClick={() => setOpen(false)}
                  className="flex items-baseline gap-4 border-b border-[var(--line)] px-4 py-5 sm:px-6"
                >
                  <span className="t-meta text-[var(--accent)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="t-display text-2xl">{item.label}</span>
                </Link>
              ))}
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
