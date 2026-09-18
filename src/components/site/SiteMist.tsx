"use client";

import { useEffect, useRef } from "react";

// How far each bank can travel, in px. The second is the near one and moves
// further, so the two shear apart rather than sliding as a single sheet.
const REACH = [46, 84];
// Per-frame easing toward the target at 60Hz. Low enough that the fog lags the
// pointer noticeably, which is what makes it read as weight rather than as a
// cursor follower.
const EASE = 0.045;

/**
 * The ambient fog behind every page, and the pointer moving through it.
 *
 * The hero has its own weather in RiverScene; this is the rest of the site,
 * which until now was a static wash. The banks lean away from the pointer,
 * further the nearer they are, and drift back when it leaves.
 *
 * Costs one rAF while the pointer is moving and nothing at all once the fog
 * has settled: the loop stops itself when every bank is within a pixel of its
 * target and the next pointer move starts it again. Pointer handlers only
 * record coordinates; all the work happens on the frame.
 *
 * Transform only, on two promoted layers, so none of this touches layout.
 */
export function SiteMist() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const banks = Array.from(
      root.querySelectorAll<HTMLElement>(".site-mist-bank"),
    ).map((node, i) => ({ node, reach: REACH[i] ?? 40, x: 0, y: 0, last: "" }));
    if (!banks.length) return;

    // -0.5..0.5 of the viewport, set by the pointer and read on the frame.
    const target = { x: 0, y: 0 };
    let raf = 0;
    let running = false;

    const step = () => {
      let moving = false;

      for (const bank of banks) {
        // Away from the pointer, not toward it: air the cursor has pushed out
        // of the way. The sign is the whole difference between fog and a
        // spotlight.
        const toX = -target.x * bank.reach;
        const toY = -target.y * bank.reach * 0.6;

        bank.x += (toX - bank.x) * EASE;
        bank.y += (toY - bank.y) * EASE;

        if (Math.abs(toX - bank.x) > 0.5 || Math.abs(toY - bank.y) > 0.5) {
          moving = true;
        }

        const value = `translate3d(${bank.x.toFixed(1)}px, ${bank.y.toFixed(1)}px, 0)`;
        if (value !== bank.last) {
          bank.node.style.transform = value;
          bank.last = value;
        }
      }

      if (moving) {
        raf = requestAnimationFrame(step);
      } else {
        running = false;
      }
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(step);
    };

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX / window.innerWidth - 0.5;
      target.y = e.clientY / window.innerHeight - 0.5;
      start();
    };

    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      start();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={rootRef} aria-hidden className="site-mist keep-motion">
      <span className="site-mist-bank" />
      <span className="site-mist-bank" />
    </div>
  );
}
