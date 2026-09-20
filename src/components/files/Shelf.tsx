"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { CASES, OFFICE_BINDERS, caseTotal, type Case } from "@/lib/files/cases";
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

/**
 * Six targets, laid over the six binders in the photograph.
 *
 * The picker draws no binders of its own. The room already contains six, they
 * are lit correctly and they are numbered and labelled, so drawing a second
 * set on top would only ever be a slightly worse copy sitting a few pixels
 * off the original. What this adds is the part a photograph cannot have:
 * something that lifts when you reach for it, knows whether its case is
 * sealed, and can be reached with a keyboard.
 *
 * Geometry comes from OFFICE_BINDERS, one measured rectangle per spine, so
 * the targets and the binders stay in register even though the shelf recedes.
 */
export function FolderPicker({
  progress,
  onPick,
}: {
  progress: Progress;
  onPick: (file: Case) => void;
}) {
  return (
    <div className="fg-picker">
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
        const pickable = state === "open" || state === "solved";

        return (
          <button
            key={file.id}
            type="button"
            className={`fg-spine is-${state}`}
            style={{
              left: OFFICE_BINDERS[i].x,
              top: OFFICE_BINDERS[i].y,
              width: OFFICE_BINDERS[i].w,
              height: OFFICE_BINDERS[i].h,
            }}
            onClick={() => pickable && onPick(file)}
            disabled={!pickable}
            aria-label={`Binder ${file.index}, ${file.name}. ${
              state === "pending"
                ? "This room has not been built yet."
                : state === "locked"
                  ? "Sealed until an earlier case is solved."
                  : state === "solved"
                    ? "Solved. Open it again."
                    : `${prog.found} of ${prog.total} recovered. Open this case.`
            }`}
          >
            <span className="fg-spine-glow" aria-hidden />
            <span className="fg-spine-tag" aria-hidden>
              <span className="fg-spine-index">{file.index}</span>
              <span className="fg-spine-name">{file.name}</span>
              <span className="fg-spine-state">
                {state === "pending"
                  ? "NOT YET FILED"
                  : state === "locked"
                    ? "SEALED"
                    : state === "solved"
                      ? "SOLVED"
                      : `${prog.found} / ${prog.total}`}
              </span>
            </span>
          </button>
        );
      })}
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
