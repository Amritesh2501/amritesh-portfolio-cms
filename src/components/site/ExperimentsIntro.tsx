"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import * as sound from "@/lib/sound";
import type { CaseRoomData } from "@/lib/content";
import { World } from "./World";

const LINES = [
  "You have left the portfolio.",
  "",
  "What is through here is not finished, and some of it is not serious.",
  "There is a room. A board with string on it, a window with a cord, a",
  "machine somebody left running, and a shelf with six files. The files",
  "are this portfolio, taken apart.",
  "",
  "It has sound. There is a switch for that in the corner.",
  "",
  "Nothing you do here can break anything. Nothing is saved.",
];

// Per character. Slow enough to read along with, fast enough that the whole
// block lands in a few seconds.
const CHAR_MS = 18;
// A held beat at the end of a line, so the text breathes instead of pouring.
const LINE_MS = 260;

/** How long the screen stays black before the room arrives. */
const BLACK_MS = 1900;

/**
 * The gate: a black screen that types its warning, then offers a way in.
 *
 * The full text is in the DOM from the first render, inside a visually hidden
 * block. A screen reader gets the whole message at once rather than a stream
 * of half-words, and someone who cannot wait for the animation has not lost
 * the content. What types is a copy, marked aria-hidden.
 *
 * Under prefers-reduced-motion nothing types at all: the text is simply there,
 * which is the same information without the two seconds of movement.
 *
 * "Start exploring" is also where the audio is allowed to exist. A browser
 * will not let a page make a sound until somebody has clicked something, and
 * this is the click — which is convenient, because it is also the moment the
 * sound is supposed to arrive. The screen goes black, the hit lands, and the
 * room is built underneath while nobody can see it.
 */
export function ExperimentsIntro({ data }: { data: CaseRoomData }) {
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState(reduce ? LINES.join("\n") : "");
  const [done, setDone] = useState(Boolean(reduce));
  const [started, setStarted] = useState(false);
  const [entering, setEntering] = useState(false);
  const timer = useRef<number>(0);

  useEffect(() => {
    // `done` guards the way BACK: leaving the world remounts the terminal, and
    // without it the warning would type itself out a second time underneath
    // buttons that are already on screen.
    if (started || done) return;

    if (reduce) {
      setTyped(LINES.join("\n"));
      setDone(true);
      return;
    }

    const full = LINES.join("\n");
    let i = 0;
    let t: number;

    const step = () => {
      i++;
      setTyped(full.slice(0, i));
      if (i >= full.length) {
        setDone(true);
        return;
      }
      // A newline is a beat, not a character.
      t = window.setTimeout(step, full[i] === "\n" ? LINE_MS : CHAR_MS);
    };

    t = window.setTimeout(step, 600);
    return () => window.clearTimeout(t);
  }, [reduce, started, done]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const enter = () => {
    if (entering) return;
    setEntering(true);
    // Must happen inside the click, or the browser refuses the context.
    if (sound.unlock()) sound.sting();
    timer.current = window.setTimeout(
      () => setStarted(true),
      reduce ? 700 : BLACK_MS,
    );
  };

  const leave = () => {
    sound.stopDrone();
    setStarted(false);
    setEntering(false);
  };

  if (started) {
    return (
      <div className="xp is-world">
        <World data={data} onExit={leave} />
      </div>
    );
  }

  return (
    <div className={`xp ${entering ? "is-entering" : ""}`}>
      <div className="xp-inner">
        <p className="sr-only">{LINES.join(" ")}</p>

        <pre className="xp-text" aria-hidden>
          {typed}
          {!done ? <span className="xp-caret" /> : null}
        </pre>

        {done ? (
          <div className="xp-actions">
            <button
              type="button"
              className="btn btn-solid"
              onClick={enter}
              disabled={entering}
            >
              {entering ? "…" : "Start exploring"}
            </button>
            <a href="/" className="btn btn-sm">
              Back to the portfolio
            </a>
          </div>
        ) : null}
      </div>

      {/* The cut. Covers the terminal, holds, and the room comes up under it. */}
      <div aria-hidden className={`xp-cut ${entering ? "is-on" : ""}`} />
    </div>
  );
}
