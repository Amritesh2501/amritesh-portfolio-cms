"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { CASES, caseTotal, type Case } from "@/lib/files/cases";
import { caseProgress, type Progress } from "@/lib/files/progress";

/**
 * The shelf, the folder, and the way out of the office into a case.
 *
 * Section 30 asks every transition to be physical, and this is the one that
 * carries the most weight: it is the move from "a room with binders in it" to
 * "inside a case", and if it reads as a route change the whole conceit drops.
 * So the binder leaves the shelf, turns to face you, opens, and the page it
 * opens on swallows the camera.
 */

/* ---------------------------------------------------------------------------
   Picking a binder
   ------------------------------------------------------------------------- */

export function FolderPicker({
  progress,
  onPick,
}: {
  progress: Progress;
  onPick: (file: Case) => void;
}) {
  return (
    <div className="fg-picker">
      <p className="fg-picker-kicker">FILE SHELF — SIX CASES</p>
      <ul className="fg-folders">
        {CASES.map((file, i) => {
          const prog = caseProgress(progress, file.id);
          const locked =
            Boolean(file.needs) && !caseProgress(progress, file.needs!).solved;
          const state = !file.playable
            ? "pending"
            : locked
              ? "locked"
              : prog.solved
                ? "solved"
                : "open";

          return (
            <li key={file.id}>
              <button
                type="button"
                className={`fg-folder is-${state}`}
                // A hand-picked lean per binder: a shelf of perfectly upright
                // files is the fastest way to make a room look rendered.
                style={{ ["--lean" as string]: `${[0.8, -0.5, 1.1, -0.9, 0.4, -0.7][i]}deg` }}
                onClick={() => (state === "open" || state === "solved") && onPick(file)}
                disabled={state === "locked" || state === "pending"}
                aria-label={`${file.index} ${file.name}. ${
                  state === "pending"
                    ? "Environment not built yet."
                    : state === "locked"
                      ? "Locked."
                      : state === "solved"
                        ? "Solved."
                        : "Open this case."
                }`}
              >
                <span className="fg-folder-spine">
                  <span className="fg-folder-index">{file.index}</span>
                  <span className="fg-folder-name">{file.name}</span>
                  <span className="fg-folder-code">{file.code.replace("CASE ", "")}</span>
                </span>
                <span className="fg-folder-state">
                  {state === "pending"
                    ? "NOT YET FILED"
                    : state === "locked"
                      ? "SEALED"
                      : state === "solved"
                        ? "SOLVED"
                        : `${prog.found} / ${prog.total}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   The chosen binder, face on
   ------------------------------------------------------------------------- */

export function FolderCard({
  file,
  progress,
  onOpen,
  onBack,
}: {
  file: Case;
  progress: Progress;
  onOpen: () => void;
  onBack: () => void;
}) {
  const prog = caseProgress(progress, file.id);

  return (
    <div className="fg-modal is-folder">
      <article className="fg-folder-card" role="dialog" aria-modal="true" aria-label={`${file.code} ${file.name}`}>
        <span className="fg-folder-stamp" aria-hidden>CONFIDENTIAL</span>

        <p className="fg-folder-card-code">{file.code.replace("CASE ", "CASE ")}</p>
        <h2 className="fg-folder-card-title">{file.name}</h2>
        <p className="fg-folder-card-place">{file.place}</p>

        <p className="fg-folder-card-synopsis">{file.synopsis}</p>

        <dl className="fg-folder-meta">
          <div>
            <dt>STATUS</dt>
            <dd>{prog.solved ? "SOLVED" : prog.found > 0 ? "IN PROGRESS" : "ACTIVE"}</dd>
          </div>
          <div>
            <dt>EVIDENCE</dt>
            <dd>
              {prog.found} / {caseTotal(file.id)}
            </dd>
          </div>
        </dl>

        <div className="fg-folder-actions">
          <button type="button" className="fg-btn fg-btn-wide" onClick={onOpen} autoFocus>
            EXPLORE FILE
          </button>
          <button type="button" className="fg-btn fg-btn-ghost" onClick={onBack}>
            PUT IT BACK
          </button>
        </div>
      </article>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Folder → document → page → world
   ------------------------------------------------------------------------- */

const TURN_MS = 2200;

/**
 * The page turn.
 *
 * Four sheets, each rotating off a spine a beat after the one before it, while
 * the whole stack scales up past the lens. The last thing that happens is the
 * screen going black, which is what makes the far side read as a different
 * place rather than a different screen.
 *
 * Under reduced motion it is a plain cross-fade of the same length minus the
 * spin. The beat is kept deliberately: the pause between leaving the office
 * and arriving in the house is doing narrative work, and cutting it to zero
 * would make the arrival feel like a click.
 */
export function PageTurn({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const ms = reduce ? 900 : TURN_MS;
    const t = window.setTimeout(onDone, ms);
    const p = window.setTimeout(() => setPhase(1), ms * 0.55);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(p);
    };
  }, [onDone, reduce]);

  return (
    <div className={`fg-turn${reduce ? " is-reduced" : ""}${phase ? " is-late" : ""}`} aria-hidden>
      <div className="fg-turn-stack">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="fg-turn-page" style={{ animationDelay: `${i * 180}ms` }}>
            <span className="fg-turn-rule" />
            <span className="fg-turn-rule" />
            <span className="fg-turn-rule is-short" />
          </div>
        ))}
      </div>
      <p className="fg-turn-status" role="status">
        Opening case file…
      </p>
    </div>
  );
}
