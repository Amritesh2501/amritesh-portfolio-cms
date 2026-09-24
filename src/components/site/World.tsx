"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  ARRIVAL,
  ESTABLISH,
  FILES,
  FILE_COUNT,
  STATIONS,
  WORLD,
  isUnlocked,
  stationById,
  type CaseFile,
} from "@/lib/world";
import type { CaseRoomData } from "@/lib/content";
import * as sound from "@/lib/sound";
import { Board } from "./Board";
import { Room } from "./RoomArt";
import { Desktop } from "./Desktop";
import { CaseFilePages } from "./CaseFilePages";

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

type Phase = "room" | "cover" | "turning" | "open";

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
  /** The blind. Down on arrival: it is the middle of the night out there. */
  const [blindDown, setBlindDown] = useState(true);

  const view = useViewport();
  const timers = useRef<number[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
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
      sound.latch();
      setPicked(file);
      setPhase("cover");
    },
    [read],
  );

  /** Cover → pages → what is inside. */
  const open = useCallback(() => {
    if (!picked) return;
    setPhase("turning");
    sound.page();

    const beat = reduce ? 420 : 1500;
    if (!reduce) {
      after(420, sound.page);
      after(840, sound.page);
    }
    after(beat, () => {
      setPhase("open");
      // Read is read once the pages are actually in front of you, not when the
      // cover was picked up and put back.
      setRead((prev) => {
        if (prev.includes(picked.id)) return prev;
        sound.recovered();
        return [...prev, picked.id];
      });
    });
  }, [picked, reduce, after]);

  const closeFile = useCallback(() => {
    setPicked(null);
    setPhase("room");
  }, []);

  /* The cord ---------------------------------------------------------------- */

  const pullCord = useCallback(() => {
    setBlindDown((down) => !down);
    sound.latch();
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
  }, [at, order, picked, boardOpen, deskOpen, goto, toRoom, closeFile, onExit]);

  useEffect(() => {
    if (phase === "open") panelRef.current?.focus();
  }, [phase]);

  /* The camera, resolved against the actual viewport ------------------------ */

  const shot = useMemo(() => {
    // Zoom is scaled down on a narrow screen, or a shot framed for a desktop
    // shows three hundred pixels of shelf upright, and raised again if that
    // would leave the room short of the top and bottom of the screen.
    const fit = Math.max(Math.min(1, view.w / 1400), 0.45);
    const z = Math.max(cam.z * fit, view.h / WORLD.h);
    const halfW = view.w / (2 * z);
    const halfH = view.h / (2 * z);
    const clamp = (v: number, min: number, max: number) =>
      min > max ? (min + max) / 2 : Math.min(max, Math.max(min, v));
    return {
      z,
      x: clamp(cam.x, halfW, WORLD.w - halfW),
      y: clamp(cam.y, halfH, WORLD.h - halfH),
    };
  }, [cam, view]);

  const here = at ? stationById(at) : null;
  const atShelf = at === "shelf";
  const got = read.filter((id) => id !== "dossier").length;

  return (
    <div className={`xw ${blindDown ? "" : "is-lit"}`}>
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
            onStation={goto}
            onFile={pick}
            onBoard={() => setBoardOpen(true)}
            onDesk={() => setDeskOpen(true)}
            onCord={pullCord}
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
          <button type="button" className="xw-mute" onClick={toggleMute}>
            {muted ? "SOUND OFF" : "SOUND ON"}
          </button>
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
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`xw-file-btn ${done ? "is-done" : ""} ${locked ? "is-locked" : ""}`}
                    onClick={() => pick(f)}
                    disabled={locked}
                    aria-label={`File ${f.index}, ${f.name}. ${
                      locked
                        ? "Sealed until the other five have been read."
                        : done
                          ? "Already read."
                          : f.subject
                    }`}
                  >
                    <span className="xw-file-n">{f.index}</span>
                    <span>{f.name}</span>
                    <span className="xw-file-s">
                      {locked ? "SEALED" : done ? "READ" : "OPEN"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {at === "board" ? (
            <div className="xw-files">
              <button type="button" className="xw-file-btn" onClick={() => setBoardOpen(true)}>
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

      {picked && phase === "cover" ? (
        <Cover
          file={picked}
          done={read.includes(picked.id)}
          onOpen={open}
          onBack={closeFile}
        />
      ) : null}

      {phase === "turning" ? <PageTurn reduce={Boolean(reduce)} /> : null}

      {picked && phase === "open" ? (
        <div className="xw-panel">
          <div className="xw-panel-card" ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={picked.name}>
            <header className="xw-panel-head">
              <p className="xw-panel-n">FILE {picked.index}</p>
              <h2 className="xw-panel-title">{picked.name}</h2>
              <p className="xw-panel-sub">{picked.subject}</p>
            </header>

            <div className="xw-panel-body">
              <CaseFilePages file={picked} data={data} read={read} />
            </div>

            <footer className="xw-panel-foot">
              <button type="button" className="btn btn-sm" onClick={closeFile}>
                Put it back
              </button>
            </footer>
          </div>
        </div>
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
   The cover, and the pages
   ------------------------------------------------------------------------- */

/**
 * The file, out of the shelf and face on.
 *
 * It arrives rotated and small, from roughly where its spine was standing, and
 * settles square to the camera. That is the whole difference between a file
 * being picked up and a dialog being opened.
 */
function Cover({
  file,
  done,
  onOpen,
  onBack,
}: {
  file: CaseFile;
  done: boolean;
  onOpen: () => void;
  onBack: () => void;
}) {
  return (
    <div className="xw-cover">
      <article className="xw-cover-card" role="dialog" aria-modal="true" aria-label={file.name}>
        <div className="xw-cover-rule" aria-hidden />
        <p className="xw-cover-n">FILE {file.index}</p>
        <h2 className="xw-cover-title">{file.name}</h2>
        <p className="xw-cover-sub">{file.subject}</p>

        <p className="xw-cover-brief">{file.brief}</p>

        <dl className="xw-cover-meta">
          <div>
            <dt>STATUS</dt>
            <dd>{done ? "READ" : "UNREAD"}</dd>
          </div>
          <div>
            <dt>SECTION</dt>
            <dd>{file.subject}</dd>
          </div>
        </dl>

        <div className="xw-cover-actions">
          <button type="button" className="btn btn-solid" onClick={onOpen} autoFocus>
            Open the file
          </button>
          <button type="button" className="btn btn-sm" onClick={onBack}>
            Put it back
          </button>
        </div>
      </article>
    </div>
  );
}

/** Sheets going over, one after another, and the camera going with them. */
function PageTurn({ reduce }: { reduce: boolean }) {
  return (
    <div className={`xw-turn ${reduce ? "is-reduced" : ""}`} aria-hidden>
      <div className="xw-turn-stack">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="xw-turn-page" style={{ animationDelay: `${i * 160}ms` }}>
            <span />
            <span />
            <span className="is-short" />
          </div>
        ))}
      </div>
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

