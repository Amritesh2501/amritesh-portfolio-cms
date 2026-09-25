"use client";

import { useCallback, useMemo, useState } from "react";
import { PANEL_SIZE, isPatched, joins, makePanel, strandById, type StrandId } from "@/lib/wires";
import * as sound from "@/lib/sound";

/**
 * The patch panel.
 *
 * Terminals down each side, the pairs scrambled. Click one end, click the
 * other; matched stays lit, mismatched buzzes and clears. Nothing is timed and
 * nothing locks — a wiring job is fiddly, not tense, and putting a clock on it
 * would make it a different and worse thing.
 *
 * Colour is never the only signal. Every terminal carries its strand's NAME as
 * well as its colour, because a puzzle whose entire mechanic is matching hues
 * is a puzzle somebody colour-blind cannot play at all.
 */
export function Wires({ onSolved, onClose }: { onSolved: () => void; onClose: () => void }) {
  const [seed, setSeed] = useState(0);
  const panel = useMemo(() => makePanel(), [seed]);

  const [held, setHeld] = useState<{ side: "left" | "right"; id: StrandId } | null>(null);
  const [made, setMade] = useState<StrandId[]>([]);
  const [wrong, setWrong] = useState<StrandId | null>(null);
  const [misses, setMisses] = useState(0);

  const done = isPatched(panel, made);

  const touch = useCallback(
    (side: "left" | "right", id: StrandId) => {
      if (done || made.includes(id)) return;

      if (!held) {
        setHeld({ side, id });
        setWrong(null);
        sound.keypress();
        return;
      }

      // Same end again: put it down.
      if (held.side === side) {
        setHeld({ side, id });
        sound.keypress();
        return;
      }

      if (joins(held.id, id)) {
        const next = [...made, id];
        setMade(next);
        setHeld(null);
        sound.latch();
        if (next.length >= PANEL_SIZE) {
          sound.recovered();
          onSolved();
        }
        return;
      }

      sound.toss();
      setWrong(id);
      setMisses((n) => n + 1);
      setHeld(null);
    },
    [done, held, made, onSolved],
  );

  const column = (side: "left" | "right") =>
    (side === "left" ? panel.left : panel.right).map((id) => {
      const strand = strandById(id)!;
      const patched = made.includes(id);
      const lifted = held?.side === side && held.id === id;
      return (
        <li key={id}>
          <button
            type="button"
            className={`xg-port ${patched ? "is-done" : ""} ${lifted ? "is-held" : ""} ${
              wrong === id ? "is-wrong" : ""
            }`}
            style={{ ["--strand" as string]: strand.hex }}
            onClick={() => touch(side, id)}
            disabled={patched || done}
          >
            <span className="xg-port-dot" aria-hidden />
            <span className="xg-port-name">{strand.name}</span>
          </button>
        </li>
      );
    });

  return (
    <div className="xg" role="dialog" aria-modal="true" aria-label="The patch panel">
      <div className="xg-card">
        <header className="xg-head">
          <p className="xg-kicker">PATCH PANEL</p>
          <h2 className="xg-title">{done ? "Patched" : "Unpatched"}</h2>
          <p className="xg-note">
            {done
              ? "Every strand back where it belongs."
              : "Pick an end, then the end it belongs to. The colour is on the label as well, so you do not have to trust the colour."}
          </p>
        </header>

        <div className="xg-panel">
          <ul className="xg-side">{column("left")}</ul>
          <span className="xg-gap" aria-hidden>
            {made.length} / {PANEL_SIZE}
          </span>
          <ul className="xg-side is-right">{column("right")}</ul>
        </div>

        <footer className="xg-foot">
          {done ? null : (
            <p className="xg-tally">
              {misses > 0 ? `${misses} wrong so far. Nothing locks.` : "Nothing is timed here."}
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
