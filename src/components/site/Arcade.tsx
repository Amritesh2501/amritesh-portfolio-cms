"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import * as sound from "@/lib/sound";
import { Help } from "./Help";

/**
 * The cabinet in the corner, and the third screen on the rig.
 *
 * Two games, one loop. They are the same shape — something you steer along one
 * axis, things coming at you, a score that goes up while you live — and the one
 * rule that differs is whether you can shoot back. Writing that twice would be
 * writing the same requestAnimationFrame twice; this is not an abstraction
 * built for a future caller, it is two things that were already the same.
 *
 *   SPACEWAR  you shoot. Rocks break and the score is what you hit.
 *   RUNNER    you do not. The score is how long you last, and it gets faster.
 *
 * Everything is in one coordinate box (100 x 140) and scaled by the SVG, so
 * nothing in the physics knows what size the screen is.
 */

const W = 100;
const H = 140;
/** How far up the box the player sits. */
const PLAYER_Y = 126;
const PLAYER_W = 9;
/** Rocks per second, and how fast they fall, at the start. */
const SPAWN_MS = 900;
const FALL = 26;
const SHOT_SPEED = 90;

type Mode = "spacewar" | "runner";

type Rock = { id: number; x: number; y: number; r: number; vx: number };
type Shot = { id: number; x: number; y: number };

const HELP = {
  what:
    "Two games on one cabinet. Spacewar gives you a gun and rocks to break; Runner takes the gun away and speeds up until you are hit.",
  controls: [
    "Left and right arrows, or A and D, steer.",
    "Spacewar only: space fires. You can have three shots up at once.",
    "Or drag your finger or the mouse across the screen to steer directly.",
    "P pauses. Escape closes the cabinet.",
  ],
  win: "There is no winning. Spacewar scores what you hit, Runner scores how long you last, and both keep your best for this visit.",
};

