"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import * as sound from "@/lib/sound";
import type { CaseRoomData } from "@/lib/content";
import { intakeLines, interrogate } from "@/lib/secrets";
import { World } from "./World";

/** The intake sheet, from the CMS rows the page already read. */
function linesFor(data: CaseRoomData) {
  return intakeLines(data.profile, {
    projects: data.projects.length,
    roles: data.experience.length,
    certifications: data.certifications.length,
    skills: data.skillGroups.reduce((n, g) => n + g.skills.length, 0),
    evidence: data.evidence.length,
  });
}

// Per character. Slow enough to read along with, fast enough that the whole
// block lands in a few seconds.
const CHAR_MS = 18;
// A held beat at the end of a line, so the text breathes instead of pouring.
const LINE_MS = 260;

/**
 * The same thing, hurried, for somebody who has asked for less movement.
 *
 * It used to skip the typing entirely and put the whole block on screen at
 * once — which on a machine with animations turned off meant the warning never
 * typed at all and the button was there before you had read a word. That reads
 * as the effect being broken, and it was reported as exactly that.
 *
 * `prefers-reduced-motion` is a request not to be moved, and text arriving in
 * place is not movement — it is the same argument as a progress bar. So the
 * reveal stays and the waiting goes: the whole block lands in under half a
 * second, with no held beat at the line ends. Anybody who cannot wait even for
 * that has the full text already, in the visually hidden block below.
 */
const CHAR_MS_CALM = 4;

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
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const [entering, setEntering] = useState(false);
  const timer = useRef<number>(0);
  const LINES = useMemo(() => linesFor(data), [data]);
  /** The interrogation: what was typed at the prompt and what came back. */
  const [log, setLog] = useState<{ q: string; a: string }[]>([]);
  const [q, setQ] = useState("");

  const ask = (e: React.FormEvent) => {
    e.preventDefault();
    const a = interrogate(q, data.profile);
    if (a === null) setLog([]);
    else if (q.trim()) setLog((l) => [...l, { q: q.trim(), a }].slice(-6));
    setQ("");
    sound.keypress();
  };

  useEffect(() => {
    // `done` guards the way BACK: leaving the world remounts the terminal, and
    // without it the warning would type itself out a second time underneath
    // buttons that are already on screen.
    if (started || done) return;

    const full = LINES.join("\n");
    const per = reduce ? CHAR_MS_CALM : CHAR_MS;
    // The held beat at a line end is waiting rather than reading, so it is the
    // part that goes when somebody has asked for less.
    const beat = reduce ? CHAR_MS_CALM : LINE_MS;
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
      t = window.setTimeout(step, full[i] === "\n" ? beat : per);
    };

    t = window.setTimeout(step, reduce ? 80 : 600);
    return () => window.clearTimeout(t);
  }, [reduce, started, done, LINES]);

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
    <div className={`xp is-intake ${entering ? "is-entering" : ""}`}>
      <div aria-hidden className="xp-tape xp-tape-a">
        CRIME SCENE · DO NOT CROSS · CRIME SCENE · DO NOT CROSS · CRIME SCENE · DO NOT CROSS ·
      </div>
      <div aria-hidden className="xp-tape xp-tape-b">
        POLICE LINE · DO NOT CROSS · POLICE LINE · DO NOT CROSS · POLICE LINE · DO NOT CROSS ·
      </div>

      <div className="xp-inner">
        <p className="sr-only">{LINES.join(" ")}</p>

        <div className="xp-sheet">
          <span aria-hidden className={`xp-stamp ${done ? "is-in" : ""}`}>
            CONFIDENTIAL
          </span>
          {/* Reserve the whole sheet so the buttons don't walk down as it types. */}
          <pre className="xp-text" aria-hidden style={{ minHeight: `${LINES.length * 1.85}em` }}>
            {typed}
            {!done ? <span className="xp-caret" /> : null}
          </pre>
        </div>

        {done ? (
          <>
            <div className="xp-actions">
              <button
                type="button"
                className="btn btn-solid"
                onClick={enter}
                disabled={entering}
              >
                {entering ? "…" : "Enter the scene"}
              </button>
              <a href="/" className="btn btn-sm">
                Back to the portfolio
              </a>
            </div>

            <form className="xp-ask" onSubmit={ask}>
              <div className="xp-log" aria-live="polite">
                {log.map((l, i) => (
                  <p key={i}>
                    <span className="xp-q">&gt; {l.q}</span>
                    <br />
                    {l.a}
                  </p>
                ))}
              </div>
              <label className="xp-prompt">
                <span aria-hidden>INTERROGATE &gt;</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="type 'help'"
                  aria-label="Question the file. Type help for commands."
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={60}
                />
              </label>
            </form>
          </>
        ) : null}
      </div>

      {/* The cut. Covers the terminal, holds, and the room comes up under it. */}
      <div aria-hidden className={`xp-cut ${entering ? "is-on" : ""}`} />
    </div>
  );
}
