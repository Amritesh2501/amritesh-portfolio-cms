"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * Initial loading screen, drawn as a manga panel being inked.
 *
 * Motivated, not decorative: it holds the first frame until fonts and the
 * first paint have settled, so the hero arrives composed instead of reflowing
 * a display-size headline in front of the visitor.
 *
 * Rules it follows:
 *  - once per browser session, never on every navigation
 *  - it can never trap anyone: a hard ceiling dismisses it regardless
 *  - the whole thing is behind the `site.showIntro` CMS toggle
 *  - prefers-reduced-motion keeps the panel and the crossfade, and drops the
 *    stroke draw, the scale and the wipe. It used to skip the screen outright,
 *    which meant those visitors got a bare flash of unstyled arrival instead
 *    of a calm one.
 */
// Versioned: the previous key would suppress the new intro for anyone who
// had already seen the old one in this session.
const SESSION_KEY = "intro-shown-v2";
const MAX_VISIBLE_MS = 2000;
const EASE = [0.16, 1, 0.3, 1] as const;

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
      setProgress(
        Math.min(100, (1 - Math.pow(1 - elapsed / MAX_VISIBLE_MS, 3)) * 100),
      );
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
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          // Not aria-hidden: a screen reader user should be told the page is
          // loading rather than hearing nothing at all.
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[var(--z-boot)] flex items-center justify-center overflow-hidden bg-[var(--bg)]"
          initial={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.03 }}
          transition={{ duration: reduce ? 0.35 : 0.6, ease: EASE }}
        >
          {/* Screentone wash, so the empty page already reads as printed. */}
          <div
            aria-hidden
            className="mg-tone pointer-events-none absolute inset-0 opacity-70"
          />
          <div
            aria-hidden
            className="mg-speed mg-speed-spin pointer-events-none absolute inset-0"
          />

          <motion.div
            className="mg-panel relative flex flex-col items-center gap-6 px-12 py-10"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            transition={{ duration: reduce ? 0.35 : 0.55, ease: EASE }}
          >
            <span className="mg-caption absolute left-0 top-0">Loading</span>

            {/* The mark, drawn as an inked square rather than a rounded chip. */}
            <span
              aria-hidden
              className="flex h-16 w-16 items-center justify-center border-2 border-[var(--ink)] bg-[var(--fg)] text-lg font-bold tracking-tight text-[var(--bg)]"
            >
              {logoText}
            </span>

            <span className="sr-only">Loading {name}</span>

            {/* Ink bar. Width is driven by the rAF progress value, so it fills
                honestly rather than animating on a fixed timer that finishes
                before or after the page actually does. */}
            <div
              className="h-2 w-48 overflow-hidden border-2 border-[var(--ink)]"
              aria-hidden
            >
              <div
                className="h-full bg-[var(--accent)] transition-[width] duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="t-meta text-[0.5625rem]" aria-hidden>
              {name}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
