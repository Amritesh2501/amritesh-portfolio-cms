"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useReducedMotion } from "motion/react";
import type { Scene } from "@/lib/files/cases";

/**
 * The camera.
 *
 * One idea, applied to every layer: a layer is a WORLD-sized box, and the
 * camera positions it with a translate and a scale. What makes it parallax is
 * that the translate is weighted by the layer's depth, so when the camera
 * tracks left the near desk slides further than the far wall and the room
 * reads as having a front and a back.
 *
 * The weighting is anchored on the centre of the room rather than on its
 * origin. Anchoring on the origin would make the layers agree only at the
 * top-left corner and drift apart the further you looked, which turns a room
 * into a collage. Anchored on the middle, the layers are registered where the
 * establishing shot sits and separate symmetrically either side of it.
 *
 * Scrolling moves between stations rather than scrubbing a free camera. A
 * free camera in a room this dark means players who never find the thing they
 * were supposed to look at; stations mean every shot is composed, and the
 * easing between them is what does the cinematic work.
 */

export type Layer = {
  /** 0 is painted at infinity, 1 moves with the camera, >1 is foreground. */
  depth: number;
  /** The drawing. Inert: it never takes a click. */
  node: ReactNode;
  /**
   * Interactive things standing on this plane.
   *
   * They live in the same positioned box as the art rather than in one shared
   * overlay, which is the only way a marker stays on its object: both are
   * parallaxed by the same weight, so they move together at every camera
   * position instead of only at the centre of the room.
   */
  hot?: ReactNode;
};

export type StageProps = {
  scene: Scene;
  layers: Layer[];
  /** Index into scene.stations. -1 means the establishing shot. */
  station: number;
  onStation: (index: number) => void;
  /** Suspends input while a modal (minigame, pause menu) is up. */
  frozen?: boolean;
};

