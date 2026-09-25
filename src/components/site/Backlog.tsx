"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  COLS,
  ROWS,
  TARGET,
  areNeighbours,
  hasMove,
  isLegal,
  makeBoard,
  settle,
  swapped,
  type Board,
} from "@/lib/match3";
import * as sound from "@/lib/sound";

/**
 * The backlog.
 *
 * A match-three on the screen at his old desk. The joke only works if it plays
 * like the thing it is named after, so the mechanics are the real ones: swap
 * two neighbours, three in a line clears, everything above falls, new tickets
 * come in at the top, and a clear can cascade.
 *
 * A swap that makes no match is REFUSED rather than performed and undone.
 * Undoing it looks exactly like the click being dropped, and a game that
 * appears to ignore input is a game people stop playing.
 *
 * The board is reshuffled if it ever runs out of moves, which lib/match3
 * guarantees cannot happen at the start but can happen after a cascade.
 */

/** What a ticket is, per kind. Shape as well as colour, because a grid that
 *  can only be read by hue cannot be played by everybody. */
const KIND = [
  { name: "Bug", mark: "!", hex: "#e2564a" },
  { name: "Chore", mark: "=", hex: "#e0a33c" },
  { name: "Feature", mark: "+", hex: "#4fb477" },
  { name: "Spike", mark: "?", hex: "#4a86d8" },
  { name: "Debt", mark: "~", hex: "#9a6fd0" },
];

export function Backlog({ onSolved, onClose }: { onSolved: () => void; onClose: () => void }) {
  const [board, setBoard] = useState<Board>(() => makeBoard());
  const [cleared, setCleared] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<number | null>(null);
  const done = cleared >= TARGET;
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(window.clearTimeout);
  }, []);

  /** Cascade to a stop, a step at a time, so the falls are visible. */
  const cascade = useCallback((from: Board) => {
    setBusy(true);
    let live = from;

    const step = () => {
      const next = settle(live);
      if (next.cleared === 0) {
        // A board with nothing left to play is dealt again rather than left
        // there: it is not the player's fault and there is nothing to do.
        if (!hasMove(live)) {
          live = makeBoard();
          setBoard(live);
        }
        setBusy(false);
        return;
      }
      live = next.board;
      setBoard(live);
      setCleared((n) => {
        const total = n + next.cleared;
        if (total >= TARGET && n < TARGET) {
          sound.recovered();
          onSolved();
        }
        return total;
      });
      sound.keypress();
      timers.current.push(window.setTimeout(step, 220));
    };

    timers.current.push(window.setTimeout(step, 120));
  }, [onSolved]);

  const tap = (i: number) => {
    if (busy || done) return;

    if (picked === null) {
      setPicked(i);
      setRefused(null);
      return;
    }
    if (picked === i) {
      setPicked(null);
      return;
    }
    if (!areNeighbours(picked, i)) {
      setPicked(i);
      return;
    }

    if (!isLegal(board, picked, i)) {
      // Refused, not undone. An undo looks like a dropped click.
      sound.toss();
      setRefused(i);
      setPicked(null);
      return;
    }

    const next = swapped(board, picked, i);
    setBoard(next);
    setPicked(null);
    setRefused(null);
    sound.latch();
    cascade(next);
  };

  return (
    <div className="xt" role="dialog" aria-modal="true" aria-label="The backlog">
      <div className="xt-card">
        <header className="xt-head">
          <p className="xt-kicker">THE BACKLOG</p>
          <p className="xt-count">
            {Math.min(cleared, TARGET)} / {TARGET} closed
          </p>
        </header>

        <div className="xt-bar" aria-hidden>
          <span style={{ transform: `scaleX(${Math.min(1, cleared / TARGET)})` }} />
        </div>

        {done ? (
          <div className="xt-done">
            <p className="xt-done-line">Sprint closed. Nobody is going to thank you.</p>
            <button type="button" className="btn btn-solid" onClick={onClose} autoFocus>
              Take the record
            </button>
          </div>
        ) : (
          <>
            <div
              className="xt-grid"
              style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
            >
              {board.map((kind, i) => {
                const k = KIND[kind] ?? KIND[0];
                // Marked while a tile is in hand: the neighbours it would
                // actually clear against. Four checks, not a solver.
                const can =
                  picked !== null && areNeighbours(picked, i) && isLegal(board, picked, i);
                return (
                  <button
                    key={i}
                    type="button"
                    className={`xt-cell ${picked === i ? "is-picked" : ""} ${
                      can ? "is-can" : ""
                    } ${refused === i ? "is-refused" : ""}`}
                    style={{ ["--tile" as string]: k.hex }}
                    onClick={() => tap(i)}
                    disabled={busy}
                    aria-label={`${k.name}, row ${Math.floor(i / COLS) + 1}, column ${(i % COLS) + 1}`}
                  >
                    <span aria-hidden>{k.mark}</span>
                  </button>
                );
              })}
            </div>

            <p className="xt-note">
              {picked === null
                ? "Pick a ticket. Swap it with a neighbour to line up three of a kind."
                : "The outlined neighbours are the swaps that clear something. Anything else is refused rather than taken back."}
            </p>
          </>
        )}

        <footer className="xt-foot">
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Step back
          </button>
        </footer>
      </div>
    </div>
  );
}
