"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Arrow } from "./Arrow";

/**
 * Back to the top, once there is a top to go back to.
 *
 * Appears after roughly a viewport and a half, which is far enough down that
 * the header has been out of reach for a while. A button that is there from
 * the first pixel is clutter over a hero that already fills the screen.
 *
 * Presence is driven by an IntersectionObserver on a sentinel rather than a
 * scroll listener, matching the header: no per-frame work on the main thread
 * for something that changes twice a visit.
 *
 * The scroll itself goes through Lenis when Lenis is running, so the trip up
 * is eased the same way the rest of the page is instead of two scrollers
 * fighting over the same position.
 */
export function ToTop() {
  const [shown, setShown] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    Object.assign(sentinel.style, {
      position: "absolute",
      top: "150vh",
      left: "0",
      height: "1px",
      width: "100%",
      pointerEvents: "none",
    });
    document.body.append(sentinel);

    const io = new IntersectionObserver(([entry]) =>
      setShown(entry.boundingClientRect.top < 0),
    );
    io.observe(sentinel);

    return () => {
      io.disconnect();
      sentinel.remove();
    };
  }, []);

  const toTop = () => {
    const lenis = (window as unknown as {
      __lenis?: { scrollTo: (target: number) => void };
    }).__lenis;
    if (lenis) {
      lenis.scrollTo(0);
      return;
    }
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <AnimatePresence>
      {shown ? (
        <motion.button
          type="button"
          onClick={toTop}
          className="to-top"
          aria-label="Back to top"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.9 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <Arrow direction="up" />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
