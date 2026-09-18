"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Untangle } from "./Untangle";

const LINES = [
  "You have left the portfolio.",
  "",
  "What is through here is not finished, and some of it is not serious.",
  "Expect minigames, small puzzles, and pieces of the site scattered",
  "across them. Solve one, get a piece back.",
  "",
  "The whole thing only assembles once you have found them all.",
  "",
  "Nothing you do here can break anything. Nothing is saved.",
];

// Per character. Slow enough to read along with, fast enough that the whole
// block lands in a few seconds.
const CHAR_MS = 18;
// A held beat at the end of a line, so the text breathes instead of pouring.
const LINE_MS = 260;

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
 */
export function ExperimentsIntro() {
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState(reduce ? LINES.join("\n") : "");
  const [done, setDone] = useState(Boolean(reduce));
  const [started, setStarted] = useState(false);
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) {
      setTyped(LINES.join("\n"));
      setDone(true);
      return;
    }

    const full = LINES.join("\n");
    let i = 0;
    let timer: number;

    const step = () => {
      i++;
      setTyped(full.slice(0, i));
      if (i >= full.length) {
        setDone(true);
        return;
      }
      // A newline is a beat, not a character.
      timer = window.setTimeout(step, full[i] === "\n" ? LINE_MS : CHAR_MS);
    };

    timer = window.setTimeout(step, 600);
    return () => window.clearTimeout(timer);
  }, [reduce]);

  useEffect(() => {
    if (!started) return;
    // Focus moves to the board so the keyboard route into the game works and
    // the page announces that something new has arrived.
    gameRef.current?.focus();
  }, [started]);

  return (
    <div className="xp">
      <div className="xp-inner">
        <p className="sr-only">{LINES.join(" ")}</p>

        <pre className="xp-text" aria-hidden>
          {typed}
          {!done ? <span className="xp-caret" /> : null}
        </pre>

        {done && !started ? (
          <div className="xp-actions">
            <button
              type="button"
              className="btn btn-solid"
              onClick={() => setStarted(true)}
            >
              Start exploring
            </button>
            <a href="/" className="btn btn-sm">
              Back to the portfolio
            </a>
          </div>
        ) : null}

        {started ? (
          <div className="xp-game" ref={gameRef} tabIndex={-1}>
            <Untangle />
          </div>
        ) : null}
      </div>
    </div>
  );
}
