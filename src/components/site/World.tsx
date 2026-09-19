"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  ARRIVAL,
  ESTABLISH,
  PUZZLE_COUNT,
  STATIONS,
  WORLD,
  isReachable,
  stationById,
  type Station,
} from "@/lib/world";
import { Untangle } from "./Untangle";
import { OrderGame, RecallGame } from "./Minigames";

/**
 * The experiments world.
 *
 * A single drawn scene, wider than any screen, with a camera over it. You come
 * out of black looking at the house across a shut gate; the gate is the only
 * real lock in the world, and what opens it is a puzzle. Everything past it is
 * a station with a different kind of puzzle on it, each one handing back a
 * piece of the portfolio, which is the promise the terminal makes on the way
 * in.
 *
 * Three decisions worth writing down, because each one is a thing this is
 * deliberately NOT doing:
 *
 *  - The scene is drawn SVG, not an image. A painted gate would be a binary
 *    the size of the rest of the page put together, it would be fixed at one
 *    resolution while the camera zooms to 2x, and the gate has to SWING, which
 *    means the leaves have to be separate objects with hinges. Vector geometry
 *    is the thing that is actually being asked for here; a picture of a gate
 *    would only have to be cut back into one.
 *
 *  - The camera is one CSS transform on one element, with a transition on it.
 *    No physics loop, no animation library, no per-frame JavaScript at all:
 *    moving between two stations is two numbers and a scale, and the
 *    compositor interpolates them. A rAF camera here would run a loop for the
 *    whole visit to do what a transition does while it is moving and nothing
 *    when it is not.
 *
 *  - Nothing is saved. The intro promises that, so progress is component
 *    state and a reload puts you back on the road. It also means there is no
 *    storage to migrate the first time the puzzle list changes.
 */
