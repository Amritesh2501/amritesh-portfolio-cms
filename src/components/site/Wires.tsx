"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  LEFT_X,
  PANEL_H,
  PANEL_SIZE,
  PANEL_W,
  RIGHT_X,
  SNAP,
  isPatched,
  joins,
  makePanel,
  rowY,
  strandById,
  type StrandId,
} from "@/lib/wires";
import * as sound from "@/lib/sound";
import { Help } from "./Help";

/**
 * The patch panel.
 *
 * Rebuilt as the thing everybody already knows how to play: you take hold of a
 * cable end and you DRAG it across to the socket it belongs in. The cable
 * follows your hand while you hold it, sags under its own weight when it is
 * connected, and a wrong socket lets go.
 *
 * What it replaced was two lists of buttons. That version was complete — you
 * could patch the whole panel with it — and it was completely wrong, because
 * "click a button, then click another button" is a form, not a job. Nothing
 * about it suggested a cable, so nothing about it suggested what to do.
 *
 * Two things survive from that version and neither is negotiable:
 *
 *   - every terminal carries its strand's NAME as well as its colour, because a
 *     puzzle whose entire mechanic is matching hues is a puzzle somebody
 *     colour-blind cannot play at all;
 *   - the whole thing is still playable by pointing and clicking, and by
 *     keyboard, because a drag is the nicest way to do this and it must not be
 *     the only way. Take an end, put it down, take the other: same job.
 */

/** Short names for the panel's own coordinates, which live in lib/wires so the
 *  relationship between the socket spacing and the snap radius can be checked. */
const W = PANEL_W;
const H = PANEL_H;

type End = { side: "left" | "right"; id: StrandId; i: number };

