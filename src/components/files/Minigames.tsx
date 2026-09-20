"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  GAME_META,
  LOCK_CLUES,
  LOCK_CODE,
  MEMORY_LENGTH,
  PIPELINE,
  SEARCH_DECOYS,
  SEARCH_TARGET,
  SORT_BINS,
  SORT_DOCS,
  SYMBOLS,
  TIMING_ROUNDS,
  buildSequence,
  isOrdered,
  shuffleUnsolved,
  swapAt,
  timingHit,
  timingTarget,
  type SortBin,
} from "@/lib/files/puzzles";
import type { GameId } from "@/lib/files/cases";

/**
 * The six interactions that guard evidence.
 *
 * All of them take the same two props and nothing else, which is the whole
 * point: adding a seventh game is writing one component and adding one line to
 * the registry at the bottom, and any piece of evidence in any case can then
 * name it. The rules they run on live in lib/files/puzzles, already checked.
 *
 * Every one is operable from the keyboard. That is not a courtesy here — a
 * drag-only puzzle in the middle of a linear progression is a wall, not a
 * difficulty setting, and there is no way past it.
 */

export type GameProps = {
  onSolved: () => void;
  /** Lets a game report a wrong attempt so the shell can flash ACCESS DENIED. */
  onFail?: () => void;
};

/* ---------------------------------------------------------------------------
   GAME A — BYPASS (timing)
   ------------------------------------------------------------------------- */