function useViewport() {
  const [size, setSize] = useState({ w: 1280, h: 720 });
  useEffect(() => {
    const read = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return size;
}

export function Stage({
  scene,
  layers,
  station,
  onStation,
  frozen = false,
}: StageProps) {
  const reduce = useReducedMotion();
  const view = useViewport();
  const [look, setLook] = useState({ x: 0, y: 0 });

  const shot = useMemo(() => {
    const s = scene.stations[station];
    return s ? s.cam : scene.establish;
  }, [scene, station]);

  /**
   * Fit the room to the viewport before the station's own zoom is applied.
   *
   * Without this a phone would get the same slice of room as a widescreen
   * monitor, which on the narrow end means a shot composed around an object
   * that is now off the left edge. Section 35 asks for the camera to simplify
   * on small screens rather than the layout to shrink, and this is where that
   * actually happens.
   */
  const fit = useMemo(() => {
    const base = Math.max(view.w / scene.world.w, view.h / scene.world.h);
    // A little over the cover ratio, so a station zoom of 1 still crops rather
    // than showing the edges of the drawing.
    return base * 1.08;
  }, [view, scene.world]);

  const move = useCallback(
    (delta: number) => {
      if (frozen) return;
      const next = Math.min(
        scene.stations.length - 1,
        Math.max(-1, station + delta),
      );
      if (next !== station) onStation(next);
    },
    [frozen, station, scene.stations.length, onStation],
  );

  /* Wheel and trackpad ---------------------------------------------------- */

  const cooldown = useRef(0);
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (frozen) return;
      e.preventDefault();
      const now = performance.now();
      // A trackpad fires a burst of small deltas for one physical gesture;
      // without the gate a single flick would cross the whole room.
      if (now < cooldown.current) return;
      if (Math.abs(e.deltaY) < 8) return;
      cooldown.current = now + 420;
      move(e.deltaY > 0 ? 1 : -1);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [move, frozen]);

  /* Keyboard -------------------------------------------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (frozen) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        move(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        move(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, frozen]);

  /* Touch ----------------------------------------------------------------- */

  const touch = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      touch.current = t ? { x: t.clientX, y: t.clientY } : null;
    };
    const end = (e: TouchEvent) => {
      if (frozen || !touch.current) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - touch.current.x;
      const dy = t.clientY - touch.current.y;
      touch.current = null;
      // Horizontal swipes only: a vertical drag in a room this tall is much
      // more likely to be someone trying to scroll the page than to pan.
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
      move(dx < 0 ? 1 : -1);
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchend", end);
    };
  }, [move, frozen]);

  /* Pointer look ---------------------------------------------------------- */

  useEffect(() => {
    // The HUD in the reference tells the player to use the mouse to look
    // around, so the room answers the pointer. Small: this is a lean, not a
    // second camera. Off under reduced motion, where it is the one piece of
    // movement here that is decorative rather than navigational.
    if (reduce || frozen) {
      setLook({ x: 0, y: 0 });
      return;
    }
    const onMove = (e: PointerEvent) => {
      setLook({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, frozen]);

  const cx = scene.world.w / 2;
  const cy = scene.world.h / 2;
  const z = fit * shot.z;

  /**
   * Keep the frame inside the room.
   *
   * A station composed on something near an edge — the case whiteboard is
   * hard against the left wall — wants to centre on it, and centring on it
   * puts a slab of empty stage in shot. Clamping is what every 2D game camera
   * does at the edge of a level: the subject slides off centre rather than
   * the world running out, which is both correct and better composition.
   *
   * When the frame is wider than the room, as it is on the establishing shot,
   * there is nothing to clamp to and it simply centres.
   */
  const halfW = view.w / (2 * z);
  const halfH = view.h / (2 * z);
  const aim = {
    x:
      halfW * 2 >= scene.world.w
        ? cx
        : Math.min(Math.max(shot.x, halfW), scene.world.w - halfW),
    y:
      halfH * 2 >= scene.world.h
        ? cy
        : Math.min(Math.max(shot.y, halfH), scene.world.h - halfH),
  };

  const transformFor = (depth: number) => {
    // Parallax anchored on the middle of the room: layers are registered at
    // the establishing shot and separate either side of it.
    const px = cx + (aim.x - cx) * depth;
    const py = cy + (aim.y - cy) * depth;
    // The pointer lean scales with depth too, so it reads as the same room
    // turning rather than as the planes sliding independently.
    const lx = look.x * 26 * depth;
    const ly = look.y * 16 * depth;
    return `translate(${view.w / 2 - px * z - lx}px, ${view.h / 2 - py * z - ly}px) scale(${z})`;
  };

  return (
    <div className="fg-stage">
      {layers.map((layer, i) => (
        <div
          key={i}
          className="fg-layer"
          style={{
            width: scene.world.w,
            height: scene.world.h,
            transform: transformFor(layer.depth),
            // The far plane is very slightly hazed, which does more for depth
            // than any amount of extra parallax.
            filter: layer.depth < 0.5 ? "blur(1.5px)" : undefined,
          }}
        >
          {layer.node}
          {layer.hot}
        </div>
      ))}
    </div>
  );
}

/**
 * One interactive object in a room.
 *
 * Positioned in world coordinates inside the hot layer, so it rides the same
 * transform as the art. A real <button>, because everything in here has to be
 * reachable without a pointer, and because a div with a click handler gives a
 * screen reader nothing to announce.
 *
 * The prompt is deliberately quiet: a ring and a label on hover or focus, not
 * a permanent glow around every object in the room. Section 11 is explicit
 * about that, and it is also the difference between a room you search and a
 * room that has already told you where everything is.
 */
export function Hotspot({
  x,
  y,
  w,
  h,
  depth,
  label,
  tease,
  state,
  onPick,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  label: string;
  tease: string;
  state: "open" | "locked" | "done";
  onPick: () => void;
}) {
  // No counter-scale on the prompt. Depth weights the TRANSLATION only —
  // every plane is drawn at the same zoom — so a label on the back wall is
  // already the same on-screen size as one on the desk, and dividing by depth
  // would blow the far ones up by nearly three times.
  return (
    <button
      type="button"
      className={`fg-hot is-${state}`}
      style={{ left: x - w / 2, top: y - h / 2, width: w, height: h }}
      onClick={state === "open" ? onPick : undefined}
      disabled={state !== "open"}
      aria-label={
        state === "done"
          ? `${label} — evidence already recovered`
          : state === "locked"
            ? `${label} — not accessible yet`
            : `${label}. ${tease}`
      }
    >
      <span className="fg-hot-ring" aria-hidden />
      <span className="fg-hot-tag" aria-hidden>
        <span className="fg-hot-kicker">
          {state === "done"
            ? "RECOVERED"
            : state === "locked"
              ? "SEALED"
              : "EVIDENCE DETECTED"}
        </span>
        <span className="fg-hot-label">{label}</span>
      </span>
    </button>
  );
}
