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
    // IntersectionObserver on a 1px sentinel rather than a scroll listener:
    // no per-frame work on the main thread.
    const sentinel = document.getElementById("scroll-sentinel");
    if (!sentinel) return;
    const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div id="scroll-sentinel" aria-hidden className="absolute top-0 h-px w-full" />

      <header
        className={`sticky top-0 z-[var(--z-nav)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          scrolled ? "glass border-b border-[var(--line)]" : "border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-6 px-6 sm:px-8 lg:px-12">
          <Link
            href="/"
            aria-label="Home"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5"
          >
            {logoImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoImage} alt="" className="h-7 w-auto" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-[var(--r-xs)] bg-[var(--fg)] text-[0.8125rem] font-semibold tracking-tight text-[var(--bg)]">
                {logoText}
              </span>
            )}
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className="rounded-[var(--r-full)] px-3.5 py-2 text-[0.875rem] font-medium tracking-[-0.01em] text-[var(--muted)] transition-colors duration-200 hover:bg-[var(--elevated)] hover:text-[var(--fg)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {availability?.text ? (
              <span className="hidden items-center gap-2 rounded-[var(--r-full)] border border-[var(--line-strong)] px-3 py-1.5 md:inline-flex">
                {/* Real semantic state: whether he is open to work right now. */}
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-[var(--r-full)]"
                  style={{
                    background:
                      availability.status === "OPEN" ? "#30d158" : "var(--muted)",
                  }}
                />
                <span className="text-[0.8125rem] font-medium tracking-[-0.01em] text-[var(--fg)]">
                  {availability.text}
                </span>
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
            className="glass fixed inset-0 top-16 z-[var(--z-overlay)] border-t border-[var(--line)] lg:hidden"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <nav aria-label="Mobile" className="flex flex-col px-6 py-4">
              {navItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: reduce ? 0 : i * 0.05,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Link
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    onClick={() => setOpen(false)}
                    className="flex items-baseline gap-4 border-b border-[var(--line)] py-5"
                  >
                    <span className="t-meta text-[0.5625rem] text-[var(--accent)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="t-display text-[1.75rem] text-[var(--fg)]">
                      {item.label}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