function Timing({ onSolved, onFail }: GameProps) {
  const reduce = useReducedMotion();
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState(() => timingTarget(TIMING_ROUNDS[0]));
  const [pos, setPos] = useState(0);
  const [verdict, setVerdict] = useState<"idle" | "hit" | "miss">("idle");

  // The marker's position is read by the commit handler on the same frame the
  // key lands, so it has to be a ref as well as state: state is a frame behind
  // by definition, and a timing game judged one frame late is a timing game
  // that lies about near misses.
  const posRef = useRef(0);
  const dirRef = useRef(1);
  const runningRef = useRef(true);

  const spec = TIMING_ROUNDS[round];

  useEffect(() => {
    runningRef.current = true;
    let raf = 0;
    let last = performance.now();

    // The marker IS the game, so reduced motion slows it rather than stopping
    // it. Removing the movement would remove the puzzle and hand over the
    // evidence, which is not an accommodation, it is a different experience.
    const speed = spec.speed * (reduce ? 0.55 : 1);

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (runningRef.current) {
        let next = posRef.current + dirRef.current * speed * dt;
        if (next >= 1) {
          next = 1;
          dirRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          dirRef.current = 1;
        }
        posRef.current = next;
        setPos(next);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spec, reduce]);

  const commit = useCallback(() => {
    if (!runningRef.current) return;
    runningRef.current = false;

    if (timingHit(posRef.current, target)) {
      setVerdict("hit");
      const next = round + 1;
      window.setTimeout(() => {
        if (next >= TIMING_ROUNDS.length) {
          onSolved();
          return;
        }
        setRound(next);
        setTarget(timingTarget(TIMING_ROUNDS[next]));
        setVerdict("idle");
        posRef.current = 0;
        dirRef.current = 1;
        setPos(0);
        runningRef.current = true;
      }, 520);
    } else {
      setVerdict("miss");
      onFail?.();
      window.setTimeout(() => {
        setRound(0);
        setTarget(timingTarget(TIMING_ROUNDS[0]));
        setVerdict("idle");
        posRef.current = 0;
        dirRef.current = 1;
        setPos(0);
        runningRef.current = true;
      }, 800);
    }
  }, [target, round, onSolved, onFail]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "e" || e.key === "E" || e.key === " ") {
        e.preventDefault();
        commit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit]);

  return (
    <div className="fg-timing">
      <div className="fg-rounds" aria-label={`Pass ${round + 1} of ${TIMING_ROUNDS.length}`}>
        {TIMING_ROUNDS.map((_, i) => (
          <span key={i} className={i < round ? "is-done" : i === round ? "is-now" : ""} />
        ))}
      </div>

      <div className={`fg-bar is-${verdict}`}>
        <div
          className="fg-bar-zone"
          style={{ left: `${target.start * 100}%`, width: `${(target.end - target.start) * 100}%` }}
        />
        <div className="fg-bar-marker" style={{ left: `${pos * 100}%` }} />
      </div>

      <button type="button" className="fg-btn fg-btn-wide" onClick={commit}>
        {verdict === "hit"
          ? "LOCKED"
          : verdict === "miss"
            ? "ACCESS DENIED"
            : "PRESS E"}
      </button>

      <p className="fg-note" role="status" aria-live="polite">
        {verdict === "hit"
          ? "Pass accepted."
          : verdict === "miss"
            ? "Signal lost. Starting over."
            : "Stop the marker inside the lit window."}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   GAME F — RECALL (memory)
   ------------------------------------------------------------------------- */

function Memory({ onSolved, onFail }: GameProps) {
  const [sequence] = useState(() => buildSequence(MEMORY_LENGTH));
  const [shown, setShown] = useState(-1);
  const [phase, setPhase] = useState<"watch" | "input" | "wrong">("watch");
  const [entered, setEntered] = useState<string[]>([]);

  // Play the sequence back, one glyph at a time, then hand over.
  useEffect(() => {
    if (phase !== "watch") return;
    let i = -1;
    const timers: number[] = [];
    const step = () => {
      i++;
      if (i >= sequence.length) {
        timers.push(
          window.setTimeout(() => {
            setShown(-1);
            setPhase("input");
          }, 420),
        );
        return;
      }
      setShown(i);
      timers.push(window.setTimeout(() => setShown(-1), 480));
      timers.push(window.setTimeout(step, 700));
    };
    timers.push(window.setTimeout(step, 500));
    return () => timers.forEach(window.clearTimeout);
  }, [phase, sequence]);

  const press = (symbol: string) => {
    if (phase !== "input") return;
    const next = [...entered, symbol];

    if (symbol !== sequence[entered.length]) {
      setPhase("wrong");
      setEntered([]);
      onFail?.();
      window.setTimeout(() => setPhase("watch"), 900);
      return;
    }

    setEntered(next);
    if (next.length === sequence.length) onSolved();
  };

  return (
    <div className="fg-memory">
      <div className="fg-memory-stage" aria-hidden>
        {phase === "watch" && shown >= 0 ? (
          <span className="fg-glyph is-big">{sequence[shown]}</span>
        ) : phase === "wrong" ? (
          <span className="fg-glyph is-big is-wrong">✕</span>
        ) : (
          <span className="fg-glyph is-big is-idle">
            {"·".repeat(sequence.length - entered.length) || "—"}
          </span>
        )}
      </div>

      <p className="fg-note" role="status" aria-live="polite">
        {phase === "watch"
          ? "Transmitting."
          : phase === "wrong"
            ? "Wrong symbol. Transmitting again."
            : `Repeat it back. ${entered.length} of ${sequence.length}.`}
      </p>

      <div className="fg-glyphs">
        {SYMBOLS.map((s) => (
          <button
            key={s}
            type="button"
            className="fg-glyph-btn"
            onClick={() => press(s)}
            disabled={phase !== "input"}
            aria-label={`Symbol ${s}`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   GAME G — COMBINATION (lock)
   ------------------------------------------------------------------------- */

function Lock({ onSolved, onFail }: GameProps) {
  const [entry, setEntry] = useState("");
  const [wrong, setWrong] = useState(false);

  const push = (digit: string) => {
    if (entry.length >= LOCK_CODE.length) return;
    const next = entry + digit;
    setEntry(next);
    setWrong(false);

    if (next.length === LOCK_CODE.length) {
      if (next === LOCK_CODE) {
        window.setTimeout(onSolved, 360);
      } else {
        setWrong(true);
        onFail?.();
        window.setTimeout(() => {
          setEntry("");
          setWrong(false);
        }, 800);
      }
    }
  };

  return (
    <div className="fg-lock">
      {/* The clues are restated here rather than left on the walls alone. The
          player has already walked the room; making them walk it again from
          memory is padding, not difficulty. */}
      <ol className="fg-clues">
        {LOCK_CLUES.map((c) => (
          <li key={c.source}>
            <span className="fg-clue-src">{c.source}</span>
            <span className="fg-clue-reads">{c.reads}</span>
          </li>
        ))}
      </ol>

      <div className={`fg-readout${wrong ? " is-wrong" : ""}`} aria-live="polite">
        {Array.from({ length: LOCK_CODE.length }, (_, i) => (
          <span key={i} className="fg-digit">
            {entry[i] ?? "—"}
          </span>
        ))}
      </div>

      <div className="fg-keypad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((d) => (
          <button key={d} type="button" className="fg-key" onClick={() => push(d)}>
            {d}
          </button>
        ))}
        <button
          type="button"
          className="fg-key fg-key-wide"
          onClick={() => {
            setEntry("");
            setWrong(false);
          }}
        >
          CLEAR
        </button>
      </div>

      <p className="fg-note">
        {wrong ? "Rejected. The latch reset." : "Four digits, in the order listed."}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   GAME H — SWEEP (hidden object)
   ------------------------------------------------------------------------- */

function Search({ onSolved, onFail }: GameProps) {
  const [items] = useState(() => shuffleUnsolved([SEARCH_TARGET, ...SEARCH_DECOYS]));
  const [wrong, setWrong] = useState<string | null>(null);

  const pick = (item: string) => {
    if (item === SEARCH_TARGET) {
      onSolved();
      return;
    }
    setWrong(item);
    onFail?.();
    window.setTimeout(() => setWrong(null), 700);
  };

  return (
    <div className="fg-search">
      <p className="fg-note">
        Locate: <strong>{SEARCH_TARGET}</strong>
      </p>
      <div className="fg-search-grid">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            className={`fg-swatch${wrong === item ? " is-wrong" : ""}`}
            onClick={() => pick(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   GAME E — FILING (sorting)
   ------------------------------------------------------------------------- */

function Sort({ onSolved, onFail }: GameProps) {
  const [queue, setQueue] = useState(() => shuffleUnsolved(SORT_DOCS));
  const [placed, setPlaced] = useState(0);
  const [wrong, setWrong] = useState<SortBin | null>(null);

  const current = queue[0];

  const file = (bin: SortBin) => {
    if (!current) return;
    if (current.bin !== bin) {
      setWrong(bin);
      onFail?.();
      window.setTimeout(() => setWrong(null), 650);
      return;
    }
    const rest = queue.slice(1);
    setQueue(rest);
    setPlaced((n) => n + 1);
    if (rest.length === 0) onSolved();
  };

  return (
    <div className="fg-sort">
      <div className="fg-doc" aria-live="polite">
        {current ? (
          <>
            <span className="fg-doc-kicker">LOOSE DOCUMENT</span>
            <span className="fg-doc-label">{current.label}</span>
          </>
        ) : (
          <span className="fg-doc-label">Desk clear.</span>
        )}
      </div>

      <p className="fg-note">
        {placed} of {SORT_DOCS.length} filed
      </p>

      <div className="fg-bins">
        {SORT_BINS.map((bin) => (
          <button
            key={bin}
            type="button"
            className={`fg-bin${wrong === bin ? " is-wrong" : ""}`}
            onClick={() => file(bin)}
            disabled={!current}
          >
            {bin}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   GAME I — RECONSTRUCT (pipeline order)
   ------------------------------------------------------------------------- */

function Rebuild({ onSolved }: GameProps) {
  const [items, setItems] = useState<string[]>(() => shuffleUnsolved(PIPELINE));
  const solved = isOrdered(items, PIPELINE);

  // `solved` is derived, so it stays true for every render after the winning
  // move; without the latch onSolved would fire on all of them.
  const fired = useRef(false);
  useEffect(() => {
    if (!solved || fired.current) return;
    fired.current = true;
    onSolved();
  }, [solved, onSolved]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    setItems((prev) => swapAt(prev, from, to));
  };

  return (
    <div className="fg-rebuild">
      <ol className="fg-chain">
        {items.map((item, i) => (
          <li key={item} className={`fg-link${solved ? " is-solved" : ""}`}>
            <span className="fg-link-n">{i + 1}</span>
            <span className="fg-link-label">{item}</span>
            <span className="fg-link-moves">
              <button
                type="button"
                onClick={() => move(i, i - 1)}
                disabled={i === 0 || solved}
                aria-label={`Move ${item} earlier`}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, i + 1)}
                disabled={i === items.length - 1 || solved}
                aria-label={`Move ${item} later`}
              >
                ↓
              </button>
            </span>
          </li>
        ))}
      </ol>
      <p className="fg-note" role="status" aria-live="polite">
        {solved ? "Path restored." : "Order them the way a request actually travels."}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Registry
   ------------------------------------------------------------------------- */

const GAMES: Record<GameId, (props: GameProps) => React.JSX.Element> = {
  timing: Timing,
  memory: Memory,
  lock: Lock,
  search: Search,
  sort: Sort,
  rebuild: Rebuild,
};

export function Minigame({ id, ...props }: GameProps & { id: GameId }) {
  const Game = GAMES[id];
  return <Game {...props} />;
}

export { GAME_META };
