"use client";

import { useEffect } from "react";

const TILT_DEG = 7;
const MAGNET = 0.22;

/**
 * Hover layer for the public site: a moonlight spotlight and a lit edge that
 * follow the cursor across cards, a tilt on linked cards, and a magnetic pull
 * on buttons.
 *
 * Built for cost, because the first version lagged: it wrote the pointer as
 * CSS custom properties on the card, and every write re-styled the card and
 * repainted two full-size gradient overlays. Measured at 150ms frames while
 * moving across the stack grid. Now:
 *  - one shared pair of light elements is moved into whichever card is
 *    hovered, and positioned with transform only, which the compositor handles
 *    without style or paint;
 *  - tilt and magnet are written straight to `style.transform`, so no custom
 *    property invalidates a subtree;
 *  - the listener only records the event; all work happens once per frame.
 *
 * Touch screens are skipped; there is no hover to decorate.
 */
export function HoverFx() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;

    const light = document.createElement("span");
    light.className = "fx-light";
    light.setAttribute("aria-hidden", "true");
    const lightSpot = document.createElement("span");
    lightSpot.className = "fx-light-spot";
    light.append(lightSpot);

    const edge = document.createElement("span");
    edge.className = "fx-edge";
    edge.setAttribute("aria-hidden", "true");
    const edgeSpot = document.createElement("span");
    edgeSpot.className = "fx-edge-spot";
    edge.append(edgeSpot);

    let surface: HTMLElement | null = null;
    let tilted: HTMLElement | null = null;
    let magnet: HTMLElement | null = null;
    let pull = { x: 0, y: 0 };
    let pending: PointerEvent | null = null;
    let raf = 0;

    const setSurface = (next: HTMLElement | null) => {
      if (next === surface) return;
      surface = next;
      light.classList.remove("on");
      edge.classList.remove("on");
      if (!next) return;
      next.append(light);
      if (next.classList.contains("card")) next.append(edge);
      else edge.remove();
      // Next frame, so the fade starts from 0 in the new card.
      requestAnimationFrame(() => {
        if (surface !== next) return;
        light.classList.add("on");
        edge.classList.add("on");
      });
    };

    const setTilt = (next: HTMLElement | null) => {
      if (tilted && tilted !== next) tilted.style.transform = "";
      tilted = next;
    };

    const setMagnet = (next: HTMLElement | null) => {
      if (magnet && magnet !== next) magnet.style.transform = "";
      if (magnet !== next) pull = { x: 0, y: 0 };
      magnet = next;
    };

    const apply = () => {
      raf = 0;
      const e = pending;
      if (!e) return;
      const target = e.target instanceof Element ? e.target : null;

      const nextSurface = target?.closest<HTMLElement>(".card, .spot") ?? null;
      setSurface(nextSurface);
      const nextTilt = nextSurface?.classList.contains("card-hover") ? nextSurface : null;
      setTilt(nextTilt);

      if (nextSurface) {
        const r = nextSurface.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        const at = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
        lightSpot.style.transform = at;
        edgeSpot.style.transform = at;
        if (nextTilt) {
          const rx = (x / r.width - 0.5) * TILT_DEG;
          const ry = (0.5 - y / r.height) * TILT_DEG;
          nextTilt.style.transform = `perspective(1100px) rotateX(${ry.toFixed(2)}deg) rotateY(${rx.toFixed(2)}deg) translateY(-6px)`;
        }
      }

      const button = target?.closest<HTMLElement>(".btn:not(:disabled)") ?? null;
      setMagnet(button);
      if (button) {
        // Subtract the pull already applied, or the button chases itself.
        const r = button.getBoundingClientRect();
        pull = {
          x: (e.clientX - (r.left - pull.x + r.width / 2)) * MAGNET,
          y: (e.clientY - (r.top - pull.y + r.height / 2)) * MAGNET * 1.4,
        };
        button.style.transform = `translate(${pull.x.toFixed(1)}px, ${pull.y.toFixed(1)}px)`;
      }
    };

    const onMove = (e: PointerEvent) => {
      pending = e;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      pending = null;
      setSurface(null);
      setTilt(null);
      setMagnet(null);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      onLeave();
      light.remove();
      edge.remove();
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return null;
}
