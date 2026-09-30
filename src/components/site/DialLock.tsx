"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as sound from "@/lib/sound";
import { DIAL_SIZE, dirFor, isOpen, newDial, press, ticks, turn, type Dir } from "@/lib/dial";

/**
 * A combination dial. A / D (or the arrows, or the wheel, or the buttons) turn
 * it; every number clicks, the right one ticks; Space sets it.
 *
 * The tick is also shown, as a flash on the rim, so the puzzle does not depend
 * on hearing it: sound off, or a player who cannot hear, still has the cue.
 */
export function DialLock({
  name,
  combo,
  seconds,
  onOpened,
  onClose,
}: {
  name: string;
  /** Fixed numbers (the daily ones); random when absent. */
  combo?: number[];
  /** A clock on the attempt: when it runs out, the dial resets. */
  seconds?: number;
  onOpened: () => void;
  onClose: () => void;
}) {
  const [d, setD] = useState(() => newDial(combo));
  const [left, setLeft] = useState(seconds ?? 0);
  const [flash, setFlash] = useState(0);
  /** Every step ever taken, signed. Drives the drawing, so going past 39 to 0
   *  turns one notch rather than spinning back round the whole dial. */
  const [spun, setSpun] = useState(0);
  const [slip, setSlip] = useState(false);
  const open = isOpen(d);

  // Sounds are side effects, so they are decided here and not inside a state
  // updater (which React may run twice).
  const cur = useRef(d);
  cur.current = d;

  const spin = useCallback((dir: Dir) => {
    if (isOpen(cur.current)) return;
    const next = turn(cur.current, dir);
    if (ticks(next)) {
      sound.dialTick();
      setFlash((n) => n + 1);
    } else sound.dialClick();
    cur.current = next;
    setD(next);
    setSpun((n) => n + dir);
    setSlip(false);
  }, []);

  const set = useCallback(() => {
    const prev = cur.current;
    const next = press(prev);
    if (isOpen(next)) sound.clank();
    else if (next.stage > prev.stage) sound.latch();
    else {
      sound.toss();
      setSlip(true);
    }
    cur.current = next;
    setD(next);
  }, []);

  // The clock: one second at a time, and a reset (not a failure screen) at 0.
  useEffect(() => {
    if (!seconds || open) return;
    let n = seconds;
    const t = window.setInterval(() => {
      n -= 1;
      if (n <= 0) {
        n = seconds;
        cur.current = { ...cur.current, stage: 0 };
        setD(cur.current);
        setSlip(true);
        sound.clank();
      }
      setLeft(n);
    }, 1000);
    return () => window.clearInterval(t);
  }, [seconds, open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onOpened, 900);
    return () => window.clearTimeout(t);
  }, [open, onOpened]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "a" || k === "arrowleft") spin(-1);
      else if (k === "d" || k === "arrowright") spin(1);
      else if (k === " " || k === "enter") set();
      else return;
      e.preventDefault();
      // The room's own arrow keys walk the camera; not while the dial has them.
      e.stopImmediatePropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [spin, set]);

  const want = dirFor(d.stage);
  // Buttons never take focus, so Space always means "set", never "press the
  // button you last clicked".
  const noFocus = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="xa xz" role="dialog" aria-modal="true" aria-label={name}>
      <article className="xa-card">
        <header className="xa-head">
          <p className="xa-kicker">{name.toUpperCase()} · COMBINATION LOCK</p>
          <h2 className="xa-title">Listen for the tick</h2>
        </header>
        <div className="xa-body">
          <p className="xz-how">
            Turn with <kbd>A</kbd> and <kbd>D</kbd>. When a number <strong>ticks</strong> instead of clicking
            (the rim flashes too), press <kbd>Space</kbd>. Alternate directions: right, left, right. A wrong
            press slips the dial back to the first number.
          </p>

          <div
            className={`xz-dial ${open ? "is-open" : ""}`}
            onWheel={(e) => spin(e.deltaY > 0 ? 1 : -1)}
            aria-hidden
          >
            <span key={flash} className={`xz-rim ${flash ? "is-tick" : ""}`} />
            <svg viewBox="-110 -110 220 220" style={{ rotate: `${-spun * (360 / DIAL_SIZE)}deg` }}>
              <circle r={100} className="xz-face" />
              {Array.from({ length: DIAL_SIZE }, (_, i) => {
                const a = (i / DIAL_SIZE) * Math.PI * 2 - Math.PI / 2;
                const long = i % 5 === 0;
                return (
                  <g key={i}>
                    <line
                      x1={Math.cos(a) * (long ? 78 : 86)}
                      y1={Math.sin(a) * (long ? 78 : 86)}
                      x2={Math.cos(a) * 94}
                      y2={Math.sin(a) * 94}
                      className="xz-notch"
                    />
                    {long ? (
                      <text
                        x={Math.cos(a) * 64}
                        y={Math.sin(a) * 64}
                        className="xz-num"
                        transform={`rotate(${(i / DIAL_SIZE) * 360} ${Math.cos(a) * 64} ${Math.sin(a) * 64})`}
                      >
                        {i}
                      </text>
                    ) : null}
                  </g>
                );
              })}
              <circle r={26} className="xz-knob" />
            </svg>
            <span className="xz-mark" />
          </div>

          <p className="xz-read" aria-live="polite">
            <span className="xz-pos">{String(d.pos).padStart(2, "0")}</span>
            <span className="xz-slots">
              {d.combo.map((n, i) => (
                <span key={i} className={i < d.stage ? "is-set" : ""}>
                  {i < d.stage ? String(n).padStart(2, "0") : "··"}
                </span>
              ))}
            </span>
          </p>

          <p className={`xz-hint ${slip ? "is-slip" : ""}`} role="status">
            {open
              ? "The shackle drops. The door swings open."
              : slip
                ? "It slipped. Back to the first number."
                : `Number ${d.stage + 1} of ${d.combo.length}: turn ${want === 1 ? "right (D) ▶" : "◀ left (A)"}`}
          </p>

          <div className="xz-controls">
            <button type="button" className="btn btn-sm" onMouseDown={noFocus} onClick={() => spin(-1)} aria-label="Turn left">
              ◀ A
            </button>
            <button type="button" className="btn btn-solid" onMouseDown={noFocus} onClick={set}>
              Set · Space
            </button>
            <button type="button" className="btn btn-sm" onMouseDown={noFocus} onClick={() => spin(1)} aria-label="Turn right">
              D ▶
            </button>
          </div>
          {seconds ? (
            <p className={`xz-slips ${left <= 10 ? "is-late" : ""}`}>Time left on the wheels: {left}s</p>
          ) : null}
          {d.slips ? <p className="xz-slips">Slips: {d.slips}</p> : null}
        </div>
        <button type="button" className="btn btn-sm" onMouseDown={noFocus} onClick={onClose}>
          Step back
        </button>
      </article>
    </div>
  );
}