export function World({ onExit }: { onExit: () => void }) {
  const reduce = useReducedMotion();
  const [solved, setSolved] = useState<string[]>([]);
  /** null is the arrival shot, before the camera has been given to the player. */
  const [at, setAt] = useState<string | null>(null);
  const [cam, setCam] = useState(ESTABLISH);
  const [camMs, setCamMs] = useState(0);
  const [black, setBlack] = useState(true);
  const [panel, setPanel] = useState<Station | null>(null);
  const [ready, setReady] = useState(false);
  const view = useViewport();
  const openTimer = useRef<number>(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const gateOpen = solved.includes("gate");

  /* The opening: black, then the camera finds the house. -------------------- */
  useEffect(() => {
    if (reduce) {
      // The same shot, arrived at rather than travelled to. A 2.6s push is
      // exactly the kind of movement the setting is asking not to have.
      setCam(ARRIVAL);
      setBlack(false);
      setReady(true);
      return;
    }

    // Held on black first. The camera is already at the wide shot underneath,
    // so the fade opens onto a composed frame instead of onto whatever the
    // browser happened to lay out first.
    const t1 = window.setTimeout(() => {
      setCamMs(2800);
      setCam(ARRIVAL);
      setBlack(false);
    }, 620);
    const t2 = window.setTimeout(() => setReady(true), 3200);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [reduce]);

  /* Moving the camera ------------------------------------------------------- */
  const goto = useCallback(
    (id: string) => {
      const station = stationById(id);
      if (!station || !isReachable(station, solved)) return;

      window.clearTimeout(openTimer.current);
      setPanel(null);
      setAt(id);
      setCamMs(reduce ? 0 : 1500);
      setCam(station.cam);
      setReady(true);

      // The puzzle arrives when the camera does, not when the button is
      // pressed. Opening it immediately would put a panel over a scene that is
      // still flying, which is the one moment the scene is worth looking at.
      if (station.game && !solved.includes(id)) {
        openTimer.current = window.setTimeout(
          () => setPanel(station),
          reduce ? 0 : 1500,
        );
      }
    },
    [solved, reduce],
  );

  useEffect(() => () => window.clearTimeout(openTimer.current), []);

  /** Solving a station: bank the piece, and let the gate be seen opening. */
  const onSolved = useCallback(
    (id: string) => {
      setSolved((prev) => (prev.includes(id) ? prev : [...prev, id]));
      if (id !== "gate") return;

      // The gate is the one puzzle whose reward is a thing to watch, so the
      // panel gets out of the way and the camera pulls back onto it.
      window.setTimeout(
        () => {
          setPanel(null);
          setCamMs(reduce ? 0 : 1600);
          setCam({ x: 900, y: 600, z: 1.35 });
        },
        reduce ? 0 : 900,
      );
    },
    [reduce],
  );

  /* Keyboard: the whole world without a pointer ----------------------------- */
  const order = useMemo(() => STATIONS.map((s) => s.id), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (panel) setPanel(null);
        else onExit();
        return;
      }
      if (panel) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      const from = at ? order.indexOf(at) : -1;
      const step = e.key === "ArrowRight" ? 1 : -1;
      // Walks past anything still locked rather than stopping dead on it, so
      // the arrow keys reach the same places the buttons do.
      for (let i = from + step; i >= 0 && i < order.length; i += step) {
        const next = stationById(order[i]);
        if (next && isReachable(next, solved)) {
          e.preventDefault();
          goto(next.id);
          return;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, order, panel, solved, goto, onExit]);

  useEffect(() => {
    if (panel) panelRef.current?.focus();
  }, [panel]);

  /* The camera, resolved against the actual viewport ------------------------ */
  const shot = useMemo(() => {
    // Zoom is scaled down on a narrow screen, or a station framed for a
    // desktop shows three hundred pixels of gate post, and raised again if
    // that would leave the world short of the top and bottom of the screen.
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
          <Scene gateOpen={gateOpen} solved={solved} />
        </div>
      </div>

      <div aria-hidden className={`xw-black ${black ? "is-on" : ""}`} />

      {/* The whole world in words, for anyone who is not going to see it. */}
      <p className="sr-only">
        A drawn scene: a road, a shut iron gate, and beyond it a house and a
        signal mast. Solving the puzzle at a place hands back a piece of the
        portfolio. Use the buttons below, or the left and right arrow keys, to
        move between places. Escape leaves.
      </p>

      <div className={`xw-hud ${ready ? "is-in" : ""}`}>
        <div className="xw-hud-top">
          <span className="xw-title">EXPERIMENTS</span>
          <span className="xw-count tabular-nums" role="status" aria-live="polite">
            {solved.length} / {PUZZLE_COUNT} recovered
          </span>
          <button type="button" className="btn btn-sm" onClick={onExit}>
            Leave
          </button>
        </div>

        <div className="xw-hud-bottom">
          <p className="xw-blurb">
            {here
              ? solved.includes(here.id)
                ? `Cleared. You have ${here.reward} back.`
                : here.blurb
              : "The portfolio, across the gate. Nothing through here is finished, and nothing is saved."}
          </p>

          <div className="xw-stations">
            {STATIONS.map((station) => {
              const open = isReachable(station, solved);
              return (
                <button
                  key={station.id}
                  type="button"
                  className={`xw-station ${at === station.id ? "is-here" : ""} ${
                    solved.includes(station.id) ? "is-done" : ""
                  }`}
                  disabled={!open}
                  onClick={() => goto(station.id)}
                  title={open ? station.name : "Behind the gate"}
                >
                  <span aria-hidden>
                    {solved.includes(station.id) ? "◆" : open ? "◇" : "▮"}
                  </span>
                  {station.name}
                  {!open ? <span className="sr-only"> (locked)</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {panel ? (
        <div
          className="xw-panel"
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={panel.name}
        >
          <div className="xw-panel-head">
            <div>
              <h2 className="xw-panel-title">{panel.name}</h2>
              <p className="xw-panel-blurb">{panel.blurb}</p>
            </div>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setPanel(null)}
            >
              Back off
            </button>
          </div>

          <Game id={panel.game} onSolved={() => onSolved(panel.id)} />

          {solved.includes(panel.id) ? (
            <div className="xw-panel-won">
              <p>
                Solved. <strong>{panel.reward}</strong> is back.
              </p>
              <button
                type="button"
                className="btn btn-solid"
                onClick={() => setPanel(null)}
              >
                Step out
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Which puzzle is on this station. New games are one case each. */
function Game({ id, onSolved }: { id: Station["game"]; onSolved: () => void }) {
  if (id === "untangle") return <Untangle onSolved={onSolved} />;
  if (id === "order") return <OrderGame onSolved={onSolved} />;
  if (id === "recall") return <RecallGame onSolved={onSolved} />;
  return null;
}

/** The viewport in CSS pixels, which is what the camera has to frame against. */
function useViewport() {
  const [view, setView] = useState({ w: 1440, h: 820 });
  useEffect(() => {
    const read = () => setView({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return view;
}

/* ---------------------------------------------------------------------------
   The scene
   ------------------------------------------------------------------------- */

const GROUND = 760;

/** Stars, laid out by a fixed sequence rather than Math.random, so the sky is
 *  the same sky on every visit and does not re-roll on a re-render. */
const STARS = Array.from({ length: 46 }, (_, i) => ({
  x: ((i * 617) % 2371) + 14,
  y: ((i * 271) % 470) + 30,
  r: 1 + ((i * 7) % 3) * 0.6,
  o: 0.2 + ((i * 13) % 5) * 0.12,
}));

function Scene({ gateOpen, solved }: { gateOpen: boolean; solved: string[] }) {
  return (
    <svg
      className="xw-svg"
      viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="xw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#04060b" />
          <stop offset="70%" stopColor="#081410" />
          <stop offset="100%" stopColor="#0b1a14" />
        </linearGradient>
        <radialGradient id="xw-lamp">
          <stop offset="0%" stopColor="var(--xp-fg)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--xp-fg)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={WORLD.w} height={WORLD.h} fill="url(#xw-sky)" />

      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="var(--xp-fg)" opacity={s.o} />
      ))}

      {/* Two ridges, the far one fainter: the only depth cue in a side-on
          scene is how washed out a thing is. */}
      <path
        d="M0 690 L280 620 L520 672 L820 596 L1180 668 L1520 604 L1880 670 L2180 622 L2400 678 L2400 780 L0 780 Z"
        fill="#0a1512"
        opacity="0.75"
      />
      <path
        d="M0 726 L340 672 L700 722 L1060 660 L1420 718 L1760 668 L2120 722 L2400 686 L2400 800 L0 800 Z"
        fill="#0b1a15"
      />

      <rect y={GROUND} width={WORLD.w} height={WORLD.h - GROUND} fill="#070c0a" />
      <line
        x1="0"
        y1={GROUND}
        x2={WORLD.w}
        y2={GROUND}
        stroke="var(--xp-dim)"
        strokeWidth="2"
        opacity="0.5"
      />

      {/* The road, running the whole width and dashed down the middle. */}
      <rect y={GROUND + 34} width={WORLD.w} height="54" fill="#0a1110" />
      <line
        x1="0"
        y1={GROUND + 61}
        x2={WORLD.w}
        y2={GROUND + 61}
        stroke="var(--xp-dim)"
        strokeWidth="3"
        strokeDasharray="34 46"
        opacity="0.45"
      />

      <Trees />

      {/* The estate wall, broken by the gate. */}
      <rect x="0" y="640" width="742" height="120" className="xw-stone" />
      <rect x="1058" y="640" width="1342" height="120" className="xw-stone" />

      <Gate open={gateOpen} />
      <House lit={solved.includes("house")} />
      <Mast live={solved.includes("mast")} />

      {/* Ground fog, last so it sits in front of everything on the ground. */}
      <ellipse cx="1000" cy="772" rx="900" ry="34" fill="var(--xp-dim)" opacity="0.1" />
      <ellipse cx="1900" cy="778" rx="700" ry="28" fill="var(--xp-dim)" opacity="0.08" />
    </svg>
  );
}

/**
 * The gate: two posts, a lamp, and two leaves on hinges.
 *
 * Opening is scaleX about each hinge. Foreshortening a leaf toward its post is
 * what a gate swinging away from you actually does on screen, and it is one
 * transform on one group rather than a rotation that would need a perspective
 * the rest of this flat scene does not have.
 */
function Gate({ open }: { open: boolean }) {
  const bars = (from: number) =>
    Array.from({ length: 6 }, (_, i) => from + 12 + i * 24);

  return (
    <g className={`xw-gate ${open ? "is-open" : ""}`}>
      {/* Posts */}
      <rect x="700" y="470" width="46" height="290" className="xw-stone" />
      <rect x="1054" y="470" width="46" height="290" className="xw-stone" />
      <rect x="690" y="452" width="66" height="24" className="xw-stone" />
      <rect x="1044" y="452" width="66" height="24" className="xw-stone" />

      {/* The lamp on the left post. It is the one warm thing in the scene and
          it is what the eye lands on when the camera arrives. */}
      <circle cx="723" cy="430" r="58" fill="url(#xw-lamp)" className="xw-lamp-glow" />
      <rect x="714" y="416" width="18" height="26" className="xw-iron" />
      <circle cx="723" cy="429" r="6" fill="var(--xp-fg)" />

      {/* Left leaf: hinged at the left post. */}
      <g className="xw-leaf xw-leaf-l">
        <rect x="746" y="556" width="154" height="6" className="xw-iron" />
        <rect x="746" y="742" width="154" height="6" className="xw-iron" />
        {bars(746).map((x) => (
          <g key={x}>
            <rect x={x} y="540" width="5" height="208" className="xw-iron" />
            <path
              d={`M${x - 3} 540 L${x + 2.5} 526 L${x + 8} 540 Z`}
              className="xw-iron"
            />
          </g>
        ))}
      </g>

      {/* Right leaf: hinged at the right post, so it foreshortens the other way. */}
      <g className="xw-leaf xw-leaf-r">
        <rect x="900" y="556" width="154" height="6" className="xw-iron" />
        <rect x="900" y="742" width="154" height="6" className="xw-iron" />
        {bars(900).map((x) => (
          <g key={x}>
            <rect x={x} y="540" width="5" height="208" className="xw-iron" />
            <path
              d={`M${x - 3} 540 L${x + 2.5} 526 L${x + 8} 540 Z`}
              className="xw-iron"
            />
          </g>
        ))}
      </g>
    </g>
  );
}

/** The portfolio, as a house. Its windows come on when its puzzle is solved. */
function House({ lit }: { lit: boolean }) {
  return (
    <g className={`xw-house ${lit ? "is-lit" : ""}`}>
      <polygon points="1352,528 1540,412 1728,528" className="xw-roof" />
      <rect x="1382" y="524" width="316" height="236" className="xw-wall" />
      <rect x="1636" y="438" width="34" height="90" className="xw-stone" />

      <rect x="1420" y="566" width="72" height="62" className="xw-window" />
      <rect x="1588" y="566" width="72" height="62" className="xw-window" />
      <rect x="1500" y="662" width="80" height="98" className="xw-door" />
      <circle cx="1568" cy="712" r="4" fill="var(--xp-fg)" opacity="0.7" />

      {/* The plaque on the post by the path. */}
      <rect x="1774" y="640" width="6" height="120" className="xw-iron" />
      <rect x="1742" y="612" width="70" height="30" className="xw-plaque" />
      <text x="1777" y="632" className="xw-plaque-text">
        HOME
      </text>
    </g>
  );
}

/** The signal mast, which is still transmitting the contact line. */
function Mast({ live }: { live: boolean }) {
  const rungs = Array.from({ length: 9 }, (_, i) => 720 - i * 46);
  return (
    <g className={`xw-mast ${live ? "is-live" : ""}`}>
      <line x1="2032" y1="760" x2="2054" y2="316" className="xw-iron-line" />
      <line x1="2094" y1="760" x2="2072" y2="316" className="xw-iron-line" />
      {rungs.map((y, i) => {
        const t = (760 - y) / 444;
        const l = 2032 + 22 * t;
        const r = 2094 - 22 * t;
        return (
          <g key={y}>
            <line x1={l} y1={y} x2={r} y2={y} className="xw-iron-line" />
            {i % 2 === 0 ? (
              <line x1={l} y1={y} x2={r} y2={y - 46} className="xw-iron-line" />
            ) : (
              <line x1={r} y1={y} x2={l} y2={y - 46} className="xw-iron-line" />
            )}
          </g>
        );
      })}
      <circle cx="2063" cy="300" r="34" fill="url(#xw-lamp)" className="xw-beacon-glow" />
      <circle cx="2063" cy="300" r="8" fill="var(--xp-fg)" />
    </g>
  );
}

/** A few conifers, for something in the middle distance to pass behind. */
function Trees() {
  const at = [210, 470, 1210, 1310, 1920, 2260, 2360];
  return (
    <g className="xw-trees">
      {at.map((x, i) => {
        const h = 150 + ((i * 37) % 70);
        const w = 44 + ((i * 11) % 22);
        return (
          <g key={x}>
            <rect x={x - 4} y={GROUND - 26} width="8" height="26" fill="#0c1a14" />
            <polygon
              points={`${x},${GROUND - h} ${x + w},${GROUND - 20} ${x - w},${GROUND - 20}`}
              fill="#0c1a14"
            />
            <polygon
              points={`${x},${GROUND - h - 26} ${x + w * 0.72},${GROUND - h * 0.55} ${x - w * 0.72},${GROUND - h * 0.55}`}
              fill="#0d1e17"
            />
          </g>
        );
      })}
    </g>
  );
}
