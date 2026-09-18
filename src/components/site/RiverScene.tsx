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
  /** Two slow sine frequencies and offsets that drive the wander. */
  w1: number;
  w2: number;
  o1: number;
  o2: number;
  /** Heading to escape along after a tap, and how long the escape lasts. */
  fleeA: number;
  fleeT: number;
};

type Mote = { x: number; y: number; vx: number; vy: number; rise: number; s: number; tw: number };
type Ripple = { x: number; y: number; r: number; max: number; life: number };
type Layer = {
  node: HTMLElement;
  depth: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  last: string;
};

const TAU = Math.PI * 2;
const FLEE_RADIUS = 170;
const CURIOUS_RADIUS = 380;
// Fish and motes are soft; full retina resolution only multiplied the pixels
// cleared, drawn and uploaded every frame.
const MAX_DPR = 1.25;
// Motes are batched into this many brightness steps, one fill per step,
// instead of a fillStyle string and a fill call for every mote.
const MOTE_STEPS = 4;
// Largest turn a fish can make per 60Hz frame. Steering asks for a heading;
// this is what keeps the turn a curve instead of a snap.
const MAX_TURN = 0.045;
// Light spring: how hard a layer is pulled back to rest, how much of its speed
// it keeps each frame, and how far the pointer can push it.
const FOG_PULL = 0.016;
const FOG_KEEP = 0.915;
const FOG_PUSH = 0.0026;
const FOG_REACH = 150;

const rnd = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Signed shortest turn from angle `from` to angle `to`. */
const turnTo = (to: number, from: number) =>
  ((((to - from) % TAU) + TAU * 1.5) % TAU) - Math.PI;

/** Frame-rate independent easing factor for a per-60Hz-frame rate. */
const ease = (rate: number, dt: number) => 1 - Math.pow(1 - rate, dt);

/** A soft glow drawn once, then stamped under each fish. */
function makeGlow(spark: string) {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${spark}, 0.55)`);
    grad.addColorStop(1, `rgba(${spark}, 0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  return c;
}

/**
 * The scene's two colours, read off the CSS tokens so the canvas follows the
 * theme. They are bare "r, g, b" triplets rather than full colours precisely
 * so each call site can pick its own alpha.
 *
 * At night the water is dark and the fish are light; at first light the water
 * is pale and the same fish read as dark shapes under the surface. Inverting
 * the ink is the whole difference.
 */
function readPalette(el: HTMLElement) {
  const cs = getComputedStyle(el);
  const pick = (name: string, fallback: string) =>
    cs.getPropertyValue(name).trim() || fallback;
  return {
    ink: pick("--river-ink", "240, 232, 255"),
    spark: pick("--river-spark", "205, 175, 255"),
  };
}

/**
 * The hero's living layer.
 *
 * Nothing here moves on its own except the life in the water. The pointer is
 * the only wind: it drags the fog banks and the band of light along its
 * direction of travel, each in proportion to its depth so the bank shears
 * rather than sliding as one sheet, and a damped spring carries them back to
 * rest. Fish swim on smooth curves, now and then breaking the surface with a
 * small ring, scatter from a fast cursor or a tap and drift closer to a still
 * one; motes are pushed aside; ripples spread where the pointer skims or taps.
 *
 * No light follows the cursor. A glow pinned to the pointer reads as a torch
 * held over the scene rather than as weather in it, and it was the one thing
 * here that announced itself as an effect.
 *
 * Performance rules, each of which was a measured source of lag:
 *  - Pointer events only record coordinates; all work happens once per frame.
 *  - The element rect is read once per frame, never inside an event handler.
 *  - Styles are written straight to the elements that move, never as custom
 *    properties on a parent (that re-styles the whole subtree), and only when
 *    the value actually changed.
 *  - No canvas shadowBlur: the glow is a pre-rendered sprite.
 *  - Off screen, the loop stops.
 *
 * ponytail: runs under prefers-reduced-motion too, because the scene is the
 * point of the page and was explicitly asked to move. Scale `dt` down under
 * matchMedia("(prefers-reduced-motion: reduce)") if that bothers anyone.
 */
