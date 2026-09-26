"use client";

import { useState } from "react";

/**
 * How to play, on every game in the place.
 *
 * Each of these rooms explains itself in one line of flavour — "pull the boxes
 * apart until no two lines cross" — and one line of flavour is not instructions.
 * It says what the goal is and nothing about the controls, which is fine for
 * the ones you can work out by clicking and useless for the ones you cannot:
 * nothing on the screwdriver told you that A and D turn it, and nothing on the
 * cipher told you the wheel was three separate stages.
 *
 * So every game carries the same button in the same corner, and behind it the
 * same three things: what you are looking at, what the controls are, and how you
 * know when you have won. Shut by default — a player who does not need it
 * should not have to dismiss it — and it never blocks the game, because a help
 * panel you have to close before you can try the thing you just read about is
 * an instruction manual rather than help.
 */

export type HelpText = {
  /** What the thing in front of you is. One or two sentences. */
  what: string;
  /** What to actually do with it. One line each; keyboard gets its own. */
  controls: string[];
  /** How the game ends. */
  win: string;
};

export function Help({ title, text }: { title: string; text: HelpText }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`xh ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="xh-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "Close help" : "How to play"}
      </button>

      {open ? (
        <div className="xh-panel" role="note" aria-label={`How to play: ${title}`}>
          <p className="xh-what">{text.what}</p>
          <ul className="xh-controls">
            {text.controls.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="xh-win">{text.win}</p>
        </div>
      ) : null}
    </div>
  );
}
