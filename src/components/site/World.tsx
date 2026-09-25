"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  ARRIVAL,
  BULBS,
  DESK_BULB,
  ESTABLISH,
  FILES,
  FILE_COUNT,
  STATIONS,
  WORLD,
  frameFor,
  isUnlocked,
  stationById,
  type CaseFile,
} from "@/lib/world";
import type { CaseRoomData } from "@/lib/content";
import * as sound from "@/lib/sound";
import { Board } from "./Board";
import { Room } from "./RoomArt";
import { Desktop } from "./Desktop";
import { ShelfBook, type BookFrom } from "./ShelfBook";
import { Bedroom } from "./Bedroom";
import { Office } from "./Office";

/**
 * An officer's room, drawn in ink, with four things in it worth walking to.
 *
 * The chain the whole screen exists for is: room → a thing → the thing opening
 * into what it actually is. Every step of it is a physical move rather than a
 * navigation, because the moment it reads as clicking through panels the room
 * stops being a room. Each of the four does that its own way:
 *
 *   the board   pins and thread, full screen, laid out by a force simulation
 *   the window  a cord that raises the blind and lets the night in or shuts it out
 *   the desk    a machine that boots, with files on it
 *   the shelf   six files, which are the sections of this portfolio
 *
 * Two things carry the room itself and are worth knowing before reading on:
 *
 *  - The camera is ONE CSS transform on .xw-stage with a transition on it.
 *    Moving between two places is two numbers and a scale, and the compositor
 *    does the rest. There is no per-frame JavaScript in this whole screen.
 *  - Nothing in the drawing is filled. It is strokes, hatching and open
 *    corners, so the room reads as drawn rather than rendered — which is also
 *    why it costs almost nothing to move a camera over.
 */

/**
 * A file, from the shelf to its contents.
 *
 * There is no separate beat for coming off the shelf any more. ShelfBook is a
 * single object that starts where the drawn spine was standing, pulls out,
 * turns its quarter turn and settles — so "cover" covers the whole of it. The
 * shelf's own spine is hidden for as long as the book is out, because the book
 * IS that spine: two objects handing over to each other is what the old
 * version did, and it never looked like one file.
 */
type Phase = "room" | "cover";

/**
 * Where a file's spine is on screen, so the book can start exactly there.
 *
 * The stage is one transform — `scale(z) translate(-x, -y)` about the middle
 * of the viewport — so projecting a world point through it is the same two
 * lines the camera itself uses. Getting this right is the whole reason the
 * book reads as leaving the shelf rather than as appearing near it: a hand-off
 * that is forty pixels out looks like two different objects.
 */
function bookFrom(
  file: CaseFile,
  shot: { x: number; y: number; z: number },
  view: { w: number; h: number },
): BookFrom {
  const s = file.spine;
  return {
    dx: (s.x + s.w / 2 - shot.x) * shot.z,
    dy: (s.y + s.h / 2 - shot.y) * shot.z,
    h: s.h * shot.z,
    tilt: s.tilt,
  };
}

