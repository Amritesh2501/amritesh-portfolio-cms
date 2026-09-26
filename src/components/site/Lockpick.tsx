"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FEEL,
  PINS,
  SLIPS_ALLOWED,
  TOLERANCE,
  TRACK,
  isSet,
  makePins,
  tensionAt,
} from "@/lib/lockpick";
import * as sound from "@/lib/sound";
import { Help } from "./Help";
import { monthYear } from "@/lib/utils";
import { Markdown } from "./Markdown";
import type { CaseRoomData } from "@/lib/content";

/**
 * The drawer in the side table.
 *
 * Five pins, one at a time. You cannot see where a pin gives; the only thing
 * you get back is tension, which rises as the pick nears the point. Follow it
 * up, press at the top.
 *
 * The honesty of that number is the whole puzzle, and it is guaranteed in
 * lib/lockpick rather than here — strictly increasing toward the point, no
 * pin set by driving the pick to the stop, no two pins close enough for one
 * press to set either. All of it checked against seven thousand locks, because
 * a lock that lies is never reported as a bug, only as "this one is
 * impossible".
 *
 * Slipping three times rebinds the lock and drops every pin. It does not lock
 * permanently: it is a drawer in somebody's bedroom, not a safe.
 */
export function Lockpick({
  data,
  onOpened,
  onClose,
}: {
  data: CaseRoomData;
  onOpened: () => void;
  onClose: () => void;
}) {
  const [pins, setPins] = useState(() => makePins());
  const [done, setDone] = useState(0);
  const [pick, setPick] = useState(TRACK / 2);
  const [slips, setSlips] = useState(0);
  const [bind, setBind] = useState(0);
  const [open, setOpen] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);

  const spot = pins[done];
  const tension = spot === undefined ? 0 : tensionAt(pick, spot);

  /* Moving the pick -------------------------------------------------------- */

  const moveTo = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const at = ((clientX - box.left) / box.width) * TRACK;
    setPick(Math.min(TRACK, Math.max(0, at)));
  }, []);

  /* Setting a pin ---------------------------------------------------------- */

  const press = useCallback(() => {
    if (open || spot === undefined) return;

    if (isSet(pick, spot)) {
      sound.latch();
      const next = done + 1;
      setDone(next);
      if (next >= pins.length) {
        setOpen(true);
        sound.recovered();
        onOpened();
      }
      return;
    }

    // A slip. The pick jumps, and three of them rebind the lock.
    sound.toss();
    setBind((n) => n + 1);
    setSlips((s) => {
      const next = s + 1;
      if (next >= SLIPS_ALLOWED) {
        setPins(makePins());
        setDone(0);
        return 0;
      }
      return next;
    });
  }, [open, spot, pick, done, pins.length, onOpened]);

  /* Keyboard: the whole lock without a pointer ----------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPick((p) => Math.max(0, p - (e.shiftKey ? 1 : 3)));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPick((p) => Math.min(TRACK, p + (e.shiftKey ? 1 : 3)));
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        press();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, open]);

  if (open) {
    return <Diary data={data} onClose={onClose} />;
  }

  return (
    <div className="xl" role="dialog" aria-modal="true" aria-label="The drawer">
      <div className="xl-card" key={bind}>
        <p className="xl-kicker">THE DRAWER</p>
        <h2 className="xl-title">Locked</h2>
        <p className="xl-note">
          Five pins. Move the pick and feel for where each one gives — the
          tension rises as you get close. Press to set it.
        </p>

        {/* The pins, as a row of states. */}
        <div className="xl-pins" aria-hidden>
          {pins.map((_, i) => (
            <span key={i} className={`xl-pin ${i < done ? "is-set" : ""} ${i === done ? "is-live" : ""}`} />
          ))}
        </div>

        {/* Tension. The only feedback there is, so it is the biggest thing on
            the card. */}
        <div className="xl-tension" aria-hidden>
          <span className="xl-tension-fill" style={{ transform: `scaleX(${tension})` }} />
        </div>
        <p className="xl-read" role="status">
          {tension === 0
            ? "NOTHING"
            : tension > 0.86
              ? "IT IS ABOUT TO GIVE"
              : tension > 0.55
                ? "CLOSE"
                : "SOMETHING"}
        </p>

        {/* The track. */}
        <div
          className="xl-track"
          ref={trackRef}
          onPointerMove={(e) => moveTo(e.clientX)}
          onPointerDown={(e) => {
            moveTo(e.clientX);
            press();
          }}
        >
          <span className="xl-pick" style={{ left: `${pick}%` }} />
        </div>

        <div className="xl-foot">
          <button type="button" className="btn btn-solid" onClick={press}>
            Set the pin
          </button>
          <p className="xl-slips">
            {done} / {pins.length} set · {SLIPS_ALLOWED - slips} before it binds
          </p>
          <Help title="The drawer" text={HELP} />
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Leave it
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   What is in the drawer
   ------------------------------------------------------------------------- */

