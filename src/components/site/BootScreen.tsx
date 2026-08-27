"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * Initial loading screen.
 *
 * Motivated, not decorative: it holds the first frame until fonts and the
 * first paint have settled, so the hero arrives composed instead of reflowing
 * a display-size headline in front of the visitor.
 *
 * Rules it follows:
 *  - once per browser session, never on every navigation
 *  - prefers-reduced-motion skips it entirely, no flash
 *  - it can never trap anyone: a hard ceiling dismisses it regardless
 *  - the whole thing is behind the `site.showIntro` CMS toggle
 */
const SESSION_KEY = "intro-shown";
const MAX_VISIBLE_MS = 2200;

export function BootScreen({
  logoText,
  name,
}: {
  logoText: string;
  name: string;
}) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (reduce) return;

    // sessionStorage throws in some privacy modes. Failing to read it must
    // mean "skip the intro", never "crash the page".
    let alreadyShown = true;
    try {
      alreadyShown = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      alreadyShown = true;
    }
    if (alreadyShown) return;

    setVisible(true);
    document.body.style.overflow = "hidden";

    const started = performance.now();
    let frame = 0;

    const tick = () => {
      const elapsed = performance.now() - started;
      // Ease toward 100 so it decelerates instead of running linearly.
      setProgress(Math.min(100, (1 - Math.pow(1 - elapsed / MAX_VISIBLE_MS, 3)) * 100));
      if (elapsed < MAX_VISIBLE_MS) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const dismiss = () => {
      setVisible(false);
      document.body.style.overflow = "";
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* private mode: it simply shows again next session */
      }
    };

    const ceiling = window.setTimeout(dismiss, MAX_VISIBLE_MS);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(ceiling);
      document.body.style.overflow = "";
    };
  }, [reduce]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          // Not aria-hidden: a screen reader user should be told the page is
          // loading rather than hearing nothing at all.
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[var(--z-boot)] flex flex-col items-center justify-center bg-[var(--bg)]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="hero-wash" aria-hidden />

          <motion.div
            className="relative flex flex-col items-center gap-7"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span
              aria-hidden
              className="flex h-16 w-16 items-center justify-center rounded-[var(--r-md)] border border-[var(--line-strong)] bg-[var(--surface)] text-lg font-semibold tracking-tight text-[var(--fg)]"
            >
              {logoText}
            </span>

            <span className="sr-only">Loading {name}</span>

            <div
              className="h-px w-40 overflow-hidden bg-[var(--line-strong)]"
              aria-hidden
            >
              <motion.div
                className="h-full bg-[var(--accent)]"
                style={{ width: `${progress}%` }}
                transition={{ ease: "linear" }}
              />
            </div>

            <motion.p
              className="t-meta text-[0.5625rem]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              aria-hidden
            >
              {name}
            </motion.p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
