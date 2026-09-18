"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ListIcon, XIcon } from "@phosphor-icons/react";
import { ThemeToggle } from "./ThemeToggle";

export type NavItem = { id: string; label: string; href: string; external: boolean };

/**
 * Three things across one 64px line: the mark, the links, the theme.
 *
 * The availability pill is gone from here. It is a sentence, and a sentence
 * sitting in a navigation bar is the thing that stops a bar reading as
 * navigation; it still appears in Contact, where someone is actually deciding
 * whether to write. What is left is quieter: the bar carries no border and no
 * fill until you leave the hero, so the top of the page is uninterrupted, and
 * the links sit on a moving pill rather than lighting up one at a time.
 */
export function SiteHeader({
  logoText,
  logoImage,
  navItems,
}: {
  logoText: string;
  logoImage: string;
  navItems: NavItem[];
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
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
              <span className="t-serif flex h-9 w-9 items-center justify-center rounded-[var(--r-full)] border border-[var(--line-strong)] text-[1.125rem] text-[var(--fg)] transition-colors duration-500 hover:border-[var(--accent)]">
                {logoText}
              </span>
            )}
          </Link>

          {/* One pill moves between the links instead of each link growing its
              own background. Sentence case at 13px, not 11px capitals: spaced
              capitals are a label style, and a row of them reads as a legend
              rather than as somewhere to go. */}
          <nav
            aria-label="Primary"
            className="hidden items-center lg:flex"
            onMouseLeave={() => setHovered(null)}
          >
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                onMouseEnter={() => setHovered(item.id)}
                onFocus={() => setHovered(item.id)}
                className="relative px-4 py-2 text-[0.8125rem] font-medium tracking-[-0.01em] text-[var(--muted)] transition-colors duration-300 hover:text-[var(--fg)]"
              >
                {hovered === item.id ? (
                  <motion.span
                    aria-hidden
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-[var(--r-full)] bg-[var(--elevated)]"
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 36 }
                    }
                  />
                ) : null}
                <span className="relative">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <button
              type="button"
              className="icon-btn lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <XIcon aria-hidden /> : <ListIcon aria-hidden />}
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
                    <span className="t-meta text-[0.6875rem] text-[var(--accent-ink)]">
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
