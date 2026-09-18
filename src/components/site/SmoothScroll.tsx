"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "lenis/dist/lenis.css";

/**
 * Eased, inertial page scrolling. Lenis still moves the real window scroll,
 * so motion's useScroll, the scroll reveals and position: sticky all keep
 * working untouched.
 *
 *  - Lenis honours prefers-reduced-motion by itself and falls back to native.
 *  - A page framed as a project preview keeps native scrolling.
 *  - autoToggle pauses it while <html> has overflow hidden (the intro).
 *  - allowNestedScroll lets inner scroll areas, like the command palette
 *    list, scroll on their own.
 *  - ScrollTrigger is refreshed from Lenis's own frame rather than left to its
 *    scroll listener. Lenis eases toward the target across many frames, and a
 *    listener that samples after the fact is always a frame behind it, which
 *    shows up as a scrubbed animation juddering against a smooth page.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (document.documentElement.dataset.embed) return;
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.09,
      anchors: { offset: -88 },
      autoToggle: true,
      allowNestedScroll: true,
    });

    lenis.on("scroll", ScrollTrigger.update);

    return () => {
      lenis.off("scroll", ScrollTrigger.update);
      lenis.destroy();
    };
  }, []);

  return null;
}