export function RiverScene() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) return;

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

    let palette = readPalette(root);
    let glow = makeGlow(palette.spark);
    const small = w < 640;

    // The theme can flip mid-scene. Re-reading the tokens and re-stamping the
    // glow sprite is enough; the pond keeps swimming rather than being torn
    // down and re-seeded, which would scatter every fish on a colour change.
    const themeWatch = new MutationObserver(() => {
      palette = readPalette(root);
      glow = makeGlow(palette.spark);
    });
    themeWatch.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-mode"],
    });

    const fish: Fish[] = Array.from({ length: small ? 11 : 20 }, () => {
      const base = rnd(0.4, 0.8);
      return {
        x: rnd(0, w),
        y: rnd(0, h),
        a: rnd(0, TAU),
        v: base,
        base,
        size: rnd(14, 30),
        phase: rnd(0, TAU),
        w1: rnd(0.004, 0.009),
        w2: rnd(0.011, 0.019),
        o1: rnd(0, TAU),
        o2: rnd(0, TAU),
        fleeA: 0,
        fleeT: 0,
      };
    });

    const motes: Mote[] = Array.from({ length: small ? 30 : 64 }, () => ({
      x: rnd(0, w),
      y: rnd(0, h),
      vx: 0,
      vy: 0,
      rise: rnd(0.04, 0.2),
      s: rnd(0.5, 1.7),
      tw: rnd(0, TAU),
    }));

    const ripples: Ripple[] = [];

    // Raw input, written by event handlers and consumed by the frame loop.
    const input = {
      clientX: 0,
      clientY: 0,
      moved: false,
      present: false,
      taps: [] as { clientX: number; clientY: number }[],
    };
    const pointer = { x: -9999, y: -9999, inside: false, speed: 0, dx: 0, dy: 0, lastMove: 0, lastRipple: 0 };

    const layers: Layer[] = Array.from(root.querySelectorAll<HTMLElement>("[data-depth]")).map(
      (node) => ({ node, depth: Number(node.dataset.depth) || 0, x: 0, y: 0, vx: 0, vy: 0, last: "" }),
    );

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
      ctx.fillStyle = `rgba(${palette.ink}, 0.92)`;
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
      ctx.fillStyle = `rgba(${palette.ink}, 0.45)`;
      ctx.beginPath();
      ctx.ellipse(s * 0.14, s * 0.13, s * 0.13, s * 0.04, 0.8 + sway * 0.25, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(s * 0.14, -s * 0.13, s * 0.13, s * 0.04, -0.8 - sway * 0.25, 0, TAU);
      ctx.fill();

      ctx.restore();
    };

    const readInput = (now: number) => {
      pointer.dx = 0;
      pointer.dy = 0;
      if (!input.moved && input.taps.length === 0) return;
      const rect = root.getBoundingClientRect();

      if (input.moved) {
        input.moved = false;
        const x = input.clientX - rect.left;
        const y = input.clientY - rect.top;
        const inside = input.present && x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;

        if (inside && pointer.inside) {
          pointer.dx = x - pointer.x;
          pointer.dy = y - pointer.y;
          const elapsed = Math.max(8, now - pointer.lastMove);
          pointer.speed = (Math.hypot(pointer.dx, pointer.dy) / elapsed) * 16.7;
        } else {
          pointer.speed = 0;
        }
        pointer.x = x;
        pointer.y = y;
        pointer.inside = inside;
        pointer.lastMove = now;

        // Skimming the surface leaves a wake.
        if (inside && pointer.speed > 4 && now - pointer.lastRipple > 120) {
          ripples.push({ x, y, r: 2, max: 36 + Math.min(pointer.speed * 3, 60), life: 0.7 });
          pointer.lastRipple = now;
        }
      }

      for (const tap of input.taps) {
        const x = tap.clientX - rect.left;
        const y = tap.clientY - rect.top;
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) continue;
        ripples.push({ x, y, r: 0, max: 240, life: 1 });
        ripples.push({ x, y, r: 0, max: 130, life: 1 });
        // A tap is a gust: the light is thrown away from where it landed.
        for (const layer of layers) {
          layer.vx += ((w / 2 - x) / w) * layer.depth * 0.25;
          layer.vy += ((h / 2 - y) / h) * layer.depth * 0.15;
        }
        for (const f of fish) {
          const d = Math.hypot(f.x - x, f.y - y);
          if (d < 280) {
            f.fleeA = Math.atan2(f.y - y, f.x - x) + rnd(-0.3, 0.3);
            f.fleeT = 40 + 30 * (1 - d / 280);
            f.v = Math.max(f.v, f.base + 2.5 * (1 - d / 280));
          }
        }
      }
      input.taps.length = 0;
    };

    const moveFog = (dt: number) => {
      // A gentle lean toward the pointer's side, on top of the push.
      const leanX = pointer.inside ? pointer.x / w - 0.5 : 0;
      const leanY = pointer.inside ? pointer.y / h - 0.5 : 0;
      const keep = Math.pow(FOG_KEEP, dt);

      for (const layer of layers) {
        const d = layer.depth;
        layer.vx += pointer.dx * d * FOG_PUSH;
        layer.vy += pointer.dy * d * FOG_PUSH * 0.6;
        layer.vx += (-leanX * d * 0.5 - layer.x) * FOG_PULL * dt;
        layer.vy += (-leanY * d * 0.3 - layer.y) * FOG_PULL * dt;
        layer.vx *= keep;
        layer.vy *= keep;
        layer.x = clamp(layer.x + layer.vx * dt, -FOG_REACH, FOG_REACH);
        layer.y = clamp(layer.y + layer.vy * dt, -FOG_REACH, FOG_REACH);

        const value = `translate(${layer.x.toFixed(1)}px, ${layer.y.toFixed(1)}px)`;
        if (value !== layer.last) {
          layer.node.style.transform = value;
          layer.last = value;
        }
      }
    };

    const moteBuckets: Mote[][] = Array.from({ length: MOTE_STEPS }, () => []);

    let raf = 0;
    let last = performance.now();
    let t = 0;
    // Frames until a fish next breaks the surface.
    let nextRise = rnd(90, 200);
    let running = false;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(2.5, (now - last) / 16.667);
      last = now;
      t += dt;

      readInput(now);

      nextRise -= dt;
      if (nextRise <= 0 && fish.length) {
        const f = fish[Math.floor(Math.random() * fish.length)];
        if (f.x > 0 && f.x < w && f.y > 0 && f.y < h) {
          ripples.push({ x: f.x, y: f.y, r: 0, max: 30 + f.size * 1.6, life: 0.75 });
        }
        nextRise = rnd(120, 300);
      }

      const still = now - pointer.lastMove > 450;
      if (still) pointer.speed *= Math.pow(0.85, dt);

      moveFog(dt);

      ctx.clearRect(0, 0, w, h);

      if (ripples.length) {
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = `rgb(${palette.ink})`;
        for (let i = ripples.length - 1; i >= 0; i--) {
          const rp = ripples[i];
          rp.r += (rp.max - rp.r) * ease(0.035, dt) + 0.2 * dt;
          rp.life -= 0.01 * dt;
          if (rp.life <= 0) {
            ripples.splice(i, 1);
            continue;
          }
          // Flattened: rings on a surface seen at a low angle. Quadratic fade
          // so they dissolve rather than blink out.
          ctx.globalAlpha = rp.life * rp.life * 0.45;
          ctx.beginPath();
          ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.42, 0, 0, TAU);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      for (const bucket of moteBuckets) bucket.length = 0;
      const drag = Math.pow(0.94, dt);
      for (const m of motes) {
        if (pointer.inside) {
          const dx = m.x - pointer.x;
          const dy = m.y - pointer.y;
          if (dx * dx + dy * dy < 16900) {
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const push = (1 - d / 130) * 0.35 * dt;
            m.vx += (dx / d) * push;
            m.vy += (dy / d) * push;
          }
        }
        m.vx *= drag;
        m.vy *= drag;
        m.tw += 0.016 * dt;
        m.x += (m.vx + Math.sin(m.tw * 0.7) * 0.1) * dt;
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
      ctx.fillStyle = `rgb(${palette.ink})`;
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
        // Wander: two slow sines give a heading that curves and meanders
        // without the jitter of per-frame random noise.
        let desired = f.a + (Math.sin(t * f.w1 + f.o1) * 0.6 + Math.sin(t * f.w2 + f.o2) * 0.4) * 0.008;
        let targetV = f.base;
        let turnRate = MAX_TURN;

        if (f.fleeT > 0) {
          f.fleeT -= dt;
          desired = f.fleeA;
          turnRate = MAX_TURN * 3;
          targetV = f.base + 2;
        } else if (pointer.inside) {
          const dx = f.x - pointer.x;
          const dy = f.y - pointer.y;
          const d = Math.hypot(dx, dy);

          if (d < CURIOUS_RADIUS) {
            const away = Math.atan2(dy, dx);
            if (d < FLEE_RADIUS && pointer.speed > 1.5) {
              desired = away;
              turnRate = MAX_TURN * 2.5;
              targetV = f.base + 2.6 * (1 - d / FLEE_RADIUS);
            } else if (d < 110) {
              // Close to a resting cursor: circle it rather than touch it.
              desired = away + Math.PI / 2;
            } else if (still) {
              desired = away + Math.PI;
              turnRate = MAX_TURN * 0.6;
            }
          }
        }

        const turn = clamp(turnTo(desired, f.a), -turnRate * dt, turnRate * dt);
        f.a += turn;
        f.v += (targetV - f.v) * ease(targetV > f.v ? 0.08 : 0.025, dt);
        f.x += Math.cos(f.a) * f.v * dt;
        f.y += Math.sin(f.a) * f.v * dt;
        f.phase += (0.09 + f.v * 0.08) * dt;

        const margin = f.size;
        if (f.x < -margin) f.x = w + margin;
        else if (f.x > w + margin) f.x = -margin;
        if (f.y < -margin) f.y = h + margin;
        else if (f.y > h + margin) f.y = -margin;

        drawFish(f);
      }
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      root.parentElement?.removeAttribute("data-paused");
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
      root.parentElement?.setAttribute("data-paused", "");
    };

    const ro = new ResizeObserver(resize);
    ro.observe(root);

    // Off screen, nothing runs at all.
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    io.observe(root);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      stop();
      themeWatch.disconnect();
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
      {/* Each layer is pushed by the pointer in proportion to its depth, so
          the near fog runs ahead of the far fog and the bank shears instead of
          sliding as one sheet. The markup is the only thing that decides how
          many there are: the effect picks up every [data-depth] it finds. */}
      <div data-depth="30" className="river-layer">
        <div className="river-band" />
      </div>
      <div data-depth="64" className="river-layer">
        <div className="river-fog river-fog-a" />
      </div>
      <div data-depth="38" className="river-layer">
        <div className="river-fog river-fog-b" />
      </div>
      <div data-depth="92" className="river-layer">
        <div className="river-fog river-fog-c" />
      </div>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="river-vignette" />
    </div>
  );
}
