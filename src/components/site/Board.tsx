"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { curveBasis, line } from "d3-shape";
import { buildBoard, type Pin, type Thread } from "@/lib/world";

/**
 * The board, full screen.
 *
 * A pinboard is a graph — pins and the thread between them — and the one thing
 * a hand-placed pinboard cannot survive is somebody adding a seventh pin in the
 * CMS. So nothing here has coordinates in it. A force simulation settles the
 * pins out of the threads themselves: linked pins pull together, every pin
 * pushes every other one away, and a collision radius keeps two cards from
 * landing on top of each other. Add a pin and the board re-settles around it.
 *
 * Why this and not a hand-drawn arrangement:
 *
 *  - the layout is a property of the CONTENT, so an editor wires two pins
 *    together and the board rearranges to show that, rather than an editor
 *    having to think in pixels;
 *  - it is genuinely irregular. A grid of evidence cards reads as a grid of
 *    evidence cards. Force-settled positions read as somebody having put them
 *    there, which is the whole point of the room.
 *
 * The simulation runs in a fixed 1440x900 board space and the whole board is
 * scaled to the viewport with one transform. That means the sim never re-runs
 * on a resize — the pins do not jump when a phone is rotated — and one number
 * handles every screen.
 */

const BOARD = { w: 1440, h: 900 } as const;

/**
 * The card, in board units.
 *
 * The height is written onto the element rather than left to the content,
 * because the thread anchor below is derived from it and a card whose height
 * depends on whether its title wrapped is a card whose string does not reach
 * its own tack. One number, used by the layout and by the geometry.
 */
const PIN_W = 210;
const PIN_H = 212;

/** Half the collision box of a pin. Generous, so two cards never touch. */
const PIN_R = 118;

/**
 * How far above a pin's centre its tack sits.
 *
 * The threads tie here rather than to the node the simulation moves, because a
 * thread from the centre of a card runs under its own photograph and comes out
 * the other side. The card is translated -50% in both axes, so its top edge —
 * and the tack sitting on it — is exactly half its height above the node.
 */
const TACK_UP = PIN_H / 2;

type Node = SimulationNodeDatum & { pin: Pin };
type Link = SimulationLinkDatum<Node>;