export function Arcade({ inline, onClose }: { inline?: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode>("spacewar");
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<Record<Mode, number>>({ spacewar: 0, runner: 0 });

  /* The world. In a ref, because it changes sixty times a second and none of
     those are renders worth doing — only the drawn snapshot below is. */
  const world = useRef({ x: W / 2, rocks: [] as Rock[], shots: [] as Shot[], t: 0, spawn: 0 });
  const [frame, setFrame] = useState({ x: W / 2, rocks: [] as Rock[], shots: [] as Shot[] });
  const keys = useRef<Set<string>>(new Set());
  const raf = useRef(0);
  const last = useRef(0);
  const seq = useRef(0);

  const boxRef = useRef<SVGSVGElement>(null);

  const reset = useCallback(() => {
    world.current = { x: W / 2, rocks: [], shots: [], t: 0, spawn: 0 };
    setFrame({ x: W / 2, rocks: [], shots: [] });
    setScore(0);
    setOver(false);
  }, []);

  const stop = useCallback(
    (finalScore: number) => {
      setRunning(false);
      setOver(true);
      sound.toss();
      setBest((b) => (finalScore > b[mode] ? { ...b, [mode]: finalScore } : b));
    },
    [mode],
  );

  /* The loop ---------------------------------------------------------------- */

  useEffect(() => {
    if (!running) return;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last.current) / 1000 || 0);
      last.current = now;
      const w = world.current;
      w.t += dt;

      // Steering.
      const k = keys.current;
      let dir = 0;
      if (k.has("arrowleft") || k.has("a")) dir -= 1;
      if (k.has("arrowright") || k.has("d")) dir += 1;
      w.x = Math.max(PLAYER_W / 2, Math.min(W - PLAYER_W / 2, w.x + dir * 58 * dt));

      // Rocks. Runner gets faster the longer you live; spacewar does not,
      // because in spacewar the pressure is how many are on screen.
      const speed = FALL * (mode === "runner" ? 1 + w.t / 26 : 1);
      const every = SPAWN_MS * (mode === "runner" ? Math.max(0.45, 1 - w.t / 55) : 1);

      w.spawn += dt * 1000;
      if (w.spawn >= every) {
        w.spawn = 0;
        seq.current += 1;
        w.rocks.push({
          id: seq.current,
          x: 6 + Math.random() * (W - 12),
          y: -8,
          r: mode === "runner" ? 5 + Math.random() * 3 : 4 + Math.random() * 4,
          vx: mode === "runner" ? (Math.random() - 0.5) * 14 : 0,
        });
      }

      for (const r of w.rocks) {
        r.y += speed * dt;
        r.x += r.vx * dt;
        if (r.x < r.r || r.x > W - r.r) r.vx *= -1;
      }
      for (const s of w.shots) s.y -= SHOT_SPEED * dt;

      // Shots meeting rocks.
      if (mode === "spacewar") {
        const deadRocks = new Set<number>();
        const deadShots = new Set<number>();
        for (const s of w.shots) {
          for (const r of w.rocks) {
            if (deadRocks.has(r.id)) continue;
            if (Math.hypot(s.x - r.x, s.y - r.y) <= r.r + 1.5) {
              deadRocks.add(r.id);
              deadShots.add(s.id);
              break;
            }
          }
        }
        if (deadRocks.size > 0) {
          setScore((n) => n + deadRocks.size);
          sound.keypress();
        }
        w.rocks = w.rocks.filter((r) => !deadRocks.has(r.id));
        w.shots = w.shots.filter((s) => !deadShots.has(s.id));
      }

      w.shots = w.shots.filter((s) => s.y > -4);

      // Rocks meeting the player, or the floor.
      let hit = false;
      const kept: Rock[] = [];
      for (const r of w.rocks) {
        if (
          r.y + r.r >= PLAYER_Y - 4 &&
          r.y - r.r <= PLAYER_Y + 4 &&
          Math.abs(r.x - w.x) <= r.r + PLAYER_W / 2
        ) {
          hit = true;
          continue;
        }
        if (r.y - r.r > H) {
          // Survived one. In runner that IS the score.
          if (mode === "runner") setScore((n) => n + 1);
          continue;
        }
        kept.push(r);
      }
      w.rocks = kept;

      setFrame({ x: w.x, rocks: [...w.rocks], shots: [...w.shots] });

      if (hit) {
        setScore((n) => {
          stop(n);
          return n;
        });
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };

    last.current = performance.now();
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [running, mode, stop]);

  /* Controls ---------------------------------------------------------------- */

  const fire = useCallback(() => {
    const w = world.current;
    if (mode !== "spacewar" || w.shots.length >= 3) return;
    seq.current += 1;
    w.shots.push({ id: seq.current, x: w.x, y: PLAYER_Y - 6 });
    sound.keypress();
  }, [mode]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowleft", "arrowright", "a", "d", " ", "p"].includes(k)) e.preventDefault();
      if (k === "p") {
        setRunning((r) => !r);
        return;
      }
      if (k === " ") {
        if (running) fire();
        return;
      }
      keys.current.add(k);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    // Capture, so the room behind never sees an arrow key and walks the camera
    // to another station mid-game.
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up, true);
    };
  }, [fire, running]);

  /** Steering by pointer, so this is playable without a keyboard at all. */
  const steer = (e: React.PointerEvent) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || box.width === 0 || !running) return;
    const x = ((e.clientX - box.left) / box.width) * W;
    world.current.x = Math.max(PLAYER_W / 2, Math.min(W - PLAYER_W / 2, x));
  };

  const start = () => {
    reset();
    setRunning(true);
    sound.latch();
  };

  const body = (
    <div className="xc2-card">
      <header className="xc2-head">
        <div className="xc2-modes" role="tablist">
          {(["spacewar", "runner"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={m === mode}
              className={`xc2-mode ${m === mode ? "is-on" : ""}`}
              onClick={() => {
                setMode(m);
                setRunning(false);
                reset();
              }}
            >
              {m === "spacewar" ? "SPACEWAR" : "RUNNER"}
            </button>
          ))}
        </div>
        <p className="xc2-score">
          {score} <span>best {best[mode]}</span>
        </p>
      </header>

      <div className="xc2-screen">
        <svg
          ref={boxRef}
          viewBox={`0 0 ${W} ${H}`}
          className="xc2-svg"
          onPointerMove={steer}
          onPointerDown={(e) => {
            steer(e);
            if (running) fire();
          }}
          aria-hidden
        >
          {/* Starfield. Fixed, so it is scenery rather than another moving
              thing to track. */}
          <g className="xc2-stars">
            {Array.from({ length: 26 }, (_, i) => (
              <circle
                key={i}
                cx={(i * 37) % W}
                cy={(i * 53) % H}
                r={i % 5 === 0 ? 0.8 : 0.45}
              />
            ))}
          </g>

          {frame.rocks.map((r) => (
            <circle key={r.id} cx={r.x} cy={r.y} r={r.r} className="xc2-rock" />
          ))}
          {frame.shots.map((s) => (
            <rect key={s.id} x={s.x - 0.7} y={s.y - 4} width={1.4} height={4} className="xc2-shot" />
          ))}

          {/* The player. A wedge in spacewar, a box in runner — the same thing
              steered, so it should not look like the same thing. */}
          {mode === "spacewar" ? (
            <path
              d={`M${frame.x} ${PLAYER_Y - 6} L${frame.x + PLAYER_W / 2} ${PLAYER_Y + 4} L${
                frame.x - PLAYER_W / 2
              } ${PLAYER_Y + 4} Z`}
              className="xc2-ship"
            />
          ) : (
            <rect
              x={frame.x - PLAYER_W / 2}
              y={PLAYER_Y - 4}
              width={PLAYER_W}
              height={8}
              rx={1.5}
              className="xc2-ship"
            />
          )}
        </svg>

        {!running ? (
          <div className="xc2-over">
            <p className="xc2-over-line">
              {over
                ? `Hit. ${score} ${mode === "spacewar" ? "broken" : "dodged"}.`
                : mode === "spacewar"
                  ? "Arrows to steer, space to fire."
                  : "Arrows to steer. It gets faster."}
            </p>
            <button type="button" className="btn btn-solid" onClick={start}>
              {over ? "Again" : "Start"}
            </button>
          </div>
        ) : null}
      </div>

      <footer className="xc2-foot">
        <Help title="The cabinet" text={HELP} />
        <div className="xc2-actions">
          {running ? (
            <button type="button" className="btn btn-sm" onClick={() => setRunning(false)}>
              Pause
            </button>
          ) : null}
          <button type="button" className="btn btn-sm" onClick={onClose}>
            {inline ? "Back to the screens" : "Step back"}
          </button>
        </div>
      </footer>

      {reduce ? (
        <p className="xc2-calm">
          This one moves, and there is no version of it that does not. Nothing else
          in the room needs you to play it.
        </p>
      ) : null}
    </div>
  );

  // On the rig's third screen it is already inside a panel; in the corner of
  // the room it is the panel.
  if (inline) return <div className="xc2 is-inline">{body}</div>;
  return (
    <div className="xc2" role="dialog" aria-modal="true" aria-label="The cabinet">
      {body}
    </div>
  );
}
