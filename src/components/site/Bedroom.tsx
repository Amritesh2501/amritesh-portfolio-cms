"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  BED_ARRIVAL,
  BED_ESTABLISH,
  BED_PUZZLES,
  BED_STATIONS,
  BEDROOM,
  bedPuzzleById,
  bedStationById,
  type PuzzleId,
} from "@/lib/bedroom";
import { frameFor } from "@/lib/world";
import * as sound from "@/lib/sound";
import { BedroomRoom } from "./BedroomArt";
import { Cipher } from "./Cipher";
import { Lockpick } from "./Lockpick";
import { Sums } from "./Sums";
import { Books } from "./AboutInRoom";
import { HisMachine } from "./HisMachine";
import type { CaseRoomData } from "@/lib/content";

/**
 * The room through the book.
 *
 * Structurally the same screen as World: one CSS transform for the camera,
 * stations rather than a free camera, and the drawing underneath doing nothing
 * per frame. It shares `frameFor`, so a shot behaves identically in both rooms
 * and the checks only have one piece of maths to assert against.
 *
 * The three puzzles are stubs in this pass. Each one is reachable, each one
 * says what it is guarding, and each one hands back its reward on demand — so
 * the room can be walked and judged before any puzzle logic exists. Replacing a
 * stub is replacing one component and nothing else: the station, the target,
 * the camera move and the reward all already work.
 */
