"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { CaseFile } from "@/lib/world";
import * as sound from "@/lib/sound";

/**
 * A file, from the shelf to the page.
 *
 * This is ONE object the whole way through, and that is the point of it. What
 * it replaced was three: an SVG spine that animated out of the row and faded,
 * an HTML card that flew in from off-screen, and — when you opened it — a
 * modal panel that had nothing to do with either. However well the three were
 * timed, the file was never the same thing twice.
 *
 * The book is an actual box:
 *
 *      spine ── the narrow face, on the LEFT edge of the cover
 *      cover ── the wide face, pointing at the camera
 *      edge  ── the paper block, on the right
 *
 * and it goes through three stages, each one a thing a hand does:
 *
 *      take     out of the row and a quarter turn, spine to cover
 *      open     the cover swings back on the spine, the way a cover hinges
 *      through  the leaves go over and the room on the other side arrives
 *
 * The first stage begins at the exact place on screen the drawn spine was
 * standing — World projects it through the same camera the room is using — so
 * the book lifts off the shelf rather than appearing near it.
 */

/**
 * take    out of the row and a quarter turn, spine to cover
 * open    the cover swings back on the spine
 * through the leaves go over one after another and the room changes
 *
 * Every file reaches "through": each one is a door onto a room. There used to
 * be a "spread" stage for the files that held pages, and none do any more.
 */
type Stage = "take" | "open" | "through";

/** The leaves going over, and the room on the other side. Matches `xk-flight`
 *  and `xk-fade` in CSS. */
const FLIGHT_MS = 2600;

/** Out of the row and round to the cover. Matches `xk-take` in CSS.
 *  Slow on purpose: the pull and the turn are two separate things a hand
 *  does, and at a second and a half they ran together into one swoop. */
export const TURN_MS = 2300;
/** The cover swinging back on its hinge. Matches the transition on .xk-cover. */
const OPEN_MS = 900;

/** The book, in its own pixels. Written onto the element, because the opening
 *  scale is computed against these numbers and the two have to agree. */
function sizeFor(view: { w: number; h: number }) {
  // Tall enough to read a cover on, short enough to leave the shelf visible
  // behind it on a laptop. The ratio is a case binder's, not a paperback's.
  const h = Math.max(280, Math.min(470, view.h * 0.62, view.w * 0.92));
  return { w: h * 0.72, h };
}

export type BookFrom = {
  /** Where the spine's centre is on screen, in px from the viewport centre. */
  dx: number;
  dy: number;
  /** The spine's height on screen, in px. Sets the opening scale. */
  h: number;
  /** The lean the spine was drawn with, so the book starts at that angle. */
  tilt: number;
};

export function ShelfBook({
  file,
  from,
  view,
  done,
  onRead,
  onThrough,
  onBack,
}: {
  file: CaseFile;
  from: BookFrom;
  view: { w: number; h: number };
  done: boolean;
  /** Called once the book has been opened. */
  onRead: () => void;
  /** The pages carry the reader out of this room entirely. */
  onThrough: () => void;
  onBack: () => void;
}) {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<Stage>("take");
  const [settled, setSettled] = useState(Boolean(reduce));
  const coverRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);

  const size = sizeFor(view);
  // The spine's thickness, from the proportions it was drawn at. Derived
  // rather than picked, so a book whose spine is wide on the shelf is a fat
  // binder when you are holding it — which these are, clips and all.
  const thickness = Math.max(28, size.h * (file.spine.w / file.spine.h));
  // What the book has to be scaled to for its spine face to be the size the
  // drawn one was. This is what makes the hand-off invisible.
  const start = from.h / size.h;

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(window.clearTimeout);
  }, []);

  useEffect(() => {
    if (reduce) return;
    const t = window.setTimeout(() => setSettled(true), TURN_MS);
    return () => window.clearTimeout(t);
  }, [reduce]);

  /* Opening ---------------------------------------------------------------- */

  const open = useCallback(() => {
    if (stage !== "take") return;
    setStage("open");
    sound.page();

    // The leaves go over one after another, the camera goes into them, and
    // the room on the other side is a different room. Which room is `opens` on
    // the file.
    const arrive = () => {
      setStage("through");
      onRead();
      timers.current.push(window.setTimeout(onThrough, reduce ? 0 : FLIGHT_MS));
    };

    if (reduce) {
      arrive();
      return;
    }
    // A second sheet as the cover comes over, so the swing has some paper in
    // it rather than being one board moving.
    timers.current.push(window.setTimeout(sound.page, 340));
    timers.current.push(window.setTimeout(arrive, OPEN_MS));
  }, [stage, reduce, onRead, onThrough]);

  useEffect(() => {
    if (settled) coverRef.current?.focus();
  }, [settled]);

  return (
    <div className="xk" role="dialog" aria-modal="true" aria-label={file.name}>
      <div
        className={`xk-book ${settled ? "is-settled" : ""} ${reduce ? "is-still" : ""} ${
          stage === "take" ? "" : "is-open"
        }`}
        style={{
          width: size.w,
          height: size.h,
          ["--dx" as string]: `${from.dx}px`,
          ["--dy" as string]: `${from.dy}px`,
          ["--s0" as string]: start,
          ["--tilt" as string]: `${from.tilt}deg`,
          ["--t" as string]: `${thickness}px`,
          // The spine and the paper block are placed against this, not against
          // a percentage — a percentage in translateX resolves against the
          // element's own width, which for those two is the thickness.
          ["--w" as string]: `${size.w}px`,
        }}
      >
        {/* The first page, behind the cover. It is what the cover swings back
            to reveal, so it has to exist before the swing rather than after. */}
        <span className="xk-face xk-leaf" aria-hidden>
          <span className="xk-leaf-rule" />
          <span className="xk-leaf-rule" />
          <span className="xk-leaf-rule is-short" />
        </span>

        {/* The cover. A real button, because it is the thing that opens the
            file and the only face that is ever pointed at anybody. */}
        <button
          type="button"
          ref={coverRef}
          className="xk-face xk-cover"
          onClick={open}
          aria-label={`${file.name}. ${file.subject}. Open the file.`}
        >
          <span className="xk-cover-rule" aria-hidden />
          <span className="xk-n">FILE {file.index}</span>
          <span className="xk-name">{file.name}</span>
          <span className="xk-sub">{file.subject}</span>
          <span className="xk-brief">{file.brief}</span>
          <span className="xk-open" aria-hidden>
            Open the file
          </span>
          {done ? (
            <span className="xk-stamp" aria-hidden>
              READ
            </span>
          ) : null}
        </button>

        {/* The spine, on the left edge, carrying what the shelf was showing. */}
        <span className="xk-face xk-spine" aria-hidden>
          <span className="xk-spine-n">{file.index}</span>
          <span className="xk-spine-name">{file.name}</span>
        </span>

        {/* The paper block on the right, so the turn has something to sweep
            past and the book reads as solid rather than as two panels. */}
        <span className="xk-face xk-edge" aria-hidden />
      </div>

      {/* Going through.

          Six leaves over one after another, the whole book coming at the
          camera as they go, and then black. It is the one place in this
          project where a cut is the right answer: you do not see the room
          arrive, you come round in it. */}
      {stage === "through" ? (
        <div className="xk-flight" aria-hidden>
          <div className="xk-flight-stack">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className="xk-leafing"
                style={{ animationDelay: `${i * 180}ms` }}
              />
            ))}
          </div>
          <div className="xk-fade" />
        </div>
      ) : null}

      {stage === "through" ? null : (
      <button type="button" className="xk-back" onClick={onBack}>
        Put it back
      </button>
      )}
    </div>
  );
}