/**
 * The diary.
 *
 * Every word of it comes out of the profile the rest of the site is built
 * from. A diary hardcoded in a component would be the one thing on this site
 * nobody could edit, which for a page about a person is the wrong thing to
 * make permanent.
 */
function Diary({ data, onClose }: { data: CaseRoomData; onClose: () => void }) {
  const p = data.profile;

  return (
    <div className="xl" role="dialog" aria-modal="true" aria-label="The diary">
      <article className="xl-diary">
        <header className="xl-diary-head">
          <p className="xl-diary-kicker">FOUND IN THE DRAWER</p>
          <h2 className="xl-diary-title">The diary</h2>
        </header>

        {p ? (
          <div className="xl-diary-body">
            <dl className="xl-diary-facts">
              <div>
                <dt>Name</dt>
                <dd>{p.name}</dd>
              </div>
              {p.dateOfBirth ? (
                <div>
                  <dt>Born</dt>
                  <dd>{monthYear(p.dateOfBirth)}</dd>
                </div>
              ) : null}
              {p.location ? (
                <div>
                  <dt>Based</dt>
                  <dd>{p.location}</dd>
                </div>
              ) : null}
            </dl>

            {p.hobbies.length > 0 ? (
              <section>
                <h3>When nobody is paying him</h3>
                <ul className="xl-diary-list">
                  {p.hobbies.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {p.technicalInterests ? (
              <section>
                <h3>What he keeps reading about</h3>
                <Markdown content={p.technicalInterests} />
              </section>
            ) : null}

            {p.currentFocus ? (
              <section>
                <h3>What he is into right now</h3>
                <Markdown content={p.currentFocus} />
              </section>
            ) : null}

            {p.diaryNote ? (
              <section className="xl-diary-hand">
                <Markdown content={p.diaryNote} />
              </section>
            ) : null}

            {/* On a fresh install most of this is empty, and saying so beats
                showing a diary with nothing in it. */}
            {!p.dateOfBirth && p.hobbies.length === 0 && !p.diaryNote ? (
              <p className="xl-diary-empty">
                The pages are blank. Fill in <strong>Profile → The diary</strong> in
                the CMS and he will have written something.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="xl-diary-empty">No profile is published, so there is nothing in here.</p>
        )}

        <button type="button" className="btn btn-sm" onClick={onClose}>
          Put it back
        </button>
      </article>
    </div>
  );
}

const HELP = {
  what:
    "The drawer in his side table, five pins deep. You cannot see where a pin gives — the only thing the lock tells you is tension, and tension rises the nearer the pick is to the point.",
  controls: [
    "Move the mouse along the track to slide the pick. Watch the tension bar.",
    "Set the pin when the tension is at its highest. Follow it up; when it stops rising, you have gone past.",
    "Pins are set in order, one at a time.",
  ],
  win: `All ${PINS} pins set. Slip ${SLIPS_ALLOWED} times and the lock rebinds and drops every pin — it never locks you out permanently. It is a drawer in somebody's bedroom, not a safe.`,
};
