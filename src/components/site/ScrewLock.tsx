"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  NOTCHES,
  TRACK,
  TUMBLERS,
  makeLock,
  seated,
  tensionAt,
  turn,
} from "@/lib/screwlock";
import * as sound from "@/lib/sound";
import { Help } from "./Help";

/**
 * The cabinet, opened with two hands.
 *
 * The pin rides the barrel under the mouse and tells you, by tension alone, how
 * near a tumbler it is. The screwdriver turns the cam with A and D. A tumbler
 * seats the moment both are right — there is no confirm, because the turn IS
 * the action and a third button would be a third hand.
 *
 * Nothing is timed, nothing locks you out, and a wrong notch costs nothing but
 * the turn back. It is a filing cabinet in an empty office, not a safe.
 *
 * The keyboard is not a fallback here, it is half the controls — so the pin has
 * a keyboard path too (the arrow keys), or somebody without a mouse would have
 * one hand and a puzzle that needs two.
 */

const HELP = {
  what:
    "A cam lock with four tumblers. The pin finds where a tumbler sits on the barrel; the screwdriver turns the cam to the notch that tumbler wants. It takes both at once.",
  controls: [
    "Move the mouse across the barrel to slide the pin. Tension rises as you near a tumbler — that is the only thing telling you where it is.",
    "A and D turn the screwdriver one notch. It wraps round.",
    "Without a mouse: left and right arrows move the pin, A and D still turn.",
    "A tumbler seats itself the instant the pin is on it and the cam is at its notch. There is nothing to press.",
  ],
  win: "Seat all four and the drawer opens. Nothing is timed and a wrong notch costs you nothing.",
};

export function ScrewLock({ onOpened, onClose }: { onOpened: () => void; onClose: () => void }) {
  const [lock, setLock] = useState(() => makeLock());
  const [done, setDone] = useState(0);
  const [pin, setPin] = useState(TRACK / 2);
  const [notch, setNotch] = useState(0);
  const [open, setOpen] = useState(false);

  const barrelRef = useRef<HTMLDivElement>(null);

  const spot = lock[done];
  const tension = spot === undefined ? 0 : tensionAt(pin, spot);

  /* The two hands ----------------------------------------------------------- */

  const moveTo = useCallback((clientX: number) => {
    const el = barrelRef.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    if (box.width === 0) return;
    const at = ((clientX - box.left) / box.width) * TRACK;
    setPin(Math.min(TRACK, Math.max(0, at)));
  }, []);

  /**
   * Seating, checked wherever either hand moved.
   *
   * In an effect rather than in the two handlers, because a tumbler seats on
   * the COMBINATION and either input can be the one that completes it. Checking
   * it in each handler is the same condition written twice, and the second copy
   * is the one that rots.
   */
  useEffect(() => {
    if (open || spot === undefined) return;
    if (!seated(pin, notch, spot)) return;

    const next = done + 1;
    setDone(next);
    sound.latch();
    if (next >= lock.length) {
      setOpen(true);
      sound.recovered();
      onOpened();
    }
  }, [pin, notch, spot, done, open, lock.length, onOpened]);

  /* Keyboard: the screwdriver, and the pin for anybody without a mouse ------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open) return;
      const k = e.key.toLowerCase();

      if (k === "a" || k === "d") {
        e.preventDefault();
        setNotch((n) => turn(n, k === "a" ? -1 : 1));
        sound.keypress();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const by = e.key === "ArrowRight" ? 1 : -1;
        setPin((p) => Math.min(TRACK, Math.max(0, p + by * (e.shiftKey ? 0.5 : 2))));
      }
    };
    // Capture, so the room behind this panel never sees an arrow key and walks
    // the camera to another station while somebody is picking a lock.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  /* Drawing ----------------------------------------------------------------- */

  /** The cam, as a wheel with a mark on it. */
  const angle = (notch / NOTCHES) * 360;

  return (
    <div className="xs2" role="dialog" aria-modal="true" aria-label="The cabinet lock">
      <div className="xs2-card">
        <header className="xs2-head">
          <p className="xs2-kicker">CABINET</p>
          <p className="xs2-count">
            {done} / {TUMBLERS} seated
          </p>
        </header>

        {open ? (
          <p className="xs2-state">The drawer is open.</p>
        ) : (
          <>
            {/* The barrel. The pin rides it and the tension bar is the only
                thing that says where a tumbler is. */}
            <div
              className="xs2-barrel"
              ref={barrelRef}
              onPointerMove={(e) => moveTo(e.clientX)}
              role="presentation"
            >
              <div className="xs2-track" />
              {/* Tumblers already seated, marked so the barrel fills up. */}
              {lock.slice(0, done).map((t) => (
                <span
                  key={t.depth}
                  className="xs2-seated"
                  style={{ left: `${(t.depth / TRACK) * 100}%` }}
                />
              ))}
              <span className="xs2-pin" style={{ left: `${(pin / TRACK) * 100}%` }} />
            </div>

            <div className="xs2-tension" aria-hidden>
              <span style={{ transform: `scaleX(${tension.toFixed(3)})` }} />
            </div>
            <p className="xs2-read" aria-live="off">
              tension {Math.round(tension * 100)}
            </p>

            {/* The screwdriver. A and D turn it; the mark says where it points. */}
            <div className="xs2-cam">
              <svg viewBox="0 0 120 120" className="xs2-cam-svg" aria-hidden>
                <circle cx={60} cy={60} r={44} className="xs2-cam-ring" />
                {Array.from({ length: NOTCHES }, (_, i) => {
                  const a = ((i / NOTCHES) * 360 - 90) * (Math.PI / 180);
                  return (
                    <circle
                      key={i}
                      cx={60 + Math.cos(a) * 44}
                      cy={60 + Math.sin(a) * 44}
                      r={3.5}
                      className={`xs2-cam-notch ${i === notch ? "is-at" : ""}`}
                    />
                  );
                })}
                <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "60px 60px" }}>
                  <path d="M60 60 L60 22" className="xs2-cam-blade" />
                  <rect x={53} y={60} width={14} height={34} rx={3} className="xs2-cam-grip" />
                </g>
              </svg>
              <p className="xs2-cam-note">
                <kbd>A</kbd> <kbd>D</kbd> turn · notch {notch + 1} of {NOTCHES}
              </p>
            </div>
          </>
        )}

        <footer className="xs2-foot">
          <Help title="The cabinet lock" text={HELP} />
          <div className="xs2-actions">
            {open ? (
              <button type="button" className="btn btn-solid" onClick={onClose} autoFocus>
                Take the record
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setLock(makeLock());
                  setDone(0);
                  setNotch(0);
                  sound.toss();
                }}
              >
                Start over
              </button>
            )}
            <button type="button" className="btn btn-sm" onClick={onClose}>
              Step back
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