export function Board({
  evidence,
  onClose,
}: {
  evidence: readonly {
    id: string;
    code: string;
    title: string;
    description?: string | null;
    image?: string | null;
    kind?: string | null;
    linksTo?: readonly string[] | null;
  }[];
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const { pins, threads } = useMemo(() => buildBoard(evidence), [evidence]);

  const [open, setOpen] = useState<number | null>(null);
  const [fit, setFit] = useState(1);
  /** Written by the simulation on every tick, read by the render below. */
  const [places, setPlaces] = useState<{ x: number; y: number }[]>([]);

  const simRef = useRef<Simulation<Node, Link> | null>(null);
  const nodesRef = useRef<Node[]>([]);
  const frameRef = useRef<HTMLDivElement>(null);
  /** Set by a drag that actually moved, read by the click it would otherwise
   *  turn into. See the pointerup handler below. */
  const dragged = useRef(false);

  /* Fit ------------------------------------------------------------------- */

  useEffect(() => {
    const read = () => {
      // Contain, not cover: a board with a pin cropped off the edge is a board
      // with a piece of evidence nobody will ever find.
      const pad = window.innerWidth < 720 ? 24 : 72;
      setFit(
        Math.min(
          (window.innerWidth - pad) / BOARD.w,
          (window.innerHeight - pad - 96) / BOARD.h,
        ),
      );
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  /* The simulation -------------------------------------------------------- */

  useEffect(() => {
    if (pins.length === 0) return;

    /**
     * Seeded on a ring rather than at the centre.
     *
     * d3 seeds a node with no x/y on a phyllotaxis spiral, which is fine, but
     * starting on a ring around the middle means the first frames are pins
     * moving INWARD to find each other instead of a pile at the centre
     * exploding outward. The first second of the board is the one somebody
     * watches, so it is worth the four lines.
     */
    const nodes: Node[] = pins.map((pin, i) => {
      const a = (i / pins.length) * Math.PI * 2;
      return {
        pin,
        x: BOARD.w / 2 + Math.cos(a) * 300,
        y: BOARD.h / 2 + Math.sin(a) * 220,
      };
    });
    nodesRef.current = nodes;

    const links: Link[] = threads.map((t: Thread) => ({
      source: t.source,
      target: t.target,
    }));

    const sim = forceSimulation<Node, Link>(nodes)
      .force(
        "thread",
        forceLink<Node, Link>(links)
          .distance(310)
          // Soft, so a pin with six threads on it is not dragged into the
          // middle and buried by the pins it is linked to.
          .strength(0.35),
      )
      .force("push", forceManyBody().strength(-1400).distanceMax(700))
      // Weak pull to the middle on each axis separately, which keeps an
      // unlinked pin on the board instead of letting the charge force fling
      // it off the edge, without squashing the linked clusters together.
      .force("gx", forceX(BOARD.w / 2).strength(0.045))
      .force("gy", forceY(BOARD.h / 2).strength(0.07))
      .force("centre", forceCenter(BOARD.w / 2, BOARD.h / 2))
      .force("space", forceCollide(PIN_R).strength(0.9))
      .alphaDecay(0.035);

    const publish = () => {
      setPlaces(
        nodes.map((n) => ({
          // Keep the card whole on the board. The simulation is free to want a
          // position past the edge; the render is not obliged to honour it.
          x: clamp(n.x ?? 0, PIN_R, BOARD.w - PIN_R),
          y: clamp(n.y ?? 0, PIN_R * 0.8, BOARD.h - PIN_R * 0.8),
        })),
      );
    };

    if (reduce) {
      // Settled, not settling. Running it to convergence in one go and drawing
      // the answer is the same board without the three seconds of movement.
      sim.stop();
      for (let i = 0; i < 320; i++) sim.tick();
      publish();
    } else {
      sim.on("tick", publish);
    }

    simRef.current = sim;
    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, [pins, threads, reduce]);

  /* Dragging a pin -------------------------------------------------------- */

  /**
   * Pinning a card down by hand.
   *
   * `fx`/`fy` is d3's own way of saying "this node is held": the simulation
   * stops integrating it and everything else settles around where it is being
   * held. Letting go releases it. It is four lines and it is the thing that
   * makes the board feel like a board rather than a picture of one.
   */
  const drag = useCallback(
    (i: number, e: React.PointerEvent<HTMLElement>) => {
      const sim = simRef.current;
      const node = nodesRef.current[i];
      const frame = frameRef.current;
      if (!sim || !node || !frame) return;

      e.currentTarget.setPointerCapture(e.pointerId);
      const box = frame.getBoundingClientRect();
      const toBoard = (ev: { clientX: number; clientY: number }) => ({
        x: (ev.clientX - box.left) / fit,
        y: (ev.clientY - box.top) / fit,
      });

      const grabbed = toBoard(e);
      const offset = { x: (node.x ?? 0) - grabbed.x, y: (node.y ?? 0) - grabbed.y };
      let moved = false;

      const move = (ev: PointerEvent) => {
        const at = toBoard(ev);
        node.fx = clamp(at.x + offset.x, PIN_R, BOARD.w - PIN_R);
        node.fy = clamp(at.y + offset.y, PIN_R * 0.8, BOARD.h - PIN_R * 0.8);
        if (!moved) {
          moved = true;
          sim.alphaTarget(0.3).restart();
        }
      };

      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        node.fx = null;
        node.fy = null;
        sim.alphaTarget(0);
        // A browser fires `click` after a drag that ends over the element it
        // started on, so letting go of a pin somewhere new would also open it.
        // The flag is cleared by the click it is there to swallow, and by a
        // timeout for the drags that end somewhere no click follows.
        if (moved) {
          dragged.current = true;
          window.setTimeout(() => {
            dragged.current = false;
          }, 0);
        }
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [fit],
  );

  /* Escape ---------------------------------------------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (open !== null) setOpen(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  /* Threads --------------------------------------------------------------- */

  /**
   * A thread between two pins, drawn with a sag in it.
   *
   * Three points through a basis curve rather than a straight line: real string
   * between two pins hangs, and the amount it hangs depends on how far apart
   * they are. A board of perfectly straight segments reads as a diagram; a
   * board of sagging ones reads as string.
   */
  const thread = useMemo(() => line<[number, number]>().curve(curveBasis), []);

  const paths = useMemo(() => {
    if (places.length !== pins.length) return [];
    return threads.map((t) => {
      // Tied to the TACK, not to the middle of the card. A thread that starts
      // at a pin's centre passes under its own photograph and comes out the
      // other side, which is the one thing string on a board never does.
      const a = { x: places[t.source].x, y: places[t.source].y - TACK_UP };
      const b = { x: places[t.target].x, y: places[t.target].y - TACK_UP };
      const span = Math.hypot(b.x - a.x, b.y - a.y);
      const sag = Math.min(70, span * 0.13);
      return {
        d:
          thread([
            [a.x, a.y],
            [(a.x + b.x) / 2, (a.y + b.y) / 2 + sag],
            [b.x, b.y],
          ]) ?? "",
        lit: open !== null && (t.source === open || t.target === open),
      };
    });
  }, [threads, places, pins.length, open, thread]);

  const picked = open !== null ? pins[open] : null;

  return (
    <div className="xb" role="dialog" aria-modal="true" aria-label="The evidence board">
      <div className="xb-top">
        <p className="xb-kicker">THE BOARD</p>
        <p className="xb-count">
          {pins.length} pinned · {threads.length} thread{threads.length === 1 ? "" : "s"}
        </p>
        <button type="button" className="xb-close" onClick={onClose}>
          Step back
        </button>
      </div>

      {pins.length === 0 ? (
        <div className="xb-empty">
          <p className="xb-empty-title">Nothing is pinned to this board yet.</p>
          <p className="xb-empty-line">
            The pins come from <strong>Evidence board</strong> in the CMS. Give one a
            code, a title and a picture, list the codes it is threaded to, and it
            will be here — the board works out where it goes on its own.
          </p>
        </div>
      ) : (
        <div
          className="xb-frame"
          ref={frameRef}
          style={{ width: BOARD.w * fit, height: BOARD.h * fit }}
        >
          <div
            className="xb-board"
            style={{ width: BOARD.w, height: BOARD.h, transform: `scale(${fit})` }}
          >
            <svg className="xb-threads" viewBox={`0 0 ${BOARD.w} ${BOARD.h}`} aria-hidden>
              {paths.map((p, i) => (
                <path key={i} d={p.d} className={`xb-thread ${p.lit ? "is-lit" : ""}`} />
              ))}
            </svg>

            {places.length === pins.length
              ? pins.map((pin, i) => (
                  <PinCard
                    key={pin.id}
                    pin={pin}
                    at={places[i]}
                    open={open === i}
                    dim={open !== null && open !== i && !isLinked(threads, open, i)}
                    onGrab={(e) => drag(i, e)}
                    onOpen={() => {
                      if (dragged.current) {
                        dragged.current = false;
                        return;
                      }
                      setOpen((cur) => (cur === i ? null : i));
                    }}
                  />
                ))
              : null}
          </div>
        </div>
      )}

      {picked ? (
        <aside className="xb-read">
          <p className="xb-read-code">{picked.code}</p>
          <h3 className="xb-read-title">{picked.title}</h3>
          {picked.description ? (
            <p className="xb-read-body">{picked.description}</p>
          ) : (
            <p className="xb-read-body is-empty">
              No description on this one. Add it in the CMS.
            </p>
          )}
          <button type="button" className="btn btn-sm" onClick={() => setOpen(null)}>
            Put it back
          </button>
        </aside>
      ) : null}

      <p className="xb-hint">
        {pins.length > 0
          ? "Drag a pin to move it. Click it to read it. Escape to step back."
          : "Escape to step back."}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   One pin
   ------------------------------------------------------------------------- */

function PinCard({
  pin,
  at,
  open,
  dim,
  onGrab,
  onOpen,
}: {
  pin: Pin;
  at: { x: number; y: number };
  open: boolean;
  dim: boolean;
  onGrab: (e: React.PointerEvent<HTMLElement>) => void;
  onOpen: () => void;
}) {
  // Deterministic from the code, so a pin keeps the same tilt across renders
  // and across reloads. Random per render would jitter on every tick.
  const tilt = ((hash(pin.code) % 900) / 100 - 4.5).toFixed(2);

  return (
    <article
      className={`xb-pin is-${pin.kind.toLowerCase()} ${open ? "is-open" : ""} ${dim ? "is-dim" : ""}`}
      style={{
        left: at.x,
        top: at.y,
        width: PIN_W,
        // Fixed, and the same number TACK_UP is derived from. Left to the
        // content, a two-line title would make the card taller and move its
        // tack away from where the threads were tied.
        height: PIN_H,
        transform: `translate(-50%, -50%) rotate(${tilt}deg)`,
      }}
      onPointerDown={onGrab}
    >
      <span className="xb-tack" aria-hidden />

      <button
        type="button"
        className="xb-pin-hit"
        onClick={onOpen}
        aria-label={`${pin.code}, ${pin.title}. ${pin.description || "No description."}`}
      >
        <span className="xb-pin-shot">
          {pin.image ? (
            // Plain img: a pin's picture is whatever URL the CMS holds, and
            // next/image refuses hosts that are not allow-listed.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pin.image} alt="" loading="lazy" decoding="async" draggable={false} />
          ) : (
            <span className="xb-pin-blank" aria-hidden>
              NO IMAGE
            </span>
          )}
        </span>
        <span className="xb-pin-foot">
          <span className="xb-pin-code">{pin.code}</span>
          <span className="xb-pin-title">{pin.title}</span>
        </span>
      </button>
    </article>
  );
}

/* ---------------------------------------------------------------------------
   Small things
   ------------------------------------------------------------------------- */

const clamp = (v: number, min: number, max: number) =>
  min > max ? (min + max) / 2 : Math.min(max, Math.max(min, v));

const isLinked = (threads: readonly Thread[], a: number, b: number) =>
  threads.some(
    (t) => (t.source === a && t.target === b) || (t.source === b && t.target === a),
  );

/** Any stable small integer from a string. Used only to pick a tilt. */
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
