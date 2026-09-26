"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { GRID, ROUNDS, STEPS, adjacent, makePath } from "@/lib/path";
import * as sound from "@/lib/sound";
import { Help } from "./Help";

/**
 * The route back into his machine.
 *
 * A path lights up across a nine by nine grid one cell at a time. Then it goes
 * out and you walk it. Three rounds, each a fresh path.
 *
 * Two decisions that are the whole feel of it:
 *
 * A wrong step does not fail the round — it shows you the path again and puts
 * you back at the start of the same one. Failing a memory game outright means
 * the player who was one cell off has to sit through a NEW path, having learnt
 * nothing, and the thing they wanted was another look at the one they nearly
 * had. Nothing here is a test.
 *
 * You can ask to see it again at any time, for free. A memory game that hides
 * the replay behind a penalty is really a game about how confident you are, and
 * the interesting part of this one is holding a shape in your head.
 */

/** How long each cell of the path stays lit while it is being shown. */
const SHOW_MS = 300;
/** A beat before the path starts, so the first cell is not already going when
 *  the eye arrives. */
const LEAD_MS = 650;

const HELP = {
  what:
    "His machine wants the route back in. A path lights up across the grid one square at a time — then it goes out, and you walk it yourself.",
  controls: [
    "Watch the path light up. It never jumps and never crosses itself.",
    "Then click the squares in the same order, starting from the first.",
    "Keyboard: tab to a square and press Enter or Space.",
    "Show me again replays the path as many times as you like. It costs nothing.",
  ],
  win: `Walk ${ROUNDS} routes and the machine opens. A wrong square just shows you the same route again — you are never sent back to the start of the game.`,
};

type Phase = "showing" | "walking" | "won";

export function PathLock({ onSolved, onClose }: { onSolved: () => void; onClose: () => void }) {
  const reduce = useReducedMotion();

  const [round, setRound] = useState(0);
  const [path, setPath] = useState<number[]>(() => makePath());
  const [phase, setPhase] = useState<Phase>("showing");
  /** How much of the path is lit while it is being shown. */
  const [shown, setShown] = useState(0);
  /** How much of it the player has walked back. */
  const [walked, setWalked] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const [replays, setReplays] = useState(0);

  const timers = useRef<number[]>([]);
  const clearPending = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    // Emptied in place, never reassigned: the unmount cleanup below captured
    // this array at mount, and handing it a new one would leave that cleanup
    // holding the old array while every later timer outlives the component.
    timers.current.length = 0;
  }, []);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(window.clearTimeout);
  }, []);

  /* Showing the path -------------------------------------------------------- */

  const show = useCallback(
    (route: number[]) => {
      clearPending();
      setPhase("showing");
      setShown(0);
      setWalked(0);
      setWrong(null);

      // Reduced motion gets the whole route at once and then a pause. It is the
      // same information; what it is not is eleven separate things moving.
      if (reduce) {
        setShown(route.length);
        timers.current.push(
          window.setTimeout(() => {
            setShown(0);
            setPhase("walking");
          }, 2200),
        );
        return;
      }

      route.forEach((_, i) => {
        timers.current.push(
          window.setTimeout(() => {
            setShown(i + 1);
            sound.keypress();
          }, LEAD_MS + i * SHOW_MS),
        );
      });
      timers.current.push(
        window.setTimeout(
          () => {
            setShown(0);
            setPhase("walking");
          },
          LEAD_MS + route.length * SHOW_MS + 420,
        ),
      );
    },
    [clearPending, reduce],
  );

  useEffect(() => {
    show(path);
    // Only when the path itself changes. `show` is stable.
  }, [path, show]);

  /* Walking it back --------------------------------------------------------- */

  const step = useCallback(
    (cell: number) => {
      if (phase !== "walking") return;

      if (cell !== path[walked]) {
        // Wrong. Show the SAME route again rather than failing the round: the
        // player who was one cell out wants another look at this one.
        sound.toss();
        setWrong(cell);
        timers.current.push(window.setTimeout(() => show(path), 700));
        setPhase("showing");
        return;
      }

      const next = walked + 1;
      setWalked(next);
      sound.latch();

      if (next < path.length) return;

      const done = round + 1;
      if (done >= ROUNDS) {
        setPhase("won");
        sound.recovered();
        onSolved();
        return;
      }
      setRound(done);
      // A new path re-runs the effect above, which shows it.
      timers.current.push(window.setTimeout(() => setPath(makePath()), 620));
    },
    [phase, path, walked, round, show, onSolved],
  );

  /* Drawing ----------------------------------------------------------------- */

  const cells = Array.from({ length: GRID * GRID }, (_, i) => i);
  const showIndex = (i: number) => path.slice(0, shown).indexOf(i);
  const walkIndex = (i: number) => path.slice(0, walked).indexOf(i);

  const label = (i: number) => {
    const c = (i % GRID) + 1;
    const r = Math.floor(i / GRID) + 1;
    return `Row ${r}, column ${c}`;
  };

  return (
    <div className="xl2" role="dialog" aria-modal="true" aria-label="The route in">
      <div className="xl2-card">
        <header className="xl2-head">
          <p className="xl2-kicker">REMEMBER THE ROUTE</p>
          <p className="xl2-count">
            {Math.min(round + (phase === "won" ? 0 : 0), ROUNDS)} / {ROUNDS} walked
          </p>
        </header>

        <p className="xl2-state" aria-live="polite">
          {phase === "won"
            ? "The machine is open."
            : phase === "showing"
              ? "Watch."
              : `Walk it. ${walked} of ${STEPS}.`}
        </p>

        <div
          className={`xl2-grid ${phase === "showing" ? "is-showing" : ""}`}
          style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}
        >
          {cells.map((i) => {
            const s = showIndex(i);
            const w = walkIndex(i);
            const isNext = phase === "walking" && walked > 0 && adjacent(path[walked - 1], i);
            return (
              <button
                key={i}
                type="button"
                className={`xl2-cell ${s >= 0 ? "is-lit" : ""} ${w >= 0 ? "is-walked" : ""} ${
                  wrong === i ? "is-wrong" : ""
                } ${isNext ? "is-near" : ""}`}
                onClick={() => step(i)}
                disabled={phase !== "walking"}
                aria-label={label(i)}
              >
                {s >= 0 ? <span aria-hidden>{s + 1}</span> : null}
              </button>
            );
          })}
        </div>

        <footer className="xl2-foot">
          <Help title="Remember the route" text={HELP} />
          <div className="xl2-actions">
            {phase === "won" ? (
              <button type="button" className="btn btn-solid" onClick={onClose} autoFocus>
                Use the machine
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setReplays((n) => n + 1);
                  show(path);
                }}
                disabled={phase === "showing"}
              >
                Show me again{replays > 0 ? ` (${replays})` : ""}
              </button>
            )}
            <button type="button" className="btn btn-sm" onClick={onClose}>
              Step back
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