export function Bedroom({
  data,
  onBack,
}: {
  data: CaseRoomData;
  onBack: () => void;
}) {
  const reduce = useReducedMotion();
  const view = useViewport();

  const [at, setAt] = useState<string | null>(null);
  const [cam, setCam] = useState(BED_ARRIVAL);
  const [camMs, setCamMs] = useState(0);
  const [black, setBlack] = useState(true);
  const [ready, setReady] = useState(false);

  const [open, setOpen] = useState<PuzzleId | null>(null);
  const [solved, setSolved] = useState<PuzzleId[]>([]);
  const [lamp, setLamp] = useState(false);
  /** The pendant over the floor, and the blind on the window behind the bed. */
  const [ceiling, setCeiling] = useState(false);
  const [blindDown, setBlindDown] = useState(true);

  const toggleCeiling = useCallback(() => {
    setCeiling((on) => !on);
    sound.latch();
  }, []);

  const toggleLamp = useCallback(() => {
    setLamp((on) => !on);
    sound.latch();
  }, []);

  const pullCord = useCallback(() => {
    setBlindDown((down) => !down);
    sound.latch();
  }, []);

  /* Arriving ---------------------------------------------------------------- */

  useEffect(() => {
    if (reduce) {
      setCam(BED_ESTABLISH);
      setBlack(false);
      setReady(true);
      return;
    }
    const t1 = window.setTimeout(() => {
      setCamMs(3000);
      setCam(BED_ESTABLISH);
      setBlack(false);
    }, 420);
    const t2 = window.setTimeout(() => setReady(true), 3200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [reduce]);

  /* The camera -------------------------------------------------------------- */

  const goto = useCallback(
    (id: string) => {
      const station = bedStationById(id);
      if (!station) return;
      setAt(id);
      setCamMs(reduce ? 0 : 1300);
      setCam(station.cam);
      sound.settle();
    },
    [reduce],
  );

  const toRoom = useCallback(() => {
    setAt(null);
    setOpen(null);
    setCamMs(reduce ? 0 : 1300);
    setCam(BED_ESTABLISH);
    sound.settle();
  }, [reduce]);

  /**
   * Opening a thing from wherever you are.
   *
   * If the camera is not at it yet this walks over first and opens when it
   * arrives, which is the rule the case room's board settled on: clicking a
   * thing is using the thing, and stopping in front of it to be clicked again
   * is a step that only exists because the camera got there first.
   */
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(window.clearTimeout);
  }, []);

  const reach = useCallback(
    (id: PuzzleId) => {
      const puzzle = bedPuzzleById(id);
      if (!puzzle) return;
      if (at === puzzle.at) {
        setOpen(id);
        sound.latch();
        return;
      }
      goto(puzzle.at);
      timers.current.push(
        window.setTimeout(() => {
          setOpen(id);
          sound.latch();
        }, reduce ? 0 : 900),
      );
    },
    [at, goto, reduce],
  );

  /**
   * Beaten.
   *
   * The panel is NOT closed here. Every one of these is a lock on something,
   * and closing the moment the lock gives would throw away the thing the
   * player just earned — the terminal shows what it was protecting, the
   * drawer shows the diary, the poster shows the photograph. Each of those
   * components decides when it is done.
   */
  const solve = useCallback((id: PuzzleId) => {
    setSolved((prev) => (prev.includes(id) ? prev : [...prev, id]));
    sound.recovered();
  }, []);

  /* Keyboard ---------------------------------------------------------------- */

  const order = useMemo(() => BED_STATIONS.map((s) => s.id), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (open) setOpen(null);
        else if (at) toRoom();
        else onBack();
        return;
      }
      if (open) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const from = at ? order.indexOf(at) : -1;
      const next = from + (e.key === "ArrowRight" ? 1 : -1);
      if (next < 0) toRoom();
      else if (next < order.length) goto(order[next]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, open, order, goto, toRoom, onBack]);

  const shot = useMemo(() => frameFor(cam, view, BEDROOM), [cam, view]);
  const here = at ? bedStationById(at) : null;

  return (
    <div className={`xw xr ${lamp || ceiling || !blindDown ? "is-lit" : ""}`}>
      <div className="xw-viewport">
        <div
          className="xw-stage"
          style={{
            width: BEDROOM.w,
            height: BEDROOM.h,
            transform: `scale(${shot.z}) translate(${-shot.x}px, ${-shot.y}px)`,
            transitionDuration: `${camMs}ms`,
          }}
        >
          <BedroomRoom
            at={at}
            lamp={lamp}
            ceiling={ceiling}
            blindDown={blindDown}
            drawerOpen={solved.includes("drawer")}
            posterDone={solved.includes("poster")}
            onStation={goto}
            onPuzzle={reach}
            onLamp={toggleLamp}
            onCeiling={toggleCeiling}
            onCord={pullCord}
          />
        </div>
      </div>

      <div aria-hidden className={`xw-black ${black ? "is-on" : ""}`} />

      <div className={`xw-hud ${ready ? "is-in" : ""}`}>
        <div className="xw-hud-top">
          <p className="xw-title">HIS ROOM</p>
          <p className="xw-count">
            {solved.length} / {BED_PUZZLES.length} opened
          </p>
          {/* The fittings take the click in the drawing; these are the same
              three switches somewhere a keyboard can reach them. */}
          <div className="xw-lights">
            <button
              type="button"
              className={`xw-mute ${ceiling ? "is-on" : ""}`}
              onClick={toggleCeiling}
              aria-pressed={ceiling}
            >
              CEILING
            </button>
            <button
              type="button"
              className={`xw-mute ${lamp ? "is-on" : ""}`}
              onClick={toggleLamp}
              aria-pressed={lamp}
            >
              LAMP
            </button>
            <button
              type="button"
              className={`xw-mute ${blindDown ? "" : "is-on"}`}
              onClick={pullCord}
              aria-pressed={!blindDown}
            >
              BLIND
            </button>
          </div>
        </div>

        <div className="xw-hud-bottom">
          <p className="xw-blurb">
            {here ? here.blurb : "Somebody's room. He is not in it."}
          </p>

          <div className="xw-stations">
            <button
              type="button"
              className={`xw-station ${at === null ? "is-here" : ""}`}
              onClick={toRoom}
            >
              The room
            </button>
            {BED_STATIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`xw-station ${at === s.id ? "is-here" : ""}`}
                onClick={() => goto(s.id)}
              >
                {s.name}
              </button>
            ))}
            <button type="button" className="xw-station is-exit" onClick={onBack}>
              Back to the case room
            </button>
          </div>

          {/* Whatever is reachable from where the camera is parked. */}
          {BED_PUZZLES.filter((p) => p.at === at).map((p) => (
            <div className="xw-files" key={p.id}>
              <button
                type="button"
                className={`xw-file-btn ${solved.includes(p.id) ? "is-done" : ""}`}
                onClick={() => reach(p.id)}
              >
                <span>{p.name.toUpperCase()}</span>
                <span className="xw-file-s">
                  {solved.includes(p.id) ? "OPEN" : "LOCKED"}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* All three are built now. */}
      {/* The books open on a click; the other three are earned. */}
      {open === "books" ? (
        <Books data={data} onClose={() => setOpen(null)} />
      ) : open === "terminal" ? (
        solved.includes("terminal") ? (
          <HisMachine data={data} onClose={() => setOpen(null)} />
        ) : (
          <Cipher onSolved={() => solve("terminal")} onClose={() => setOpen(null)} />
        )
      ) : open === "drawer" ? (
        <Lockpick
          data={data}
          onOpened={() => setSolved((prev) => (prev.includes("drawer") ? prev : [...prev, "drawer"]))}
          onClose={() => setOpen(null)}
        />
      ) : open === "poster" ? (
        <Sums
          data={data}
          onSolved={() => setSolved((prev) => (prev.includes("poster") ? prev : [...prev, "poster"]))}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function useViewport() {
  const [size, setSize] = useState({ w: 1280, h: 800 });
  useEffect(() => {
    const read = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return size;
}
