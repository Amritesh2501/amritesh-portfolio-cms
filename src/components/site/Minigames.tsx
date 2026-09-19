"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PAGE_ORDER,
  RECALL_ROUNDS,
  SIGNALS,
  buildSequence,
  isOrdered,
  shuffleOrder,
  swapAt,
} from "@/lib/world";

/**
 * The two puzzles that are not Untangle.
 *
 * Both are about the portfolio rather than about themselves: one is the page's
 * own section order, the other is the four things the site is actually asking
 * you to do. The rules live in lib/world so they can be checked; what is here
 * is the board and the keyboard.
 *
 * Both are built out of real <button>s rather than drag targets. Untangle
 * already carries the pointer-only game in this world and had to grow an
 * arrow-key fallback to be playable at all; these two are simply operable to
 * begin with.
 */

/* ---------------------------------------------------------------------------
   Order: the house came apart
   ------------------------------------------------------------------------- */

export function OrderGame({ onSolved }: { onSolved: () => void }) {
  const [items, setItems] = useState(() => shuffleOrder(PAGE_ORDER));
  const [moves, setMoves] = useState(0);
  const solved = isOrdered(items, PAGE_ORDER);

  // Fires once. `solved` is derived from the items, so it stays true for every
  // render after the winning move and a bare call would run on all of them.
  const fired = useRef(false);
  useEffect(() => {
    if (!solved || fired.current) return;
    fired.current = true;
    onSolved();
  }, [solved, onSolved]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    setItems((prev) => swapAt(prev, from, to));
    setMoves((m) => m + 1);
  };

  return (
    <div className="mg">
      <div className="mg-hud">
        <span>Floors {items.length}</span>
        <span role="status" aria-live="polite">
          {solved ? "In order" : `${countWrong(items)} out of place`}
        </span>
        <span className="tabular-nums">{moves} moves</span>
      </div>

      <ol className={`mg-order ${solved ? "is-solved" : ""}`}>
        {items.map((label, i) => (
          <li
            key={label}
            className={`mg-floor ${label === PAGE_ORDER[i] ? "is-home" : ""}`}
          >
            <span className="mg-floor-n tabular-nums" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="mg-floor-name">{label}</span>
            <span className="mg-floor-arrows">
              <button
                type="button"
                className="mg-nudge"
                disabled={i === 0 || solved}
                onClick={() => move(i, i - 1)}
                aria-label={`Move ${label} up`}
              >
                ↑
              </button>
              <button
                type="button"
                className="mg-nudge"
                disabled={i === items.length - 1 || solved}
                onClick={() => move(i, i + 1)}
                aria-label={`Move ${label} down`}
              >
                ↓
              </button>
            </span>
          </li>
        ))}
      </ol>

      <p className="mg-hint">
        {solved
          ? "That is the page, top to bottom."
          : "Move each floor until they read the way the site does."}
      </p>
    </div>
  );
}

function countWrong(items: readonly string[]) {
  return items.reduce((n, v, i) => (v === PAGE_ORDER[i] ? n : n + 1), 0);
}

/* ---------------------------------------------------------------------------
   Recall: the mast is still transmitting
   ------------------------------------------------------------------------- */

// Per pad while the mast is playing: lit, then dark. The dark gap is what
// makes two of the same pad in a row readable as two.
const LIT_MS = 480;
const GAP_MS = 220;

type Phase = "idle" | "playing" | "input" | "wrong" | "won";

export function RecallGame({ onSolved }: { onSolved: () => void }) {
  const [round, setRound] = useState(1);
  const [sequence, setSequence] = useState<number[]>(() => buildSequence(1));
  const [phase, setPhase] = useState<Phase>("idle");
  const [lit, setLit] = useState<number | null>(null);
  const [at, setAt] = useState(0);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  }, []);

  // Every timeout is tracked and cleared together. The mast plays a chain of
  // them, and a player who closes the panel or hits Replay mid-chain would
  // otherwise get the rest of the old sequence flashing over the new one.
  const play = useCallback(
    (seq: number[]) => {
      clearTimers();
      setPhase("playing");
      setAt(0);
      setLit(null);

      seq.forEach((pad, i) => {
        const start = 500 + i * (LIT_MS + GAP_MS);
        timers.current.push(window.setTimeout(() => setLit(pad), start));
        timers.current.push(window.setTimeout(() => setLit(null), start + LIT_MS));
      });

      timers.current.push(
        window.setTimeout(
          () => setPhase("input"),
          500 + seq.length * (LIT_MS + GAP_MS),
        ),
      );
    },
    [clearTimers],
  );

  useEffect(() => {
    play(sequence);
    return clearTimers;
    // Only when the sequence itself changes: a new round, or a replay that
    // built a new one. Replaying the same one goes through the button.
  }, [sequence, play, clearTimers]);

  const press = (pad: number) => {
    if (phase !== "input") return;

    if (sequence[at] !== pad) {
      clearTimers();
      setPhase("wrong");
      return;
    }

    const next = at + 1;
    setAt(next);
    if (next < sequence.length) return;

    if (round >= RECALL_ROUNDS) {
      setPhase("won");
      onSolved();
      return;
    }

    // Held for a beat so the last pad's flash is seen before the mast starts
    // the longer sequence over the top of it.
    setPhase("playing");
    timers.current.push(
      window.setTimeout(() => {
        setRound((r) => r + 1);
        setSequence(buildSequence(round + 1));
      }, 700),
    );
  };

  const restart = () => {
    setRound(1);
    setAt(0);
    setSequence(buildSequence(1));
  };

  return (
    <div className="mg">
      <div className="mg-hud">
        <span>
          Round {Math.min(round, RECALL_ROUNDS)} of {RECALL_ROUNDS}
        </span>
        <span role="status" aria-live="polite">
          {
            {
              idle: "Standing by",
              playing: "Transmitting",
              input: "Repeat it",
              wrong: "Lost the signal",
              won: "Locked on",
            }[phase]
          }
        </span>
        <span className="tabular-nums">
          {at}/{sequence.length}
        </span>
      </div>

      <div className="mg-pads">
        {SIGNALS.map((label, pad) => (
          <button
            key={label}
            type="button"
            className={`mg-pad ${lit === pad ? "is-lit" : ""}`}
            disabled={phase !== "input"}
            onClick={() => press(pad)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mg-foot">
        <p className="mg-hint">
          {phase === "wrong"
            ? "That was not it. The mast will start again."
            : phase === "won"
              ? "Four rounds clean. The line is yours."
              : "Watch the mast, then press the pads back in the same order."}
        </p>
        {phase === "wrong" ? (
          <button type="button" className="btn btn-sm" onClick={restart}>
            Listen again
          </button>
        ) : null}
      </div>
    </div>
  );
}
