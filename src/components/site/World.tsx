"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  ARRIVAL,
  ESTABLISH,
  FILES,
  STATIONS,
  WORLD,
  PUZZLE_COUNT,
  isUnlocked,
  stationById,
  type CaseFile,
} from "@/lib/world";
import * as sound from "@/lib/sound";
import { Untangle } from "./Untangle";
import { OrderGame, RecallGame } from "./Minigames";

/**
 * An officer's room, drawn in ink, with a shelf in it.
 *
 * The chain the whole screen exists for is: room → shelf → a file off the
 * shelf → its cover → the pages turning → what is inside. Every step of it is
 * a physical move rather than a navigation, because the moment it reads as
 * clicking through panels the room stops being a room.
 *
 * Two things carry that and are worth knowing before reading the rest:
 *
 *  - The camera is ONE CSS transform on .xw-stage with a transition on it.
 *    Moving between two places is two numbers and a scale, and the compositor
 *    does the rest. There is no per-frame JavaScript in this whole screen.
 *  - Nothing in the drawing is filled. It is strokes, hatching and open
 *    corners, so the room reads as drawn rather than rendered — which is also
 *    why it costs almost nothing to move a camera over.
 */

type Phase = "room" | "cover" | "turning" | "open";

export function World({ onExit }: { onExit: () => void }) {
  const reduce = useReducedMotion();
  const [solved, setSolved] = useState<string[]>([]);
  /** null is the arrival shot, before the camera has been given to the player. */
  const [at, setAt] = useState<string | null>(null);
  const [cam, setCam] = useState(ARRIVAL);
  const [camMs, setCamMs] = useState(0);
  const [black, setBlack] = useState(true);
  const [ready, setReady] = useState(false);

  const [picked, setPicked] = useState<CaseFile | null>(null);
  const [phase, setPhase] = useState<Phase>("room");
  const [muted, setMuted] = useState(false);

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
      if (!isUnlocked(file, solved)) return;
      sound.latch();
      setPicked(file);
      setPhase("cover");
    },
    [solved],
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
    after(beat, () => setPhase("open"));
  }, [picked, reduce, after]);

  const closeFile = useCallback(() => {
    setPicked(null);
    setPhase("room");
  }, []);

  const onSolved = useCallback((id: string) => {
    setSolved((prev) => (prev.includes(id) ? prev : [...prev, id]));
    sound.recovered();
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
      if (e.key === "Escape") {
        if (picked) closeFile();
        else if (at) toRoom();
        else onExit();
        return;
      }
      if (picked) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      e.preventDefault();
      const from = at ? order.indexOf(at) : -1;
      const next = from + (e.key === "ArrowRight" ? 1 : -1);
      if (next < 0) toRoom();
      else if (next < order.length) goto(order[next]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, order, picked, goto, toRoom, closeFile, onExit]);

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
  const got = solved.length;

  return (
    <div className="xw">
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
            solved={solved}
            atShelf={atShelf}
            onStation={goto}
            onFile={pick}
          />
        </div>
      </div>

      <div aria-hidden className={`xw-black ${black ? "is-on" : ""}`} />

      {/* HUD ---------------------------------------------------------------- */}

      <div className={`xw-hud ${ready ? "is-in" : ""}`}>
        <div className="xw-hud-top">
          <p className="xw-title">CASE ROOM</p>
          <p className="xw-count">
            {got} / {PUZZLE_COUNT} recovered
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

          {/* At the shelf the files become the controls. Drawn spines take the
              click; these take the keyboard, which the drawing cannot. */}
          {atShelf ? (
            <div className="xw-files">
              {FILES.map((f) => {
                const done = solved.includes(f.id);
                const locked = !isUnlocked(f, solved);
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`xw-file-btn ${done ? "is-done" : ""} ${locked ? "is-locked" : ""}`}
                    onClick={() => pick(f)}
                    disabled={locked}
                    aria-label={`File ${f.index}, ${f.name}. ${
                      locked
                        ? "Sealed until the other files are done."
                        : done
                          ? "Already recovered."
                          : f.subject
                    }`}
                  >
                    <span className="xw-file-n">{f.index}</span>
                    <span>{f.name}</span>
                    <span className="xw-file-s">
                      {locked ? "SEALED" : done ? "RECOVERED" : "OPEN"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* The file: cover, pages, contents ------------------------------------ */}

      {picked && phase === "cover" ? (
        <Cover
          file={picked}
          done={solved.includes(picked.id)}
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
              {picked.game ? (
                solved.includes(picked.id) ? (
                  <Recovered file={picked} />
                ) : (
                  <Game id={picked.game} onSolved={() => onSolved(picked.id)} />
                )
              ) : (
                <Dossier solved={solved} />
              )}
            </div>

            <footer className="xw-panel-foot">
              <button type="button" className="btn btn-sm" onClick={closeFile}>
                Put it back
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   What is inside a file
   ------------------------------------------------------------------------- */

function Game({ id, onSolved }: { id: NonNullable<CaseFile["game"]>; onSolved: () => void }) {
  if (id === "untangle") return <Untangle onSolved={onSolved} />;
  if (id === "order") return <OrderGame onSolved={onSolved} />;
  return <RecallGame onSolved={onSolved} />;
}

function Recovered({ file }: { file: CaseFile }) {
  return (
    <div className="xw-done">
      <p className="xw-done-kicker">RECOVERED</p>
      <p className="xw-done-line">You already got {file.reward} out of this one.</p>
    </div>
  );
}

/** File 04: whatever the other three gave back, in one place. */
function Dossier({ solved }: { solved: string[] }) {
  const got = FILES.filter((f) => f.game && solved.includes(f.id));
  return (
    <div className="xw-dossier">
      {got.length === 0 ? (
        <p className="xw-done-line">Nothing filed yet.</p>
      ) : (
        <ul className="xw-dossier-list">
          {got.map((f) => (
            <li key={f.id}>
              <span className="xw-file-n">{f.index}</span>
              <span>{f.reward}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="xw-done-line">
        That is everything this room had. The rest of it is back on the
        portfolio, where it was the whole time.
      </p>
      <a href="/" className="btn btn-sm">
        Back to the portfolio
      </a>
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
            <dd>{done ? "RECOVERED" : "OPEN"}</dd>
          </div>
          <div>
            <dt>RETURNS</dt>
            <dd>{file.reward}</dd>
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

/* ---------------------------------------------------------------------------
   The drawing
   ------------------------------------------------------------------------- */

/**
 * Parallel strokes: how a pen makes shadow.
 *
 * Clipped to its own box rather than hand-trimmed, so a block of hatching can
 * be dropped anywhere without working out where each stroke should stop. The
 * id is stripped of punctuation because useId returns colons, and a colon in
 * a url() reference is a fight not worth having.
 */
function Hatch({
  x,
  y,
  w,
  h,
  gap = 11,
  className = "xw-hatch",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  gap?: number;
  className?: string;
}) {
  const id = "hatch" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const lines = [];
  for (let i = -h; i < w + h; i += gap) {
    // Ends wander by a pixel or two, so the block does not read as a
    // machine-ruled rectangle of lines.
    const j = (i % 3) - 1;
    lines.push(<line key={i} x1={i + j} y1={h} x2={i + h - j} y2={0} />);
  }
  return (
    <g className={className}>
      {/* The clip is resolved in the same translated space as the strokes it
          trims, so it is anchored at the origin of that space rather than at
          the block's position in the room. Anchoring it at (x, y) puts it at
          double the offset and trims the hatching away to nothing — which
          looks exactly like hatching that was never drawn. */}
      <clipPath id={id}>
        <rect x={0} y={0} width={w} height={h} />
      </clipPath>
      <g clipPath={`url(#${id})`} transform={`translate(${x} ${y})`}>
        {lines}
      </g>
    </g>
  );
}

function Room({
  solved,
  atShelf,
  onStation,
  onFile,
}: {
  solved: string[];
  atShelf: boolean;
  onStation: (id: string) => void;
  onFile: (file: CaseFile) => void;
}) {
  return (
    <svg
      className="xw-svg"
      viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Shell: back wall, floor, side walls, ceiling. One-point perspective
          with the vanishing point behind the shelf. */}
      <g className="xw-line xw-shell">
        <path d="M480 292 L1980 288 L1978 930 L482 932 Z" />
        {/* Floor, splaying to the corners of the frame. */}
        <path d="M482 932 L2 1348" />
        <path d="M1978 930 L2398 1348" />
        {/* Ceiling. */}
        <path d="M480 292 L2 88" />
        <path d="M1980 288 L2398 86" />
        {/* Skirting, doubled the way a pen doubles a line it means. */}
        <path d="M482 932 L1978 930" className="xw-thin" />
        <path d="M486 944 L1974 942" className="xw-thin" />
      </g>

      {/* Floorboards, converging. */}
      <g className="xw-line xw-thin xw-faint">
        {[-380, -180, 60, 300, 540, 780, 1020].map((o, i) => (
          <path key={i} d={`M${1180 + o * 0.16} 934 L${1180 + o} 1350`} />
        ))}
      </g>

      <Ceiling />
      <BoardWall onStation={onStation} />
      <Window onStation={onStation} />
      <Clock />
      <Shelf solved={solved} atShelf={atShelf} onStation={onStation} onFile={onFile} />
      <Chair />
      <Desk onStation={onStation} />
      <Cabinet />
      <CoatStand />
    </svg>
  );
}

function Ceiling() {
  return (
    <g className="xw-line">
      {/* A hanging fitting, drawn as little as possible. */}
      <path d="M1200 88 L1200 196" className="xw-thin" />
      <path d="M1148 200 L1252 200" />
      <path d="M1148 200 L1176 238 L1224 238 L1252 200" />
      <g className="xw-glow">
        <path d="M1176 240 L1112 330" className="xw-thin" />
        <path d="M1224 240 L1288 330" className="xw-thin" />
      </g>
    </g>
  );
}

/** The pinned board, on the left wall, in perspective. */
function BoardWall({ onStation }: { onStation: (id: string) => void }) {
  return (
    <g>
      <g className="xw-line">
        <path d="M96 330 L424 402 L424 726 L96 702 Z" className="xw-solid" />
        <path d="M104 340 L416 410 L416 716 L104 692 Z" className="xw-thin xw-faint" />
        {/* Pinned scraps. Each one is a quad, each one at its own angle. */}
        <path d="M134 386 L206 402 L202 470 L130 456 Z" className="xw-thin" />
        <path d="M232 408 L302 424 L298 490 L228 476 Z" className="xw-thin" />
        <path d="M326 430 L392 444 L388 506 L322 494 Z" className="xw-thin" />
        <path d="M140 510 L214 522 L210 592 L136 582 Z" className="xw-thin" />
        <path d="M244 528 L330 546 L326 612 L240 596 Z" className="xw-thin" />
        {/* String between them. */}
        <g className="xw-hot-line">
          <path d="M168 420 L266 444 L358 464 L286 570 L174 546 Z" />
        </g>
      </g>
      <Hatch x={96} y={640} w={330} h={70} gap={13} className="xw-hatch xw-faint" />
      <rect
        className="xw-hit"
        x={90}
        y={324}
        width={340}
        height={408}
        onClick={() => onStation("board")}
      />
    </g>
  );
}

function Window({ onStation }: { onStation: (id: string) => void }) {
  return (
    <g>
      {/* Night outside: hatching, not black. Drawn first, so the glazing bars
          sit in front of it the way glazing bars do. */}
      <Hatch x={610} y={514} w={280} h={124} gap={9} className="xw-hatch xw-faint" />
      <g className="xw-line">
        <path d="M596 368 L906 366 L906 652 L596 654 Z" className="xw-solid" />
        <path d="M606 378 L896 376 L896 642 L606 644 Z" className="xw-thin" />
        {/* Mullions. */}
        <path d="M751 376 L751 643" />
        <path d="M606 510 L896 509" />
        {/* Blinds, half drawn, with the slats bunched at the top. */}
        <g className="xw-thin">
          {[388, 400, 412, 424, 436, 450, 466, 484].map((y, i) => (
            <path key={y} d={`M${608 + (i % 2)} ${y} L${894 - (i % 2)} ${y}`} />
          ))}
          <path d="M606 496 L896 494" />
          <path d="M748 496 L748 520" />
        </g>
        {/* Sill. */}
        <path d="M584 654 L918 652" />
        <path d="M588 664 L914 662" className="xw-thin" />
      </g>
      <rect
        className="xw-hit"
        x={584}
        y={360}
        width={340}
        height={310}
        onClick={() => onStation("window")}
      />
    </g>
  );
}

function Clock() {
  return (
    <g className="xw-line">
      <circle cx={1548} cy={352} r={54} className="xw-solid" />
      <circle cx={1548} cy={352} r={46} className="xw-thin xw-faint" />
      <path d="M1548 352 L1548 320" />
      <path d="M1548 352 L1572 364" />
      <circle cx={1548} cy={352} r={4} className="xw-fill" />
    </g>
  );
}

/**
 * The shelf. The one thing in this room the visitor is here for.
 *
 * Drawn wide and low so that framing it fills a 16:9 screen with shelf and
 * almost nothing else, which is what the brief asks for when it says the
 * camera should keep only the shelf in frame.
 */
function Shelf({
  solved,
  atShelf,
  onStation,
  onFile,
}: {
  solved: string[];
  atShelf: boolean;
  onStation: (id: string) => void;
  onFile: (file: CaseFile) => void;
}) {
  return (
    <g className={`xw-shelf ${atShelf ? "is-near" : ""}`}>
      <g className="xw-line">
        {/* Carcass. */}
        <path d="M1150 422 L1950 418 L1950 862 L1150 866 Z" className="xw-solid" />
        <path d="M1160 432 L1940 428 L1940 852 L1160 856 Z" className="xw-thin xw-faint" />
        {/* Boards. */}
        <path d="M1152 676 L1948 672" />
        <path d="M1156 686 L1944 682" className="xw-thin" />
        <path d="M1152 862 L1948 858" />
        {/* Uprights, and the little overshoot a pen leaves at a corner. */}
        <path d="M1150 414 L1150 872" className="xw-thin" />
        <path d="M1950 410 L1950 868" className="xw-thin" />
      </g>

      {/* The shadow inside the cavity. Before the contents, or the hatching
          crosses the things standing in it. */}
      <Hatch x={1156} y={690} w={790} h={160} gap={16} className="xw-hatch xw-faint" />

      {/* The files, standing on the upper board. */}
      {FILES.map((f) => {
        const done = solved.includes(f.id);
        const locked = !isUnlocked(f, solved);
        const { x, y, w, h, tilt } = f.spine;
        return (
          <g
            key={f.id}
            className={`xw-file ${done ? "is-done" : ""} ${locked ? "is-locked" : ""}`}
            transform={`rotate(${tilt} ${x + w / 2} ${y + h})`}
          >
            <g className="xw-line">
              <path d={`M${x} ${y} L${x + w} ${y - 2} L${x + w} ${y + h} L${x} ${y + h} Z`} className="xw-solid" />
              {/* The label block down the spine. */}
              <path
                d={`M${x + 7} ${y + 22} L${x + w - 7} ${y + 20} L${x + w - 7} ${y + h - 28} L${x + 7} ${y + h - 26} Z`}
                className="xw-thin"
              />
              {/* Two ring-binder clips, because a file has them. */}
              <path d={`M${x} ${y + h - 64} L${x + 9} ${y + h - 64}`} className="xw-thin" />
              <path d={`M${x} ${y + h - 44} L${x + 9} ${y + h - 44}`} className="xw-thin" />
            </g>
            <text
              className="xw-file-index"
              x={x + w / 2}
              y={y + 38}
              textAnchor="middle"
            >
              {f.index}
            </text>
            <text
              className="xw-file-name"
              transform={`translate(${x + w / 2} ${y + h - 16}) rotate(-90)`}
            >
              {f.name}
            </text>
            {/* Clickable only once the camera is actually at the shelf. A file
                you can open from across the room is not a file on a shelf. */}
            {atShelf ? (
              <rect
                className="xw-hit"
                x={x - 4}
                y={y - 8}
                width={w + 8}
                height={h + 14}
                onClick={() => onFile(f)}
              />
            ) : null}
          </g>
        );
      })}

      {/* Clutter, so the shelf is a shelf and not a rack of four files. */}
      <g className="xw-line">
        <path d="M1612 498 L1700 496 L1700 674 L1612 676 Z" className="xw-solid" />
        <path d="M1622 520 L1690 518" className="xw-thin" />
        <path d="M1622 536 L1690 534" className="xw-thin" />
        <path d="M1716 560 L1762 558 L1774 674 L1716 674 Z" className="xw-thin xw-solid" />
        {/* A leaning ledger. */}
        <path d="M1792 540 L1834 532 L1856 672 L1800 674 Z" className="xw-solid" />
        {/* Stacked paper on the lower board. */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path
            key={i}
            d={`M${1214 + (i % 2) * 3} ${846 - i * 11} L${1420 - (i % 3) * 4} ${844 - i * 11}`}
            className="xw-thin"
          />
        ))}
        <path d="M1520 760 L1690 758 L1690 856 L1520 858 Z" className="xw-thin xw-solid" />
        <path d="M1742 800 L1900 798" className="xw-thin" />
        <path d="M1742 816 L1900 814" className="xw-thin" />
      </g>

      {/* From across the room the whole unit is the target. */}
      {!atShelf ? (
        <rect
          className="xw-hit"
          x={1140}
          y={408}
          width={820}
          height={470}
          onClick={() => onStation("shelf")}
        />
      ) : null}
    </g>
  );
}

function Desk({ onStation }: { onStation: (id: string) => void }) {
  return (
    <g>
      <g className="xw-line">
        {/* Top, in perspective: narrower at the back. */}
        <path d="M812 872 L1468 870 L1596 1004 L690 1008 Z" className="xw-solid" />
        <path d="M690 1008 L1596 1004 L1596 1038 L690 1042 Z" className="xw-solid" />
        {/* Legs. */}
        <path d="M704 1042 L712 1256" />
        <path d="M1582 1038 L1568 1252" />
        <path d="M842 886 L846 1010" className="xw-thin xw-faint" />
        {/* Modesty panel. */}
        <path d="M860 1046 L1430 1042" className="xw-thin xw-faint" />

        {/* Lamp. */}
        <path d="M872 900 L872 812" />
        <path d="M872 812 L930 786" />
        <path d="M906 760 L968 796 L936 818 Z" className="xw-solid" />
        <path d="M846 900 L900 898" />

        {/* Papers, a mug, a phone off its cradle. */}
        <path d="M1008 920 L1180 918 L1192 962 L1018 964 Z" className="xw-thin xw-solid" />
        <path d="M1030 934 L1160 932" className="xw-thin xw-faint" />
        <path d="M1030 946 L1128 944" className="xw-thin xw-faint" />
        <path d="M1258 908 L1310 906 L1314 956 L1262 958 Z" className="xw-solid" />
        <path d="M1314 918 Q1338 930 1314 944" className="xw-thin" />
        <path d="M1372 928 L1468 926 L1470 958 L1374 960 Z" className="xw-solid" />
        <path d="M1396 926 L1400 900 L1446 898 L1450 924" className="xw-thin" />
      </g>

      <Hatch x={700} y={1012} w={890} h={40} gap={12} className="xw-hatch xw-faint" />
      <rect
        className="xw-hit"
        x={686}
        y={710}
        width={920}
        height={350}
        onClick={() => onStation("desk")}
      />
    </g>
  );
}

function Chair() {
  return (
    <g className="xw-line">
      <path d="M1042 716 L1258 714 L1266 872 L1034 874 Z" className="xw-solid" />
      <path d="M1054 730 L1246 728" className="xw-thin" />
      <path d="M1150 874 L1150 940" />
      <path d="M1090 952 L1212 950" />
      <path d="M1098 952 L1076 992" className="xw-thin" />
      <path d="M1204 950 L1226 990" className="xw-thin" />
    </g>
  );
}

function Cabinet() {
  return (
    <g className="xw-line">
      <path d="M150 846 L404 892 L404 1252 L150 1170 Z" className="xw-solid" />
      <path d="M156 962 L400 998" className="xw-thin" />
      <path d="M156 1078 L400 1104" className="xw-thin" />
      <path d="M250 918 L300 926" className="xw-thin" />
      <path d="M250 1032 L300 1038" className="xw-thin" />
      <path d="M250 1144 L300 1148" className="xw-thin" />
      {/* A box left on top. */}
      <path d="M186 800 L360 832 L360 890 L186 850 Z" className="xw-thin xw-solid" />
    </g>
  );
}

function CoatStand() {
  return (
    <g className="xw-line">
      <path d="M2118 620 L2108 1156" />
      <path d="M2118 640 L2064 672" className="xw-thin" />
      <path d="M2118 640 L2176 668" className="xw-thin" />
      <path d="M2052 1176 L2166 1172" />
      <path d="M2108 1156 L2052 1176" className="xw-thin" />
      <path d="M2108 1156 L2166 1172" className="xw-thin" />
      {/* A coat, hung and forgotten. */}
      <path d="M2176 668 Q2214 760 2196 882 L2140 878 Q2134 752 2166 674" className="xw-thin" />
    </g>
  );
}
