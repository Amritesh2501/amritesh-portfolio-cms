"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  CIPHER_STAGES,
  MISTAKES_ALLOWED,
  decoderFor,
  encode,
  isCorrect,
  makeKey,
  slotsFor,
} from "@/lib/cipher";
import * as sound from "@/lib/sound";
import { Help } from "./Help";

/**
 * The terminal on his desk.
 *
 * A substitution cipher with the key on screen and a clock running. The work
 * is doing a dozen lookups accurately under time pressure, which is a
 * different thing from cryptanalysis and a much better thing to put in front
 * of somebody who came here to look at a portfolio.
 *
 * Everything that could make it unsolvable — a letter standing on itself, two
 * letters sharing an image, a key missing a letter the message uses — is ruled
 * out in lib/cipher and checked against six thousand generated keys, because
 * all three failures look like the player being stupid rather than like a bug.
 *
 * What is in here is only the machine: a clock, three strikes, and the boxes.
 */

type Phase = "running" | "cleared" | "locked" | "done";

export function Cipher({ onSolved, onClose }: { onSolved: () => void; onClose: () => void }) {
  const reduce = useReducedMotion();

  const [stage, setStage] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [phase, setPhase] = useState<Phase>("running");
  const [letters, setLetters] = useState<string[]>([]);
  const [shake, setShake] = useState(0);

  // One key per stage. Regenerated when the stage changes, so a second run
  // through is not the same puzzle twice.
  const [keySeed, setKeySeed] = useState(0);
  const key = useMemo(() => makeKey(), [keySeed]);

  const current = CIPHER_STAGES[stage];
  const cipher = useMemo(() => encode(current.plain, key), [current, key]);
  const table = useMemo(() => decoderFor(current.plain, key), [current, key]);
  const slots = useMemo(() => slotsFor(current.plain), [current]);

  const [left, setLeft] = useState(current.seconds);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  /* The clock -------------------------------------------------------------- */

  useEffect(() => {
    if (phase !== "running") return;
    if (left <= 0) {
      setPhase("locked");
      sound.latch();
      return;
    }
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left, phase]);

  /* A stage ---------------------------------------------------------------- */

  const begin = useCallback(
    (index: number) => {
      setStage(index);
      setKeySeed((n) => n + 1);
      setLetters([]);
      setLeft(CIPHER_STAGES[index].seconds);
      setPhase("running");
      window.setTimeout(() => boxes.current[0]?.focus(), 30);
    },
    [],
  );

  /* Typing ----------------------------------------------------------------- */

  /**
   * Indices of the boxes that take a letter.
   *
   * The gaps are rendered but not typed into, so moving between boxes has to
   * step over them — typing a space to cross a word break is exactly the kind
   * of thing that costs somebody the clock for no reason.
   */
  const typable = useMemo(
    () => slots.map((s, i) => (s === "letter" ? i : -1)).filter((i) => i >= 0),
    [slots],
  );

  const setAt = (slot: number, value: string) => {
    setLetters((prev) => {
      const next = [...prev];
      next[slot] = value;
      return next;
    });
  };

  const focusStep = (slot: number, delta: number) => {
    const at = typable.indexOf(slot);
    const next = typable[at + delta];
    if (next !== undefined) boxes.current[next]?.focus();
  };

  const onType = (slot: number, raw: string) => {
    if (phase !== "running") return;
    const value = raw.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(-1);
    setAt(slot, value);
    if (value) {
      sound.keypress();
      focusStep(slot, 1);
    }
  };

  const onKeyDown = (slot: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !letters[slot]) {
      e.preventDefault();
      focusStep(slot, -1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusStep(slot, -1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusStep(slot, 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  /* Marking ---------------------------------------------------------------- */

  const guess = slots.map((s, i) => (s === "gap" ? " " : (letters[i] ?? ""))).join("");

  const submit = useCallback(() => {
    if (phase !== "running") return;

    if (isCorrect(guess, current.plain)) {
      sound.recovered();
      const next = stage + 1;
      if (next >= CIPHER_STAGES.length) {
        setPhase("done");
        onSolved();
        return;
      }
      setPhase("cleared");
      window.setTimeout(() => begin(next), reduce ? 0 : 1400);
      return;
    }

    sound.latch();
    setShake((n) => n + 1);
    setMistakes((m) => {
      const next = m + 1;
      if (next >= MISTAKES_ALLOWED) setPhase("locked");
      return next;
    });
  }, [phase, guess, current.plain, stage, onSolved, begin, reduce]);

  useEffect(() => {
    window.setTimeout(() => boxes.current[0]?.focus(), 30);
  }, []);

  const dead = phase === "locked";
  const mm = String(Math.floor(Math.max(0, left) / 60)).padStart(2, "0");
  const ss = String(Math.max(0, left) % 60).padStart(2, "0");

  return (
    <div className="xc" role="dialog" aria-modal="true" aria-label="Cipher terminal">
      <div className={`xc-crt ${dead ? "is-dead" : ""}`} key={shake}>
        {/* The HUD: stage, attempts, mistakes, clock. */}
        <div className="xc-hud">
          <span className="xc-hud-cell">
            <b>STAGE</b>
            {String(stage + 1).padStart(2, "0")} / {String(CIPHER_STAGES.length).padStart(2, "0")}
          </span>
          <span className="xc-hud-cell">
            <b>ATTEMPTS</b>
            {MISTAKES_ALLOWED - mistakes} LEFT
          </span>
          <span className="xc-hud-cell">
            <b>MISTAKES</b>
            <span className="xc-pips" aria-hidden>
              {Array.from({ length: MISTAKES_ALLOWED }, (_, i) => (
                <i key={i} className={i < mistakes ? "is-spent" : ""} />
              ))}
            </span>
          </span>
          <span className={`xc-hud-cell xc-clock ${left <= 15 ? "is-low" : ""}`}>
            <b>T-MINUS</b>
            {mm}:{ss}
          </span>
        </div>

        <div className="xc-body">
          {/* The message. */}
          <p className="xc-label">INTERCEPTED</p>
          <p className="xc-cipher" aria-label={`Encrypted message: ${cipher}`}>
            {cipher}
          </p>
          <p className="xc-hint">{current.hint}</p>

          {/* The key. Sorted by the cipher letter, because that is the order
              the message is read in — sorted by the answer, the player scans
              the whole table for every character. */}
          <p className="xc-label">DECODER KEY</p>
          <ul className="xc-key">
            {table.map((row) => (
              <li key={row.from}>
                <span className="xc-key-from">{row.from}</span>
                <span className="xc-key-arrow" aria-hidden>
                  →
                </span>
                <span className="xc-key-to">{row.to}</span>
              </li>
            ))}
          </ul>

          {/* The answer. */}
          <p className="xc-label">DECODED</p>
          <div className="xc-slots">
            {slots.map((slot, i) =>
              slot === "gap" ? (
                <span key={i} className="xc-gap" aria-hidden />
              ) : (
                <input
                  key={i}
                  ref={(el) => {
                    boxes.current[i] = el;
                  }}
                  className="xc-box"
                  value={letters[i] ?? ""}
                  onChange={(e) => onType(i, e.target.value)}
                  onKeyDown={(e) => onKeyDown(i, e)}
                  disabled={dead || phase === "done"}
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={`Letter ${typable.indexOf(i) + 1} of ${typable.length}`}
                />
              ),
            )}
          </div>
        </div>

        {/* What the machine says back. */}
        <div className="xc-foot">
          <Help title="The terminal" text={HELP} />

          {phase === "running" ? (
            <>
              <button type="button" className="xc-go" onClick={submit}>
                Transmit
              </button>
              <p className="xc-status">AWAITING INPUT</p>
            </>
          ) : null}

          {phase === "cleared" ? (
            <p className="xc-status is-ok" role="status">
              ACCEPTED — ADVANCING
            </p>
          ) : null}

          {phase === "done" ? (
            <>
              <p className="xc-status is-ok" role="status">
                ALL STAGES CLEARED
              </p>
              <button type="button" className="xc-go" onClick={onClose}>
                Close the terminal
              </button>
            </>
          ) : null}

          {dead ? (
            <>
              <p className="xc-locked" role="status">
                SYSTEM LOCKED
              </p>
              <button
                type="button"
                className="xc-go"
                onClick={() => {
                  setMistakes(0);
                  begin(stage);
                }}
              >
                Reset
              </button>
            </>
          ) : null}

          <button type="button" className="xc-back" onClick={onClose}>
            Step away
          </button>
        </div>

        {/* The glass. Scanlines and a bloom, and nothing that takes a click. */}
        <span className="xc-scan" aria-hidden />
        <span className="xc-bloom" aria-hidden />
      </div>
    </div>
  );
}

const HELP = {
  what:
    "His machine is asleep behind a substitution cipher. The decoder on screen is the key: every letter of the scrambled message stands for a different letter, and the decoder tells you which.",
  controls: [
    "Read the message. Look each of its letters up in the decoder and type what it stands for.",
    "Type your answer and press Enter, or use Transmit.",
    "The decoder is sorted by the CIPHER letter, not the plain one, so you can look up what you are reading rather than what you are writing.",
    "Each stage has a new key. Nothing you learnt on the last one carries over — that is the point of a new key.",
  ],
  win: "Clear all three stages and the machine wakes up. There is a clock, and running it out restarts the stage rather than the game.",
};
