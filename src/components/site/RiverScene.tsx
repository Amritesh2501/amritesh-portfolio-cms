"use client";

import { useEffect, useRef } from "react";

type Fish = {
  x: number;
  y: number;
  a: number;
  v: number;
  base: number;
  size: number;
  phase: number;
  turn: number;
};

type Mote = { x: number; y: number; vx: number; vy: number; rise: number; s: number; tw: number };
type Ripple = { x: number; y: number; r: number; max: number; life: number };

const TAU = Math.PI * 2;
const FLEE_RADIUS = 170;
const CURIOUS_RADIUS = 380;
// Fish and motes are soft; full retina resolution only multiplied the pixels
// cleared, drawn and uploaded every frame.
const MAX_DPR = 1.25;
// Motes are batched into this many brightness steps, one fill per step,
// instead of a fillStyle string and a fill call for every mote.
const MOTE_STEPS = 4;

const rnd = (min: number, max: number) => min + Math.random() * (max - min);

/** Signed shortest turn from angle `from` to angle `to`. */
const turnTo = (to: number, from: number) =>
  ((((to - from) % TAU) + TAU * 1.5) % TAU) - Math.PI;

/** A soft glow drawn once, then stamped under each fish. */
function makeGlow() {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(205, 175, 255, 0.55)");
    grad.addColorStop(1, "rgba(205, 175, 255, 0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  return c;
}

/**
 * The hero's living layer.
 *
 * CSS draws the fog; this adds what has to react: fish that scatter from a
 * fast cursor and drift closer to a still one, motes pushed aside, ripples
 * where the pointer skims or taps the water, a lantern of light that follows
 * the pointer, and depth parallax on every [data-depth] fog layer.
 *
 * Performance rules, each of which was a measured source of lag:
 *  - Pointer events only record coordinates; all work happens once per frame.
 *  - The element rect is read once per frame, never inside an event handler.
 *  - Styles are written straight to the elements that move, never as custom
 *    properties on a parent (that re-styles the whole subtree), and only when
 *    the value actually changed.
 *  - No canvas shadowBlur: the glow is a pre-rendered sprite.
 *  - Off screen, the loop stops and the CSS fog animations pause.
 *
 * ponytail: runs under prefers-reduced-motion too, because the scene is the
 * point of the page and was explicitly asked to move. Scale `dt` down under
 * matchMedia("(prefers-reduced-motion: reduce)") if that bothers anyone.
 */
export function RiverScene() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lanternRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const lantern = lanternRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !lantern || !ctx) return;

    let w = 0;
    let h = 0;

    const resize = () => {
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const glow = makeGlow();
    const small = w < 640;

    const fish: Fish[] = Array.from({ length: small ? 7 : 12 }, () => {
      const base = rnd(0.35, 0.85);
      return {
        x: rnd(0, w),
        y: rnd(0, h),
        a: rnd(0, TAU),
        v: base,
        base,
        size: rnd(14, 30),
        phase: rnd(0, TAU),
        turn: 0,
      };
    });

    const motes: Mote[] = Array.from({ length: small ? 30 : 64 }, () => ({
      x: rnd(0, w),
      y: rnd(0, h),
      vx: 0,
      vy: 0,
      rise: rnd(0.04, 0.22),
      s: rnd(0.5, 1.7),
      tw: rnd(0, TAU),
    }));

    const ripples: Ripple[] = [];

    // Raw input, written by event handlers and consumed by the frame loop.
    const input = { clientX: 0, clientY: 0, moved: false, present: false, taps: [] as { clientX: number; clientY: number }[] };
    const pointer = { x: -9999, y: -9999, inside: false, speed: 0, lastMove: 0, lastRipple: 0 };
    const parallax = { x: 0, y: 0, tx: 0, ty: 0 };

    const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-depth]")).map(
      (node) => ({ node, depth: Number(node.dataset.depth) || 0, last: "" }),
    );
    let lanternShown = false;
    let lanternLast = "";

    const onMove = (e: PointerEvent) => {
      input.clientX = e.clientX;
      input.clientY = e.clientY;
      input.moved = true;
      input.present = true;
    };
    const onDown = (e: PointerEvent) => {
      input.taps.push({ clientX: e.clientX, clientY: e.clientY });
    };
    const onLeave = () => {
      input.present = false;
      input.moved = true;
    };

    const drawFish = (f: Fish) => {
      const s = f.size;
      const sway = Math.sin(f.phase);
      const flick = Math.sin(f.phase - 0.9) * s * 0.16;

      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.a);

      ctx.globalAlpha = 0.5;
      ctx.drawImage(glow, -s * 0.8, -s * 0.5, s * 1.6, s);
      ctx.globalAlpha = 1;

      // Body, head toward +x, the tail end swaying.
      const tailX = -s * 0.42;
      const tailY = sway * s * 0.07;
      ctx.fillStyle = "rgba(240, 232, 255, 0.92)";
      ctx.beginPath();
      ctx.moveTo(s * 0.5, 0);
      ctx.bezierCurveTo(s * 0.42, -s * 0.17, -s * 0.08, -s * 0.16, tailX, tailY);
      ctx.bezierCurveTo(-s * 0.08, s * 0.16, s * 0.42, s * 0.17, s * 0.5, 0);
      ctx.moveTo(tailX + s * 0.04, tailY);
      ctx.lineTo(tailX - s * 0.3, tailY - s * 0.19 + flick);
      ctx.lineTo(tailX - s * 0.2, tailY + flick * 0.5);
      ctx.lineTo(tailX - s * 0.3, tailY + s * 0.19 + flick);
      ctx.closePath();
      ctx.fill();

      // Pectoral fins.
      ctx.fillStyle = "rgba(240, 232, 255, 0.45)";
      ctx.beginPath();
      ctx.ellipse(s * 0.14, s * 0.13, s * 0.13, s * 0.04, 0.8 + sway * 0.25, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(s * 0.14, -s * 0.13, s * 0.13, s * 0.04, -0.8 - sway * 0.25, 0, TAU);
      ctx.fill();

      ctx.restore();
    };

    const readInput = (now: number) => {
      if (!input.moved && input.taps.length === 0) return;
      const rect = root.getBoundingClientRect();

      if (input.moved) {
        input.moved = false;
        const x = input.clientX - rect.left;
        const y = input.clientY - rect.top;
        const inside = input.present && x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;

        if (inside && pointer.inside) {
          const elapsed = Math.max(8, now - pointer.lastMove);
          pointer.speed = (Math.hypot(x - pointer.x, y - pointer.y) / elapsed) * 16.7;
        } else {
          pointer.speed = 0;
        }
        pointer.x = x;
        pointer.y = y;
        pointer.inside = inside;
        pointer.lastMove = now;

        if (inside) {
          parallax.tx = x / w - 0.5;
          parallax.ty = y / h - 0.5;
          // Skimming the surface leaves a wake.
          if (pointer.speed > 4 && now - pointer.lastRipple > 110) {
            ripples.push({ x, y, r: 2, max: 36 + Math.min(pointer.speed * 3, 60), life: 0.8 });
            pointer.lastRipple = now;
          }
        } else {
          parallax.tx = 0;
          parallax.ty = 0;
        }
      }

      for (const tap of input.taps) {
        const x = tap.clientX - rect.left;
        const y = tap.clientY - rect.top;
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) continue;
        ripples.push({ x, y, r: 0, max: 240, life: 1 });
        ripples.push({ x, y, r: 0, max: 130, life: 1 });
        for (const f of fish) {
          const d = Math.hypot(f.x - x, f.y - y);
          if (d < 280) {
            f.a = Math.atan2(f.y - y, f.x - x) + rnd(-0.4, 0.4);
            f.v = f.base + 5 * (1 - d / 280);
          }
        }
      }
      input.taps.length = 0;
    };

    const writeStyles = () => {
      for (const layer of layers) {
        const value = `translate(${(-parallax.x * layer.depth).toFixed(1)}px, ${(-parallax.y * layer.depth * 0.6).toFixed(1)}px)`;
        if (value !== layer.last) {
          layer.node.style.transform = value;
          layer.last = value;
        }
      }

      if (pointer.inside !== lanternShown) {
        lanternShown = pointer.inside;
        lantern.style.opacity = lanternShown ? "1" : "0";
      }
      if (pointer.inside) {
        const value = `translate(${pointer.x.toFixed(0)}px, ${pointer.y.toFixed(0)}px)`;
        if (value !== lanternLast) {
          lantern.style.transform = value;
          lanternLast = value;
        }
      }
    };

    const moteBuckets: Mote[][] = Array.from({ length: MOTE_STEPS }, () => []);

    let raf = 0;
    let last = performance.now();
    let running = false;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(3, (now - last) / 16.667);
      last = now;

      readInput(now);

      const still = now - pointer.lastMove > 450;
      if (still) pointer.speed *= Math.pow(0.8, dt);

      parallax.x += (parallax.tx - parallax.x) * 0.05 * dt;
      parallax.y += (parallax.ty - parallax.y) * 0.05 * dt;
      writeStyles();

      ctx.clearRect(0, 0, w, h);

      if (ripples.length) {
        ctx.lineWidth = 1.1;
        for (let i = ripples.length - 1; i >= 0; i--) {
          const rp = ripples[i];
          rp.r += (rp.max - rp.r) * 0.04 * dt + 0.25 * dt;
          rp.life -= 0.011 * dt;
          if (rp.life <= 0) {
            ripples.splice(i, 1);
            continue;
          }
          // Flattened: rings on a surface seen at a low angle.
          ctx.globalAlpha = rp.life * 0.4;
          ctx.strokeStyle = "rgb(226, 210, 255)";
          ctx.beginPath();
          ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.42, 0, 0, TAU);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      for (const bucket of moteBuckets) bucket.length = 0;
      for (const m of motes) {
        if (pointer.inside) {
          const dx = m.x - pointer.x;
          const dy = m.y - pointer.y;
          if (dx * dx + dy * dy < 16900) {
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const push = (1 - d / 130) * 0.5 * dt;
            m.vx += (dx / d) * push;
            m.vy += (dy / d) * push;
          }
        }
        const drag = Math.pow(0.93, dt);
        m.vx *= drag;
        m.vy *= drag;
        m.tw += 0.018 * dt;
        m.x += (m.vx + Math.sin(m.tw * 0.7) * 0.12) * dt;
        m.y += (m.vy - m.rise) * dt;

        if (m.y < -6) {
          m.y = h + 6;
          m.x = rnd(0, w);
        } else if (m.y > h + 6) m.y = -6;
        if (m.x < -6) m.x = w + 6;
        else if (m.x > w + 6) m.x = -6;

        const level = 0.5 + 0.5 * Math.sin(m.tw * 2.2);
        moteBuckets[Math.min(MOTE_STEPS - 1, Math.floor(level * MOTE_STEPS))].push(m);
      }
      ctx.fillStyle = "rgb(239, 231, 255)";
      moteBuckets.forEach((bucket, i) => {
        if (!bucket.length) return;
        ctx.globalAlpha = 0.2 + (0.6 * (i + 0.5)) / MOTE_STEPS;
        ctx.beginPath();
        for (const m of bucket) {
          ctx.moveTo(m.x + m.s, m.y);
          ctx.arc(m.x, m.y, m.s, 0, TAU);
        }
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      for (const f of fish) {
        // Wander: a slowly changing turn rate reads as intent, pure noise as jitter.
        f.turn = Math.max(-1, Math.min(1, f.turn + rnd(-0.06, 0.06) * dt)) * Math.pow(0.985, dt);
        let steer = f.turn * 0.014;

        if (pointer.inside) {
          const dx = f.x - pointer.x;
          const dy = f.y - pointer.y;
          const d = Math.hypot(dx, dy);

          if (d < CURIOUS_RADIUS) {
            const away = Math.atan2(dy, dx);
            if (d < FLEE_RADIUS && pointer.speed > 1.5) {
              steer += turnTo(away, f.a) * 0.14;
              f.v = Math.max(f.v, f.base + 3.4 * (1 - d / FLEE_RADIUS));
            } else if (d < 110) {
              // Close to a resting cursor: circle it rather than touch it.
              steer += turnTo(away + Math.PI / 2, f.a) * 0.04;
            } else if (still) {
              steer += turnTo(away + Math.PI, f.a) * 0.022;
            }
          }
        }

        f.a += steer * dt;
        f.v += (f.base - f.v) * 0.025 * dt;
        f.x += Math.cos(f.a) * f.v * dt;
        f.y += Math.sin(f.a) * f.v * dt;
        f.phase += (0.1 + f.v * 0.09) * dt;

        const margin = f.size;
        if (f.x < -margin) f.x = w + margin;
        else if (f.x > w + margin) f.x = -margin;
        if (f.y < -margin) f.y = h + margin;
        else if (f.y > h + margin) f.y = -margin;

        drawFish(f);
      }
    };

    const section = root.parentElement;

    const start = () => {
      if (running) return;
      running = true;
      section?.removeAttribute("data-paused");
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      section?.setAttribute("data-paused", "");
      cancelAnimationFrame(raf);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(root);

    // Off screen, nothing runs at all: no frame loop, no style writes, and
    // the CSS fog animations are paused too.
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    io.observe(root);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="keep-motion pointer-events-none absolute inset-0 -z-10"
    >
      <div data-depth="10" className="river-layer">
        <div className="river-band" />
      </div>
      <div data-depth="26" className="river-layer">
        <div className="river-cloud river-cloud-far" />
      </div>
      <div data-depth="48" className="river-layer">
        <div className="river-cloud river-cloud-near" />
        <div className="river-fog river-fog-a" />
      </div>
      <div ref={lanternRef} className="river-lantern" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="river-vignette" />
    </div>
  );
}
