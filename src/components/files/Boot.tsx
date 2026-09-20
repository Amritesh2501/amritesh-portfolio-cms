"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * The way in: a black screen that types itself, then asks for authorization.
 *
 * The accessibility shape is the one the experiments terminal already
 * established on this site, and it is worth restating because it is easy to
 * get backwards: the complete text is in the DOM from the first paint inside a
 * visually hidden block, and what types is an aria-hidden copy. A screen
 * reader gets the warning as a paragraph instead of a stream of half-words,
 * and anyone who does not want to sit through the animation has lost nothing.
 *
 * Under reduced motion nothing types. The text is simply there, which is the
 * same information without the movement.
 */

const BOOT = [
  "INITIALIZING SECURE ENVIRONMENT...",
  "ESTABLISHING CONNECTION...",
  "VERIFYING ACCESS...",
  "ACCESS LEVEL: RESTRICTED",
  "LOADING CONFIDENTIAL ARCHIVE...",
];

const WARNING = [
  "You are about to access confidential information regarding the subject known as:",
  "",
  "AMRITESH TIWARI",
  "",
  "This archive contains personal records, professional history, projects, educational records, skills, certifications and other information belonging to the subject.",
  "",
  "Several records have been fragmented.",
  "Some evidence has been hidden.",
  "Some information can only be recovered through investigation.",
  "",
  "Proceed only if you are prepared to investigate the entire case.",
];

const CHAR_MS = 14;
const LINE_MS = 240;

function useTypewriter(lines: string[], active: boolean, startDelay = 400) {
  const reduce = useReducedMotion();
  const full = lines.join("\n");
  const [typed, setTyped] = useState(reduce ? full : "");
  const [done, setDone] = useState(Boolean(reduce));

  useEffect(() => {
    if (!active || done) return;

    if (reduce) {
      setTyped(full);
      setDone(true);
      return;
    }

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
    timer = window.setTimeout(step, startDelay);
    return () => window.clearTimeout(timer);
    // `full` is derived from a module constant, so it is stable.
  }, [active, done, reduce, full, startDelay]);

  return { typed, done };
}

export function Boot({ onEnter }: { onEnter: () => void }) {
  const [stage, setStage] = useState<"boot" | "warning">("boot");
  const [leaving, setLeaving] = useState(false);

  const boot = useTypewriter(BOOT, true, 500);
  const warning = useTypewriter(WARNING, stage === "warning", 600);

  useEffect(() => {
    if (!boot.done || stage !== "boot") return;
    const t = window.setTimeout(() => setStage("warning"), 700);
    return () => window.clearTimeout(t);
  }, [boot.done, stage]);

  /**
   * Section 4: the click fades everything out, removes the UI and holds on
   * black before the room arrives. The hold is the point — it is the beat
   * where the visitor stops being on a web page.
   */
  const enter = () => {
    setLeaving(true);
    window.setTimeout(onEnter, 1100);
  };

  return (
    <div className={`fg-boot${leaving ? " is-leaving" : ""}`}>
      <div className="fg-boot-inner">
        <p className="sr-only">
          {BOOT.join(" ")} Warning. {WARNING.join(" ")}
        </p>

        <pre className="fg-boot-term" aria-hidden>
          {boot.typed}
          {!boot.done ? <span className="fg-caret" /> : null}
        </pre>

        {stage === "warning" ? (
          <div className="fg-boot-warning" aria-hidden>
            <h1>WARNING</h1>
            <pre>
              {warning.typed}
              {!warning.done ? <span className="fg-caret" /> : null}
            </pre>
          </div>
        ) : null}

        {warning.done ? (
          <div className="fg-boot-actions">
            <button type="button" className="fg-auth" onClick={enter} autoFocus>
              <span className="fg-auth-label">OPEN CONFIDENTIAL</span>
              <span className="fg-auth-sub">ACCESS REQUIRED</span>
            </button>
            <a href="/" className="fg-btn fg-btn-ghost">
              LEAVE THE ARCHIVE
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
