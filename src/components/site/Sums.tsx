"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SUMS_SECONDS, SUMS_TO_PASS, asText, makeRun } from "@/lib/sums";
import * as sound from "@/lib/sound";
import { Help } from "./Help";
import type { CaseRoomData } from "@/lib/content";

/**
 * The poster over the bed.
 *
 * Six sums against one clock — addition, multiplication, subtraction,
 * division, alternating — and a photograph behind it. The clock runs on the
 * whole run rather than on each question, so the pressure is on keeping going
 * rather than on any single sum, which is the difference between brisk and
 * unpleasant.
 *
 * Nothing about the questions is decided here. lib/sums builds subtraction and
 * division from their own answers, so neither can go negative or come out
 * fractional by construction rather than by rejection, and check-sums puts
 * forty-four thousand of them through it.
 */
export function Sums({
  data,
  onSolved,
  onClose,
}: {
  data: CaseRoomData;
  onSolved: () => void;
  onClose: () => void;
}) {
  const [seed, setSeed] = useState(0);
  const run = useMemo(() => makeRun(), [seed]);

  const [at, setAt] = useState(0);
  const [typed, setTyped] = useState("");
  const [left, setLeft] = useState(SUMS_SECONDS);
  const [phase, setPhase] = useState<"running" | "won" | "lost">("running");
  const [wrong, setWrong] = useState(0);
  const box = useRef<HTMLInputElement>(null);

  useEffect(() => {
    box.current?.focus();
  }, [at, phase]);

  useEffect(() => {
    if (phase !== "running") return;
    if (left <= 0) {
      setPhase("lost");
      sound.latch();
      return;
    }
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left, phase]);

  const submit = useCallback(() => {
    if (phase !== "running") return;
    const value = Number(typed);
    if (!typed.trim() || Number.isNaN(value)) return;

    if (value === run[at].answer) {
      sound.keypress();
      const next = at + 1;
      setTyped("");
      if (next >= run.length) {
        setPhase("won");
        sound.recovered();
        onSolved();
        return;
      }
      setAt(next);
      return;
    }

    sound.toss();
    setWrong((n) => n + 1);
    setTyped("");
  }, [phase, typed, run, at, onSolved]);

  const again = () => {
    setSeed((n) => n + 1);
    setAt(0);
    setTyped("");
    setWrong(0);
    setLeft(SUMS_SECONDS);
    setPhase("running");
  };

  if (phase === "won") {
    return <Portrait data={data} onClose={onClose} />;
  }

  const sum = run[at];

  return (
    <div className="xs" role="dialog" aria-modal="true" aria-label="The poster">
      <div className="xs-sheet">
        <div className="xs-head">
          <p className="xs-kicker">PINNED OVER THE BED</p>
          <p className="xs-clock" aria-label={`${Math.max(0, left)} seconds left`}>
            {String(Math.max(0, left)).padStart(2, "0")}s
          </p>
        </div>

        <p className="xs-note">
          Six of them, one clock. It is not a test, it is what is holding the
          poster on.
        </p>

        {/* How far through. */}
        <div className="xs-pips" aria-hidden>
          {Array.from({ length: SUMS_TO_PASS }, (_, i) => (
            <span key={i} className={i < at ? "is-done" : i === at ? "is-live" : ""} />
          ))}
        </div>

        {phase === "lost" ? (
          <>
            <p className="xs-sum">TIME</p>
            <p className="xs-note">
              Got {at} of {SUMS_TO_PASS}.
            </p>
            <div className="xs-foot">
              <button type="button" className="btn btn-solid" onClick={again} autoFocus>
                Again
              </button>
              <button type="button" className="btn btn-sm" onClick={onClose}>
                Leave it
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="xs-sum">
              {asText(sum)} <span aria-hidden>=</span>
            </p>

            <form
              className="xs-form"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <input
                ref={box}
                className="xs-box"
                value={typed}
                onChange={(e) => setTyped(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
                inputMode="numeric"
                autoComplete="off"
                aria-label={`${asText(sum)} equals`}
              />
              <button type="submit" className="btn btn-solid">
                Answer
              </button>
            </form>

            <div className="xs-foot">
              <p className="xs-tally">
                {at} / {SUMS_TO_PASS} right{wrong > 0 ? ` · ${wrong} wrong` : ""}
              </p>
              <Help title="The poster" text={HELP} />
              <button type="button" className="btn btn-sm" onClick={onClose}>
                Leave it
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   What is behind it
   ------------------------------------------------------------------------- */

/**
 * The photograph.
 *
 * The profile image the rest of the site uses, which is the point: this is the
 * first time in either room that the person is a face rather than a case
 * number. If there is no image published it says so rather than showing a
 * broken frame — on a fresh install that is the honest state.
 */
function Portrait({ data, onClose }: { data: CaseRoomData; onClose: () => void }) {
  const p = data.profile;

  return (
    <div className="xs" role="dialog" aria-modal="true" aria-label="The photograph">
      <figure className="xs-photo">
        <div className="xs-photo-frame">
          {p?.profileImage ? (
            // Plain img: the profile image is whatever URL the CMS holds, and
            // next/image refuses hosts that are not allow-listed.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.profileImage} alt={p.name} />
          ) : (
            <p className="xs-photo-none">
              No photograph published. Set <strong>Profile → Profile image</strong> in
              the CMS and he will be here.
            </p>
          )}
        </div>

        <figcaption className="xs-photo-cap">
          <p className="xs-photo-name">{p?.name ?? "Unidentified"}</p>
          {p?.headline ? <p className="xs-photo-sub">{p.headline}</p> : null}
          <p className="xs-photo-note">
            Behind the poster the whole time.
          </p>
        </figcaption>

        <button type="button" className="btn btn-sm" onClick={onClose}>
          Step back
        </button>
      </figure>
    </div>
  );
}

const HELP = {
  what:
    "A times-table poster on a bedroom wall, and it wants its own sums back. Addition, subtraction, multiplication and division, one at a time, against a clock.",
  controls: [
    "Type the answer and press Enter, or use the Answer button.",
    "Digits only. Every answer is a whole positive number — no fractions, no negatives, nothing to round.",
    "Getting one wrong costs you nothing but the seconds.",
  ],
  win: `Get ${SUMS_TO_PASS} right before the clock runs out and the poster comes off the wall. Run out of time and you start the run again, not the game.`,
};