export function Wires({ onSolved, onClose }: { onSolved: () => void; onClose: () => void }) {
  const [seed, setSeed] = useState(0);
  const panel = useMemo(() => makePanel(), [seed]);

  /** The end currently in hand, whether it was dragged there or clicked. */
  const [held, setHeld] = useState<End | null>(null);
  /** Where that end is, while it is being dragged. Null means it is held but
   *  not being dragged — the click path — so it stays on its terminal. */
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const [made, setMade] = useState<StrandId[]>([]);
  const [wrong, setWrong] = useState<StrandId | null>(null);
  const [misses, setMisses] = useState(0);

  const svgRef = useRef<SVGSVGElement>(null);
  /** Where the press started, so a press that never really moved can be told
   *  from a drag. Null means nothing is being pressed. A few pixels of slop,
   *  because a click on a trackpad is never perfectly still and treating one
   *  as a drag drops the cable the moment it is picked up. */
  const from = useRef<{ x: number; y: number } | null>(null);
  const SLOP = 8;

  const done = isPatched(panel, made);

  const rowOf = useCallback(
    (side: "left" | "right", id: StrandId) =>
      (side === "left" ? panel.left : panel.right).indexOf(id),
    [panel],
  );

  /** Client coordinates into panel coordinates. The SVG is laid out at its own
   *  aspect ratio and given `height: auto`, so one scale does both axes and
   *  there is no letterboxing to correct for. */
  const at = useCallback((e: { clientX: number; clientY: number }) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r || r.width === 0) return { x: 0, y: 0 };
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  }, []);

  /** Joining two ends, wherever the intent came from. */
  const join = useCallback(
    (a: End, b: End) => {
      if (a.side === b.side) {
        setHeld(b);
        sound.keypress();
        return;
      }
      if (!joins(a.id, b.id)) {
        sound.toss();
        setWrong(b.id);
        setMisses((n) => n + 1);
        setHeld(null);
        return;
      }
      const next = [...made, b.id];
      setMade(next);
      setHeld(null);
      setWrong(null);
      sound.latch();
      if (next.length >= PANEL_SIZE) {
        sound.recovered();
        onSolved();
      }
    },
    [made, onSolved],
  );

  /** The click path, and the tail of the drag path. */
  const touch = useCallback(
    (end: End) => {
      if (done || made.includes(end.id)) return;
      if (!held) {
        setHeld(end);
        setWrong(null);
        sound.keypress();
        return;
      }
      join(held, end);
    },
    [done, held, made, join],
  );

  /* Dragging ---------------------------------------------------------------- */

  const takeHold = (end: End) => (e: React.PointerEvent) => {
    if (done || made.includes(end.id)) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    from.current = { x: e.clientX, y: e.clientY };
    // A press with an end already in hand from a CLICK is the second half of
    // that click, so it is resolved here rather than starting a new drag.
    if (held && held.side !== end.side) {
      join(held, end);
      return;
    }
    setHeld(end);
    setWrong(null);
    setTip(at(e));
    sound.keypress();
  };

  const dragging = (e: { clientX: number; clientY: number }) =>
    from.current !== null &&
    Math.hypot(e.clientX - from.current.x, e.clientY - from.current.y) > SLOP;

  const drag = (e: React.PointerEvent) => {
    if (!held || !dragging(e)) return;
    setTip(at(e));
  };

  const letGo = (e: React.PointerEvent) => {
    if (!held) return;
    const wasDrag = dragging(e);
    from.current = null;
    setTip(null);
    // Never really moved: this was a click. Leave the end in hand so the other
    // end can be clicked, which is the whole of the no-drag path.
    if (!wasDrag) return;

    const p = at(e);
    const other = held.side === "left" ? "right" : "left";
    const ids = other === "left" ? panel.left : panel.right;
    const x = other === "left" ? LEFT_X : RIGHT_X;

    // A plain loop rather than a reduce or a forEach: assigning to an outer
    // `let` from inside a callback is exactly the shape TypeScript narrows to
    // `never`, and the workarounds for that are longer than the loop.
    let best: End | null = null;
    let bestD = SNAP;
    for (let i = 0; i < ids.length; i++) {
      if (made.includes(ids[i])) continue;
      const d = Math.hypot(p.x - x, p.y - rowY(i));
      if (d < bestD) {
        bestD = d;
        best = { side: other, id: ids[i], i };
      }
    }

    if (best) join(held, best);
    else setHeld(null);
  };

  /* Drawing ----------------------------------------------------------------- */

  /** A cable: from an end, to an end or to wherever the hand is. Sagging,
   *  because a cable that runs dead straight between two points is a wire in a
   *  diagram rather than a cable in a rack. */
  const cable = (x1: number, y1: number, x2: number, y2: number) =>
    `M${x1} ${y1} C${x1 + (x2 - x1) * 0.4} ${y1 + 22} ${x1 + (x2 - x1) * 0.6} ${y2 + 22} ${x2} ${y2}`;

  const terminal = (side: "left" | "right", id: StrandId, i: number) => {
    const strand = strandById(id)!;
    const patched = made.includes(id);
    const lifted = held?.side === side && held.id === id;
    const x = side === "left" ? LEFT_X : RIGHT_X;
    const y = rowY(i);
    // The plate runs from the panel edge in to the terminal.
    const plateX = side === "left" ? 6 : RIGHT_X + 8;

    return (
      <g
        key={id}
        className={`xg-term ${patched ? "is-done" : ""} ${lifted ? "is-held" : ""} ${
          wrong === id ? "is-wrong" : ""
        }`}
        style={{ ["--strand" as string]: strand.hex }}
        role="button"
        tabIndex={patched || done ? -1 : 0}
        aria-label={`${strand.name}, ${side === "left" ? "left" : "right"} side${
          patched ? ", patched" : ""
        }`}
        onPointerDown={takeHold({ side, id, i })}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          touch({ side, id, i });
        }}
      >
        <rect className="xg-plate" x={plateX} y={y - 17} width={90} height={34} rx={3} />
        <text className="xg-label" x={side === "left" ? plateX + 10 : plateX + 80} y={y + 4}
          textAnchor={side === "left" ? "start" : "end"}>
          {strand.name}
        </text>
        {/* On the left, a stub of cable hanging out of the terminal — which is
            the whole instruction. A socket with nothing in it says "a thing
            goes here"; a loose end says "take hold of this". The right side
            stays an empty socket, because that is where it goes. */}
        {side === "left" && !patched ? (
          <path className="xg-stub" d={`M${x} ${y} q17 6 30 2`} />
        ) : null}
        <circle className="xg-socket" cx={x} cy={y} r={12} />
        <circle className="xg-pin" cx={x} cy={y} r={5} />
        {/* The whole row is grabbable, not just the 11px circle — and on the
            left it has to reach past the socket to the END of the loose cable,
            because the loose end is the thing that looks grabbable and it hangs
            30 units clear of the terminal. It used to stop at the socket, so
            the last third of the most inviting object on screen did nothing. */}
        <rect
          className="xg-grab"
          x={side === "left" ? 4 : RIGHT_X - 18}
          y={y - 19}
          width={side === "left" ? LEFT_X + 38 : 120}
          height={38}
        />
      </g>
    );
  };

  return (
    <div className="xg" role="dialog" aria-modal="true" aria-label="The patch panel">
      <div className="xg-card">
        <header className="xg-head">
          <p className="xg-kicker">PATCH PANEL</p>
          <h2 className="xg-title">{done ? "Patched" : "Unpatched"}</h2>
          <p className="xg-note">
            {done
              ? "Every strand back where it belongs."
              : "Drag a cable across to the socket of the same colour. The colour is on the label as well, so you do not have to trust the colour — and clicking one end then the other does the same job."}
          </p>
        </header>

        <svg
          ref={svgRef}
          className="xg-panel"
          viewBox={`0 0 ${W} ${H}`}
          xmlns="http://www.w3.org/2000/svg"
          onPointerMove={drag}
          onPointerUp={letGo}
          onPointerCancel={letGo}
        >
          {/* The cables that are already in. Behind the terminals, so an end
              goes INTO its socket rather than sitting on top of it. */}
          <g>
            {made.map((id) => {
              const strand = strandById(id)!;
              return (
                <path
                  key={id}
                  className="xg-run"
                  style={{ ["--strand" as string]: strand.hex }}
                  d={cable(LEFT_X, rowY(rowOf("left", id)), RIGHT_X, rowY(rowOf("right", id)))}
                />
              );
            })}
          </g>

          {/* The one in hand. */}
          {held && tip ? (
            <path
              className="xg-run is-live"
              style={{ ["--strand" as string]: strandById(held.id)!.hex }}
              d={cable(
                held.side === "left" ? LEFT_X : RIGHT_X,
                rowY(held.i),
                tip.x,
                tip.y,
              )}
            />
          ) : null}

          {panel.left.map((id, i) => terminal("left", id, i))}
          {panel.right.map((id, i) => terminal("right", id, i))}
        </svg>

        <footer className="xg-foot">
          <Help title="The patch panel" text={HELP} />
          {done ? null : (
            <p className="xg-tally">
              {made.length} / {PANEL_SIZE} in
              {misses > 0 ? ` · ${misses} wrong so far. Nothing locks.` : " · nothing is timed here."}
            </p>
          )}
          {done ? (
            <button type="button" className="btn btn-solid" onClick={onClose} autoFocus>
              Take the record
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setSeed((n) => n + 1);
                setMade([]);
                setHeld(null);
                setTip(null);
                setWrong(null);
              }}
            >
              Pull them all out
            </button>
          )}
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Step back
          </button>
        </footer>
      </div>
    </div>
  );
}

const HELP = {
  what:
    "Somebody pulled every cable out of the rack and did not label them. The loose ends are down the left; the empty sockets are down the right, in a different order.",
  controls: [
    "Drag a loose end across to the socket of the same colour and let go. It snaps in if you are near enough.",
    "Or click one end and then click the other — no dragging needed.",
    "Keyboard: tab to a terminal and press Enter or Space to take it, then tab to its partner and press again.",
    "Every terminal is labelled with its colour's name, so none of this depends on telling the colours apart.",
  ],
  win: `All ${PANEL_SIZE} strands back where they belong. Nothing is timed, nothing locks, and a wrong socket just lets go.`,
};
