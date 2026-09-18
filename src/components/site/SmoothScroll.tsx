"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { isLowPower } from "@/lib/perf";
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
    // Native scrolling runs on the compositor and survives a busy main thread.
    // Lenis does not: it sets the scroll position from JavaScript every frame,
    // so the moment the main thread stutters the page stutters with it. On a
    // device that is already struggling, the smooth scroller is the jitter.
    if (isLowPower()) return;
    const lenis = new Lenis({
      autoRaf: true,
      // Duration and an easing curve rather than a bare lerp. A lerp is a
      // fixed fraction per frame, so the tail of every scroll is an
      // exponential crawl that never quite arrives and reads as drift on a
      // long page. An eased duration lands.
      duration: 1.15,
      // Exponential out: almost all of the distance in the first third, then a
      // long settle. This is the curve that makes a wheel notch feel like it
      // has weight instead of like a delay.
      easing: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      anchors: { offset: -88 },
      autoToggle: true,
      allowNestedScroll: true,
      // Touch is left on the platform. Easing a finger drag fights the
      // system's own inertia and is what makes smooth-scroll libraries feel
      // broken on a phone.
      syncTouch: false,
      // A wheel notch moves a little further, so fewer of them cross a
      // full-height work panel.
      wheelMultiplier: 1.1,
    });

    lenis.on("scroll", ScrollTrigger.update);
    // Published so that anything moving the page on purpose, like the
    // back-to-top button, goes through the same easing instead of calling
    // window.scrollTo and fighting Lenis for the position. Not window.lenis:
    // the library already declares that one for its own feature detection.
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    return () => {
      lenis.off("scroll", ScrollTrigger.update);
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
      lenis.destroy();
    };
  }, []);

  return null;
}
