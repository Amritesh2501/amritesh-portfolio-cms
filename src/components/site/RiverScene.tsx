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

const rnd = (min: number, max: number) => min + Math.random() * (max - min);

/** Signed shortest turn from angle `from` to angle `to`. */
const turnTo = (to: number, from: number) =>
  ((((to - from) % TAU) + TAU * 1.5) % TAU) - Math.PI;

/**
 * The hero's living layer.
 *
 * CSS draws the fog; this adds what has to react: fish that scatter from a
 * fast cursor and drift closer to a still one, motes pushed aside, ripples
 * where the pointer skims or taps the water, and depth parallax on every
 * [data-depth] fog layer.
 *
 * One rAF loop, no React state, paused while the hero is off screen.
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
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const small = w < 640;

    const fish: Fish[] = Array.from({ length: small ? 7 : 13 }, () => {
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

    const motes: Mote[] = Array.from({ length: small ? 36 : 80 }, () => ({
      x: rnd(0, w),
      y: rnd(0, h),
      vx: 0,
      vy: 0,
      rise: rnd(0.04, 0.22),
      s: rnd(0.5, 1.7),
      tw: rnd(0, TAU),
    }));

    const ripples: Ripple[] = [];

    const pointer = { x: -9999, y: -9999, inside: false, speed: 0, lastMove: 0, lastRipple: 0 };
    const parallax = { x: 0, y: 0, tx: 0, ty: 0 };

    const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-depth]")).map(
      (node) => ({ node, depth: Number(node.dataset.depth) || 0 }),
    );

    const local = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      return { x, y, inside: x >= 0 && y >= 0 && x <= rect.width && y <= rect.height };
    };

    const onMove = (e: PointerEvent) => {
      const { x, y, inside } = local(e);
      const now = performance.now();

      if (pointer.inside && inside) {
        const elapsed = Math.max(8, now - pointer.lastMove);
        pointer.speed = (Math.hypot(x - pointer.x, y - pointer.y) / elapsed) * 16.7;
      }

      pointer.x = x;
      pointer.y = y;
      pointer.inside = inside;
      pointer.lastMove = now;

      if (!inside) {
        leave();
        return;
      }

      parallax.tx = x / w - 0.5;
      parallax.ty = y / h - 0.5;
      root.style.setProperty("--mx", `${x}px`);
      root.style.setProperty("--my", `${y}px`);

      // Skimming the surface leaves a wake.
      if (pointer.speed > 4 && now - pointer.lastRipple > 110) {
        ripples.push({ x, y, r: 2, max: 36 + Math.min(pointer.speed * 3, 60), life: 0.8 });
        pointer.lastRipple = now;
      }
    };

    const onDown = (e: PointerEvent) => {
      const { x, y, inside } = local(e);
      if (!inside) return;
      ripples.push({ x, y, r: 0, max: 240, life: 1 });
      ripples.push({ x, y, r: 0, max: 130, life: 1 });
      for (const f of fish) {
        const d = Math.hypot(f.x - x, f.y - y);
        if (d < 280) {
          f.a = Math.atan2(f.y - y, f.x - x) + rnd(-0.4, 0.4);
          f.v = f.base + 5 * (1 - d / 280);
        }
      }
    };

    const leave = () => {
      pointer.inside = false;
      pointer.speed = 0;
      parallax.tx = 0;
      parallax.ty = 0;
      root.style.setProperty("--mx", "-999px");
      root.style.setProperty("--my", "-999px");
    };

    const drawFish = (f: Fish) => {
      const s = f.size;
      const sway = Math.sin(f.phase);
      const flick = Math.sin(f.phase - 0.9) * s * 0.16;

      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.a);

      // Body, head toward +x, the tail end swaying.
      const tailX = -s * 0.42;
      const tailY = sway * s * 0.07;
      // Soft glow, so the fish read as lit from within rather than cut out.
      ctx.shadowColor = "rgba(200, 170, 255, 0.85)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "rgba(240, 232, 255, 0.9)";
      ctx.beginPath();
      ctx.moveTo(s * 0.5, 0);
      ctx.bezierCurveTo(s * 0.42, -s * 0.17, -s * 0.08, -s * 0.16, tailX, tailY);
      ctx.bezierCurveTo(-s * 0.08, s * 0.16, s * 0.42, s * 0.17, s * 0.5, 0);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(tailX + s * 0.04, tailY);
      ctx.lineTo(tailX - s * 0.3, tailY - s * 0.19 + flick);
      ctx.lineTo(tailX - s * 0.2, tailY + flick * 0.5);
      ctx.lineTo(tailX - s * 0.3, tailY + s * 0.19 + flick);
      ctx.closePath();
      ctx.fill();

      // Pectoral fins.
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(240, 232, 255, 0.45)";
      ctx.beginPath();
      ctx.ellipse(s * 0.14, s * 0.13, s * 0.13, s * 0.04, 0.8 + sway * 0.25, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(s * 0.14, -s * 0.13, s * 0.13, s * 0.04, -0.8 - sway * 0.25, 0, TAU);
      ctx.fill();

      ctx.restore();
    };

    let raf = 0;
    let last = performance.now();
    let visible = true;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(3, (now - last) / 16.667);
      last = now;
      if (!visible) return;

      const still = now - pointer.lastMove > 450;
      if (still) pointer.speed *= Math.pow(0.8, dt);

      parallax.x += (parallax.tx - parallax.x) * 0.05 * dt;
      parallax.y += (parallax.ty - parallax.y) * 0.05 * dt;
      for (const { node, depth } of layers) {
        node.style.transform = `translate3d(${(-parallax.x * depth).toFixed(2)}px, ${(-parallax.y * depth * 0.6).toFixed(2)}px, 0)`;
      }

      ctx.clearRect(0, 0, w, h);

      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += (rp.max - rp.r) * 0.04 * dt + 0.25 * dt;
        rp.life -= 0.011 * dt;
        if (rp.life <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        // Flattened: rings on a surface seen at a low angle.
        ctx.strokeStyle = `rgba(226, 210, 255, ${(rp.life * 0.4).toFixed(3)})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.42, 0, 0, TAU);
        ctx.stroke();
      }

      for (const m of motes) {
        if (pointer.inside) {
          const dx = m.x - pointer.x;
          const dy = m.y - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d < 130 && d > 0.1) {
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

        const alpha = 0.2 + 0.6 * (0.5 + 0.5 * Math.sin(m.tw * 2.2));
        ctx.fillStyle = `rgba(239, 231, 255, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.s, 0, TAU);
        ctx.fill();
      }

      for (const f of fish) {
        // Wander: a slowly changing turn rate reads as intent, pure noise as jitter.
        f.turn = Math.max(-1, Math.min(1, f.turn + rnd(-0.06, 0.06) * dt)) * Math.pow(0.985, dt);
        let steer = f.turn * 0.014;

        if (pointer.inside) {
          const dx = f.x - pointer.x;
          const dy = f.y - pointer.y;
          const d = Math.hypot(dx, dy);
          const away = Math.atan2(dy, dx);

          if (d < FLEE_RADIUS && pointer.speed > 1.5) {
            steer += turnTo(away, f.a) * 0.14;
            f.v = Math.max(f.v, f.base + 3.4 * (1 - d / FLEE_RADIUS));
          } else if (d < 110) {
            // Close to a resting cursor: circle it rather than touch it.
            steer += turnTo(away + Math.PI / 2, f.a) * 0.04;
          } else if (d < CURIOUS_RADIUS && still) {
            steer += turnTo(away + Math.PI, f.a) * 0.022;
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
    raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(resize);
    ro.observe(root);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(root);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="keep-motion pointer-events-none absolute inset-0 -z-10"
    >
      <div data-depth="16" className="river-layer">
        <div className="river-glow" />
      </div>
      <div data-depth="10" className="river-layer">
        <div className="river-band" />
      </div>
      <div data-depth="26" className="river-layer">
        <div className="river-cloud river-cloud-far" />
      </div>
      <div data-depth="48" className="river-layer river-fogs">
        <div className="river-cloud river-cloud-near" />
        <div className="river-fog river-fog-a" />
        <div className="river-fog river-fog-b" />
      </div>
      <div className="river-lantern" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="river-vignette" />
    </div>
  );
}
