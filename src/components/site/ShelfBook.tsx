"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { CaseFile } from "@/lib/world";

/**
 * A file, taken off the shelf.
 *
 * This is ONE object from start to finish, and that is the whole point of it.
 * What it replaced was two: an SVG spine that animated out of the row and
 * faded, and an unrelated HTML card that flew in from off-screen. However well
 * the two were timed, the file was never the same thing before and after — it
 * vanished and something else arrived.
 *
 * Here the book is built as an actual box in three dimensions:
 *
 *      spine ── the narrow face, on the LEFT edge of the cover
 *      cover ── the wide face, pointing at the camera
 *      edge  ── the paper block, on the right
 *
 * A book on a shelf shows you its spine, which means the box starts turned
 * ninety degrees away from you. Getting to the cover is exactly the move you
 * would make with your hands: pull it out of the row, then turn it a quarter
 * turn about its own vertical axis. That is the animation — `rotateY(90deg)`
 * to `rotateY(0deg)` — and it is the reason the faces are laid out this way
 * rather than as a stack of cards that cross-fade.
 *
 * It begins at the exact place on screen the drawn spine was standing. World
 * projects the spine's world coordinates through the same camera the room is
 * using and hands the result down as `from`, so the book lifts off the shelf
 * instead of appearing near it.
 */

/** The book, in its own pixels. Written onto the element, because the opening
 *  scale is computed against these numbers and the two must agree. */
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
  onOpen,
  onBack,
}: {
  file: CaseFile;
  from: BookFrom;
  view: { w: number; h: number };
  done: boolean;
  onOpen: () => void;
  onBack: () => void;
}) {
  const reduce = useReducedMotion();
  const [settled, setSettled] = useState(Boolean(reduce));
  const coverRef = useRef<HTMLButtonElement>(null);

  const size = sizeFor(view);
  // The spine's thickness, from the proportions it was drawn at. Derived
  // rather than picked, so a book whose spine is wide on the shelf is a fat
  // binder when you are holding it — which these are, clips and all.
  const thickness = Math.max(28, size.h * (file.spine.w / file.spine.h));
  // What the book has to be scaled to for its spine face to be the size the
  // drawn one was. This is what makes the hand-off invisible.
  const start = from.h / size.h;

  useEffect(() => {
    if (reduce) return;
    const t = window.setTimeout(() => setSettled(true), TURN_MS);
    return () => window.clearTimeout(t);
  }, [reduce]);

  // Focus lands on the cover once it is facing, not while it is still edge-on
  // and unreadable.
  useEffect(() => {
    if (settled) coverRef.current?.focus();
  }, [settled]);

  return (
    <div className="xk" role="dialog" aria-modal="true" aria-label={file.name}>
      <div
        className={`xk-book ${settled ? "is-settled" : ""} ${reduce ? "is-still" : ""}`}
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
        {/* The cover. A real button, because it is the thing that opens the
            file and the only face that is ever pointed at anybody. */}
        <button
          type="button"
          ref={coverRef}
          className="xk-face xk-cover"
          onClick={onOpen}
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

      <button type="button" className="xk-back" onClick={onBack}>
        Put it back
      </button>
    </div>
  );
}

/** Out of the row, round to the cover, settled. Matches `xk-take` in CSS. */
export const TURN_MS = 1500;
