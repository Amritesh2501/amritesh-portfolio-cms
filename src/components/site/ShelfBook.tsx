"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { CaseFile } from "@/lib/world";
import type { CaseRoomData } from "@/lib/content";
import * as sound from "@/lib/sound";
import { CaseFilePages } from "./CaseFilePages";

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
 * and it goes through four stages, each one a thing a hand does:
 *
 *      take    out of the row and a quarter turn, spine to cover
 *      open    the cover swings back on the spine, the way a cover hinges
 *      zoom    the open pages come at the camera until they are all there is
 *      spread  two pages, and what is written on them
 *
 * The first stage begins at the exact place on screen the drawn spine was
 * standing — World projects it through the same camera the room is using — so
 * the book lifts off the shelf rather than appearing near it.
 */

/**
 * take    out of the row and a quarter turn, spine to cover
 * open    the cover swings back on the spine
 * spread  two pages, and what is written on them
 * through the leaves go over one after another and the room changes
 *
 * Only ABOUT reaches "through". The other four hold a section of the portfolio
 * and stop at "spread".
 */
type Stage = "take" | "open" | "spread" | "through";

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
  data,
  done,
  onRead,
  onThrough,
  onBack,
}: {
  file: CaseFile;
  from: BookFrom;
  view: { w: number; h: number };
  data: CaseRoomData;
  done: boolean;
  /** Called once the pages are actually in front of the reader. */
  onRead: () => void;
  /** Only ever called by the index file: the pages carry the reader out of
   *  this room entirely. */
  onThrough: () => void;
  onBack: () => void;
}) {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<Stage>("take");
  const [settled, setSettled] = useState(Boolean(reduce));
  const coverRef = useRef<HTMLButtonElement>(null);
  const spreadRef = useRef<HTMLDivElement>(null);
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

  /** ABOUT does not render pages. Everything a person is outside their CV is
   *  in the room he lives in rather than in a file about the room. */
  // Three of the five are doors rather than files: ABOUT onto the room he lives
  // in, EXPERIENCE onto the office he worked in, PROJECTS onto the lab it was
  // all made in. Which ones is not decided here — `opens` on the file is the one
  // place that knows, because this test used to be a list of topics kept by hand
  // and it drifted out of step with the cover copy the first time it changed.
  const isDoor = Boolean(file.opens);

  const open = useCallback(() => {
    if (stage !== "take") return;
    setStage("open");
    sound.page();

    const arrive = () => {
      if (isDoor) {
        // Not a spread. The leaves go over one after another, the camera goes
        // into them, and the room on the other side is a different room.
        setStage("through");
        onRead();
        timers.current.push(window.setTimeout(onThrough, reduce ? 0 : FLIGHT_MS));
        return;
      }
      setStage("spread");
      onRead();
    };

    if (reduce) {
      arrive();
      return;
    }
    // A second sheet as the cover comes over, so the swing has some paper in
    // it rather than being one board moving.
    timers.current.push(window.setTimeout(sound.page, 340));
    timers.current.push(window.setTimeout(arrive, OPEN_MS));
  }, [stage, reduce, isDoor, onRead, onThrough]);

  /* Focus follows the thing that is actually readable -----------------------*/

  useEffect(() => {
    if (stage === "spread") spreadRef.current?.focus();
    else if (settled) coverRef.current?.focus();
  }, [stage, settled]);

  const spread = stage === "spread";

  return (
    <div className={`xk ${spread ? "is-spread" : ""}`} role="dialog" aria-modal="true" aria-label={file.name}>
      {/* The book. Hidden once the spread has taken over — by then the pages
          have come all the way to the camera and the boards are behind it. */}
      <div
        className={`xk-book ${settled ? "is-settled" : ""} ${reduce ? "is-still" : ""} ${
          stage === "take" ? "" : "is-open"
        }`}
        aria-hidden={spread}
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
          tabIndex={spread ? -1 : 0}
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

      {/* The spread: the pages, arrived. It grows out of roughly where the
          open book was standing, which is the zoom — the reader goes into the
          book rather than the book being swapped for a panel. */}
      {/* What is in the file.

          Paper is gone. It was a case-file docket on manila stock with punch
          holes, a classification, an empty photograph box and a stamp — all
          of it dressing around four sections of a CV, and all of it louder
          than what it was carrying. This is the room's own language: ink on
          black, the heading, and the content. */}
      {spread ? (
        <div className="xk-sheet" ref={spreadRef} tabIndex={-1}>
          <header className="xk-sheet-head">
            <p className="xk-sheet-n">FILE {file.index}</p>
            <h2 className="xk-sheet-title">{file.name}</h2>
            <p className="xk-sheet-sub">{file.subject}</p>
          </header>

          <div className="xk-sheet-body">
            <CaseFilePages file={file} data={data} />
          </div>
        </div>
      ) : null}

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
        {spread ? "Close the file" : "Put it back"}
      </button>
      )}
    </div>
  );
}