export function World({ data, onExit }: { data: CaseRoomData; onExit: () => void }) {
  const reduce = useReducedMotion();
  /** Files taken off the shelf and actually opened. Gates the index file. */
  const [read, setRead] = useState<string[]>([]);
  /** null is the arrival shot, before the camera has been given to the player. */
  const [at, setAt] = useState<string | null>(null);
  const [cam, setCam] = useState(ARRIVAL);
  const [camMs, setCamMs] = useState(0);
  const [black, setBlack] = useState(true);
  const [ready, setReady] = useState(false);

  const [picked, setPicked] = useState<CaseFile | null>(null);
  const [phase, setPhase] = useState<Phase>("room");
  const [muted, setMuted] = useState(false);

  /** The three things in the room that open onto something bigger. */
  const [boardOpen, setBoardOpen] = useState(false);
  const [deskOpen, setDeskOpen] = useState(false);
  /**
   * Which room the reader is in.
   *
   * The case room is the whole of this component; the bedroom is its own.
   * Swapping between them here rather than routing keeps the case room mounted
   * underneath, so coming back lands on the same shelf with the same files
   * read rather than on a room that has forgotten the last ten minutes.
   */
  const [place, setPlace] = useState<"case" | "bedroom" | "office">("case");
  /** The blind. Down on arrival: it is the middle of the night out there. */
  const [blindDown, setBlindDown] = useState(true);
  /** The two lights, both off. A room somebody left in a hurry is a dark one. */
  const [ceiling, setCeiling] = useState(false);
  const [lamp, setLamp] = useState(false);
  const [bulb, setBulb] = useState(BULBS[0]);

  const view = useViewport();
  const timers = useRef<number[]>([]);

  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  /**
   * Drop every timer that has not fired.
   *
   * Without this the file sequence can be left permanently jammed. Escape
   * during the pull sets phase back to "room" and clears the file, and then
   * the orphaned timer fires "cover" against a file that is no longer there:
   * nothing renders, and because `pick` now refuses to start unless the phase
   * is "room", no file can ever be opened again. The same happens one beat
   * later with the turn. Any state machine driven by setTimeout has to be able
   * to cancel, and this one could not.
   */
  const clearPending = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    // Emptied in place, never reassigned. The unmount cleanup below captured
    // this array at mount; handing `timers.current` a NEW array leaves that
    // cleanup holding the old one, so every timer started after the first
    // close would outlive the room — firing sounds and setting state on a
    // component that is no longer there.
    timers.current.length = 0;
  }, []);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(window.clearTimeout);
  }, []);

  /* The opening: black, then the camera finds the room. --------------------- */

  useEffect(() => {
    setMuted(sound.loadMuted());
    sound.startDrone();

    if (reduce) {
      // The same shot, arrived at rather than travelled to. A three second
      // pull-back is exactly the kind of movement the setting is asking not
      // to have.
      setCam(ESTABLISH);
      setBlack(false);
      setReady(true);
      return;
    }

    // Held on black first, with the camera already close on the desk
    // underneath, so the fade opens onto a composed frame and then retreats
    // to show what it was standing in.
    const t1 = window.setTimeout(() => {
      setCamMs(3200);
      setCam(ESTABLISH);
      setBlack(false);
    }, 500);
    const t2 = window.setTimeout(() => setReady(true), 3400);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [reduce]);

  useEffect(() => () => sound.stopDrone(), []);

  /* Moving the camera ------------------------------------------------------- */

  const goto = useCallback(
    (id: string) => {
      const station = stationById(id);
      if (!station) return;
      setAt(id);
      setCamMs(reduce ? 0 : 1400);
      setCam(station.cam);
      setReady(true);
      sound.settle();
    },
    [reduce],
  );

  const toRoom = useCallback(() => {
    setAt(null);
    setCamMs(reduce ? 0 : 1400);
    setCam(ESTABLISH);
    sound.settle();
  }, [reduce]);

  /* Files ------------------------------------------------------------------- */

  const pick = useCallback(
    (file: CaseFile) => {
      if (!isUnlocked(file, read)) return;
      // One file off the shelf at a time. Without this, clicking a second
      // spine while the first is still coming out swaps the file underneath a
      // running animation and the pull restarts from halfway.
      if (phase !== "room") return;
      sound.latch();
      setPicked(file);
      // Straight to "cover". The book does its own coming-off-the-shelf, and
      // it does it from the spine's real position on screen.
      setPhase("cover");
    },
    [read, phase],
  );

  /**
   * Read, once the pages are actually in front of somebody.
   *
   * The book decides when that is and calls this — not when the cover was
   * picked up, and not when it was put back unopened. The sequencing that used
   * to live here, three setTimeouts deep, is the book's own business now.
   */
  const markRead = useCallback(() => {
    if (!picked) return;
    setRead((prev) => {
      if (prev.includes(picked.id)) return prev;
      sound.recovered();
      return [...prev, picked.id];
    });
  }, [picked]);

  const closeFile = useCallback(() => {
    clearPending();
    setPicked(null);
    setPhase("room");
  }, [clearPending]);

  /* The cord ---------------------------------------------------------------- */

  const pullCord = useCallback(() => {
    setBlindDown((down) => !down);
    sound.latch();
  }, []);

  /* The board --------------------------------------------------------------- */

  /**
   * Walk over, then take it down — on one click.
   *
   * The camera still travels, because arriving at the wall is what makes the
   * full-screen board feel like the board rather than like a modal. It just
   * does not stop there and wait to be clicked a second time: from across the
   * room the first click was the intent, and the station shot on its own is a
   * board you cannot read.
   */
  const takeBoardDown = useCallback(() => {
    if (at === "board") {
      setBoardOpen(true);
      return;
    }
    goto("board");
    after(reduce ? 0 : 900, () => setBoardOpen(true));
  }, [at, goto, after, reduce]);

  /* The lights ------------------------------------------------------------- */

  const toggleCeiling = useCallback(() => {
    setCeiling((on) => !on);
    sound.latch();
  }, []);

  const toggleLamp = useCallback(() => {
    setLamp((on) => !on);
    sound.latch();
  }, []);

  /** Picking a colour also turns the fitting on: nobody picks a bulb to
   *  leave it off, and a swatch that appears to do nothing reads as broken. */
  const pickBulb = useCallback((next: (typeof BULBS)[number]) => {
    setBulb(next);
    setCeiling(true);
    sound.settle();
  }, []);

  /* Sound ------------------------------------------------------------------- */

  const toggleMute = useCallback(() => {
    const next = !muted;
    sound.setMuted(next);
    setMuted(next);
    if (next) sound.stopDrone();
    else sound.startDrone();
  }, [muted]);

  /* Keyboard: the whole room without a pointer ------------------------------ */

  const order = useMemo(() => STATIONS.map((s) => s.id), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Another room is on screen and this one is not rendered at all — but the
      // component is still mounted, so without this the listener is still live
      // and every key is handled TWICE: once by the bedroom or the office, and
      // once by a case room nobody can see. One Escape in the office ran that
      // room's "step back" and this room's on the same press, which walked the
      // reader out through both and dumped them on the warning page.
      if (place !== "case") return;
      // The board and the machine are full screen and run their own Escape in
      // the capture phase, so this never sees a key while either is up.
      if (e.key === "Escape") {
        if (picked) closeFile();
        else if (at) toRoom();
        else onExit();
        return;
      }
      if (picked || boardOpen || deskOpen) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      e.preventDefault();
      const from = at ? order.indexOf(at) : -1;
      const next = from + (e.key === "ArrowRight" ? 1 : -1);
      if (next < 0) toRoom();
      else if (next < order.length) goto(order[next]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, order, picked, place, boardOpen, deskOpen, goto, toRoom, closeFile, onExit]);

  /* The camera, resolved against the actual viewport ------------------------ */

  const shot = useMemo(() => frameFor(cam, view, WORLD), [cam, view]);

  const here = at ? stationById(at) : null;
  const atShelf = at === "shelf";
  const got = read.length;

  /**
   * The room through the book.
   *
   * Returned instead of the case room rather than layered over it, so nothing
   * of this room is running behind it — but the state above stays mounted, so
   * coming back lands on the same shelf with the same files read rather than
   * on a room that has forgotten the last ten minutes.
   */
  if (place !== "case") {
    const back = () => {
      setPlace("case");
      closeFile();
    };
    return place === "bedroom" ? (
      <Bedroom data={data} onBack={back} />
    ) : (
      <Office data={data} onBack={back} />
    );
  }

  return (
    <div
      // Lit by any of the three, because the room getting brighter is about
      // how much light is in it and not about where the light came from.
      className={`xw ${!blindDown || ceiling || lamp ? "is-lit" : ""}`}
      // Two properties, read by every glow in the drawing. Changing the bulb
      // is this string changing; nothing downstream knows it happened. Both
      // come out of lib/world, so the colours have one home rather than being
      // spelled again in the stylesheet.
      style={{
        ["--xw-bulb" as string]: bulb.value,
        ["--xw-lamp-bulb" as string]: DESK_BULB,
      }}
    >
      <div className="xw-viewport">
        <div
          className="xw-stage"
          style={{
            width: WORLD.w,
            height: WORLD.h,
            transform: `scale(${shot.z}) translate(${-shot.x}px, ${-shot.y}px)`,
            transitionDuration: `${camMs}ms`,
          }}
        >
          <Room
            read={read}
            at={at}
            blindDown={blindDown}
            ceiling={ceiling}
            lamp={lamp}
            taken={picked && phase !== "room" ? picked.id : null}
            onStation={goto}
            onFile={pick}
            onBoard={takeBoardDown}
            onDesk={() => setDeskOpen(true)}
            onCord={pullCord}
            onCeiling={toggleCeiling}
            onLamp={toggleLamp}
          />
        </div>
      </div>

      <div aria-hidden className={`xw-black ${black ? "is-on" : ""}`} />

      {/* HUD ---------------------------------------------------------------- */}

      <div className={`xw-hud ${ready ? "is-in" : ""}`}>
        <div className="xw-hud-top">
          <p className="xw-title">CASE ROOM</p>
          <p className="xw-count">
            {got} / {FILE_COUNT} read
          </p>
          {/* The lights.
              The fittings themselves take the click in the drawing; this is
              the same two switches somewhere a keyboard can reach them, plus
              the only way to change the bulb — a colour is not something a
              shade can be clicked into telling you about. */}
          <div className="xw-lights">
            <button
              type="button"
              className={`xw-mute ${ceiling ? "is-on" : ""}`}
              onClick={toggleCeiling}
              aria-pressed={ceiling}
            >
              CEILING
            </button>
            <div className="xw-bulbs" role="group" aria-label="Bulb colour">
              {BULBS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`xw-bulb-swatch ${bulb.id === b.id ? "is-on" : ""}`}
                  style={{ ["--swatch" as string]: b.value }}
                  onClick={() => pickBulb(b)}
                  aria-label={`${b.name} bulb`}
                  aria-pressed={bulb.id === b.id}
                />
              ))}
            </div>
            <button
              type="button"
              className={`xw-mute ${lamp ? "is-on" : ""}`}
              onClick={toggleLamp}
              aria-pressed={lamp}
            >
              LAMP
            </button>
            <button type="button" className="xw-mute" onClick={toggleMute}>
              {muted ? "SOUND OFF" : "SOUND ON"}
            </button>
          </div>
        </div>

        <div className="xw-hud-bottom">
          <p className="xw-blurb">
            {here ? here.blurb : "A room somebody left in a hurry."}
          </p>

          <div className="xw-stations">
            <button
              type="button"
              className={`xw-station ${at === null ? "is-here" : ""}`}
              onClick={toRoom}
            >
              The room
            </button>
            {STATIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`xw-station ${at === s.id ? "is-here" : ""}`}
                onClick={() => goto(s.id)}
              >
                {s.name}
              </button>
            ))}
            <button type="button" className="xw-station is-exit" onClick={onExit}>
              Leave
            </button>
          </div>

          {/* Whatever is reachable from where the camera is parked. The drawing
              takes the click; these take the keyboard, which the drawing
              cannot. Only ever one station's worth, so the strip stays a strip
              rather than becoming a second navigation. */}
          {atShelf ? (
            <div className="xw-files">
              {FILES.map((f) => {
                const done = read.includes(f.id);
                const locked = !isUnlocked(f, read);
                // A sealed file has to say what unseals it and how far off it
                // is. "SEALED" on its own is a dead end: it tells you the door
                // is shut and nothing about the key, so the room behind this
                // one is unreachable by anybody who does not already know.
                const owing = (f.needs ?? []).filter((id) => !read.includes(id)).length;
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`xw-file-btn ${done ? "is-done" : ""} ${locked ? "is-locked" : ""}`}
                    onClick={() => pick(f)}
                    disabled={locked}
                    aria-label={`File ${f.index}, ${f.name}. ${
                      locked
                        ? `Sealed. Read ${owing} more file${owing === 1 ? "" : "s"} to open it.`
                        : done
                          ? "Already read."
                          : f.subject
                    }`}
                  >
                    <span className="xw-file-n">{f.index}</span>
                    <span>{f.name}</span>
                    <span className="xw-file-s">
                      {locked
                        ? `${owing} MORE TO READ`
                        : done
                          ? "READ"
                          : "OPEN"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {at === "board" ? (
            <div className="xw-files">
              <button type="button" className="xw-file-btn" onClick={takeBoardDown}>
                <span>TAKE THE BOARD DOWN</span>
                <span className="xw-file-s">FULL SCREEN</span>
              </button>
            </div>
          ) : null}

          {at === "window" ? (
            <div className="xw-files">
              <button type="button" className="xw-file-btn" onClick={pullCord}>
                <span>PULL THE CORD</span>
                <span className="xw-file-s">{blindDown ? "BLIND DOWN" : "BLIND UP"}</span>
              </button>
            </div>
          ) : null}

          {at === "desk" ? (
            <div className="xw-files">
              <button type="button" className="xw-file-btn" onClick={() => setDeskOpen(true)}>
                <span>WAKE THE MACHINE</span>
                <span className="xw-file-s">5 FILES</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* The file: cover, pages, contents ------------------------------------ */}

      {/* The file. One component from the shelf to the page: it takes itself
          off the row, turns, opens on its own spine and brings the pages to
          the camera. World only says which file and where its spine was. */}
      {picked && phase === "cover" ? (
        <ShelfBook
          file={picked}
          from={bookFrom(picked, shot, view)}
          view={view}
          data={data}
          done={read.includes(picked.id)}
          onRead={markRead}
          onThrough={() =>
            setPlace(picked.topic === "experience" ? "office" : "bedroom")
          }
          onBack={closeFile}
        />
      ) : null}

      {/* The board and the machine, each full screen ------------------------- */}

      {boardOpen ? (
        <Board evidence={data.evidence} onClose={() => setBoardOpen(false)} />
      ) : null}

      {deskOpen ? <Desktop data={data} onClose={() => setDeskOpen(false)} /> : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Viewport
   ------------------------------------------------------------------------- */

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

