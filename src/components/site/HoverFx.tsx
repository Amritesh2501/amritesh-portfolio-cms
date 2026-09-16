"use client";

import { useEffect } from "react";

const TILT_DEG = 7;
const MAGNET = 0.22;

/**
 * Feeds the hover layer in globals.css. One delegated pointermove listener for
 * the whole site: it writes the pointer position onto whichever card or button
 * is under it, and CSS does all of the drawing (spotlight, edge glow, tilt,
 * magnetic pull). No per-element listeners, no React state.
 *
 * Touch screens are skipped; there is no hover to decorate.
 */
export function HoverFx() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;

    let magnet: HTMLElement | null = null;

    const release = () => {
      magnet?.style.removeProperty("--bx");
      magnet?.style.removeProperty("--by");
      magnet = null;
    };

    const onMove = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;

      const surface = target.closest<HTMLElement>(".card, .spot");
      if (surface) {
        const r = surface.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        surface.style.setProperty("--mx", `${x}px`);
        surface.style.setProperty("--my", `${y}px`);
        surface.style.setProperty("--rx", `${((x / r.width - 0.5) * TILT_DEG).toFixed(2)}deg`);
        surface.style.setProperty("--ry", `${((0.5 - y / r.height) * TILT_DEG).toFixed(2)}deg`);
      }

      const button = target.closest<HTMLElement>(".btn:not(:disabled)");
      if (button !== magnet) release();
      if (button) {
        magnet = button;
        // Measure without the pull already applied, or the button chases itself.
        const r = button.getBoundingClientRect();
        const bx = parseFloat(button.style.getPropertyValue("--bx")) || 0;
        const by = parseFloat(button.style.getPropertyValue("--by")) || 0;
        const cx = r.left - bx + r.width / 2;
        const cy = r.top - by + r.height / 2;
        button.style.setProperty("--bx", `${((e.clientX - cx) * MAGNET).toFixed(1)}px`);
        button.style.setProperty("--by", `${((e.clientY - cy) * MAGNET * 1.4).toFixed(1)}px`);
      }
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", release);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", release);
    };
  }, []);

  return null;
}
