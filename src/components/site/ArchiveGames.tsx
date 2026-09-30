"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as sound from "@/lib/sound";
import { ALPHABET, caesar, timeline, type Dated } from "@/lib/games";
import { isOrdered, shuffleOrder, swapAt } from "@/lib/world";
import type { Facts } from "@/lib/casebook";

/**
 * Three locks in the archives, each a small game of its own:
 *
 *   Prints    dust a door for a fingerprint, then match it to a card
 *   Decoder   turn a cipher ring until the microfiche reads
 *   Timeline  put the subject's record back in date order
 *
 * All three share the reading panel (.xa), so they sit in the same frame as
 * everything else the rooms give up.
 */

function Shell({
  name,
  title,
  children,
  onClose,
}: {
  name: string;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="xa xn" role="dialog" aria-modal="true" aria-label={name}>
      <article className="xa-card">
        <header className="xa-head">
          <p className="xa-kicker">{name.toUpperCase()}</p>
          <h2 className="xa-title">{title}</h2>
        </header>
        <div className="xa-body">{children}</div>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          Step back
        </button>
      </article>
    </div>
  );
}

/** Call once, a beat after winning, so the win is seen before it closes. */
function useWin(onOpened: () => void) {
  const [won, setWon] = useState(false);
  useEffect(() => {
    if (!won) return;
    const t = window.setTimeout(onOpened, 1100);
    return () => window.clearTimeout(t);
  }, [won, onOpened]);
  return [won, () => setWon(true)] as const;
}

/* ---------------------------------------------------------------------------
   Prints
   ------------------------------------------------------------------------- */

type PrintType = "whorl" | "loop" | "arch";
const TYPES: PrintType[] = ["whorl", "loop", "arch"];

/** A fingerprint in a 100 x 130 box: ridges only, the way a lift comes up. */
function PrintArt({ type }: { type: PrintType }) {
  const ridges = Array.from({ length: 9 }, (_, i) => i);
  return (
    <g className="xn-ridges">
      {type === "whorl"
        ? ridges.map((i) => <ellipse key={i} cx={50 + (i % 2)} cy={62} rx={6 + i * 5} ry={8 + i * 6} />)
        : type === "loop"
          ? ridges.map((i) => (
              <path key={i} d={`M${22 + i * 3} 125 Q${50 + i} ${14 + i * 9} ${80 - i * 3} 125`} />
            ))
          : ridges.map((i) => <path key={i} d={`M4 ${54 + i * 8} Q50 ${16 + i * 8} 96 ${54 + i * 8}`} />)}
    </g>
  );
}

const COLS = 10;
const ROWS = 13;

export function Prints({ name, onOpened, onClose }: { name: string; onOpened: () => void; onClose: () => void }) {
  const [type] = useState(() => TYPES[Math.floor(Math.random() * TYPES.length)]);
  const [cards] = useState(() => shuffleOrder(TYPES));
  const [dabs, setDabs] = useState<{ x: number; y: number }[]>([]);
  const [cells, setCells] = useState<Set<number>>(() => new Set());
  const [miss, setMiss] = useState(false);
  const [won, win] = useWin(onOpened);
  const svg = useRef<SVGSVGElement>(null);
  const down = useRef(false);
  const lastSound = useRef(0);

  const lifted = cells.size / (COLS * ROWS) >= 0.55;

  const dab = useCallback((x: number, y: number) => {
    setDabs((d) => (d.length > 600 ? d : [...d, { x, y }]));
    setCells((prev) => {
      const next = new Set(prev);
      // The print sits at (50, 20) and is 200 x 260 in the 300 x 300 surface.
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          const cx = 50 + (c + 0.5) * 20;
          const cy = 20 + (r + 0.5) * 20;
          if (Math.hypot(cx - x, cy - y) < 22) next.add(r * COLS + c);
        }
      return next;
    });
    const now = performance.now();
    if (now - lastSound.current > 90) {
      sound.toss();
      lastSound.current = now;
    }
  }, []);

  const at = (e: React.PointerEvent) => {
    const box = svg.current!.getBoundingClientRect();
    dab(((e.clientX - box.left) / box.width) * 300, ((e.clientY - box.top) / box.height) * 300);
  };

  // For anyone not using a pointer: each press dusts a stripe.
  const brushOnce = () => {
    const row = Math.floor(Math.random() * ROWS);
    for (let c = 0; c <= COLS; c++) dab(50 + c * 20, 30 + row * 20);
  };

  const pick = (t: PrintType) => {
    if (won) return;
    if (t === type) {
      sound.recovered();
      win();
    } else {
      sound.clank();
      setMiss(true);
    }
  };

  return (
    <Shell name={name} title={lifted ? "Which card is it?" : "Dust the door for prints"} onClose={onClose}>
      <p className="xn-how">
        {lifted
          ? "The print is up. Match it to one of the cards on file."
          : "Drag the brush across the little door. Keep going until the whole print shows."}
      </p>
      <svg
        ref={svg}
        className="xn-surface"
        viewBox="0 0 300 300"
        onPointerDown={(e) => {
          down.current = true;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          at(e);
        }}
        onPointerMove={(e) => down.current && at(e)}
        onPointerUp={() => (down.current = false)}
        role="img"
        aria-label={`A door being dusted: ${Math.round((cells.size / (COLS * ROWS)) * 100)}% of the print showing`}
      >
        <defs>
          <mask id="xn-dust">
            <rect width="300" height="300" fill="#000" />
            {dabs.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={22} fill="#fff" />
            ))}
          </mask>
        </defs>
        <rect width="300" height="300" className="xn-door" />
        <g mask="url(#xn-dust)">
          <rect width="300" height="300" className="xn-powder" />
          <g transform="translate(50 20) scale(2)">
            <PrintArt type={type} />
          </g>
        </g>
      </svg>
      {!lifted ? (
        <button type="button" className="btn btn-sm" onClick={brushOnce}>
          Brush a stripe
        </button>
      ) : (
        <div className="xn-cards">
          {cards.map((t, i) => (
            <button
              key={t}
              type="button"
              className={`xn-card ${won && t === type ? "is-match" : ""}`}
              onClick={() => pick(t)}
              aria-label={`Card ${i + 1}, a ${t}`}
            >
              <svg viewBox="-6 -6 112 142" aria-hidden>
                <PrintArt type={t} />
              </svg>
              <span>FILE {String.fromCharCode(65 + i)}</span>
            </button>
          ))}
        </div>
      )}
      {miss && !won ? <p className="xn-bad">No match. Look at the centre of the print.</p> : null}
      {won ? <p className="xn-good">A match. The little door clicks open.</p> : null}
    </Shell>
  );
}

/* ---------------------------------------------------------------------------
   Decoder
   ------------------------------------------------------------------------- */

export function Decoder({
  name,
  plain,
  shift,
  onOpened,
  onClose,
}: {
  name: string;
  plain: string;
  shift: number;
  onOpened: () => void;
  onClose: () => void;
}) {
  const cipher = useMemo(() => caesar(plain, shift), [plain, shift]);
  const [guess, setGuess] = useState(0);
  const [miss, setMiss] = useState(false);
  const [won, win] = useWin(onOpened);
  const read = caesar(cipher, -guess);

  const spin = useCallback((dir: 1 | -1) => {
    setGuess((g) => (g + dir + 26) % 26);
    setMiss(false);
    sound.dialClick();
  }, []);

  const lock = useCallback(() => {
    if (won) return;
    if (read === plain) {
      sound.recovered();
      win();
    } else {
      sound.clank();
      setMiss(true);
    }
  }, [won, read, plain, win]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "a" || k === "arrowleft") spin(-1);
      else if (k === "d" || k === "arrowright") spin(1);
      else if (k === "enter" || k === " ") lock();
      else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [spin, lock]);

  const step = 360 / 26;

  return (
    <Shell name={name} title={won ? "It reads" : "Turn the ring until it reads"} onClose={onClose}>
      <p className="xn-how">
        Every letter on the fiche has been moved along the alphabet by the same amount. Turn the inner ring
        with <kbd>A</kbd> and <kbd>D</kbd> until the line makes sense, then press <kbd>Enter</kbd>. Stuck? The
        college kept a note of the key.
      </p>

      <svg className="xn-ring" viewBox="-120 -120 240 240" aria-hidden>
        <circle r={112} className="xn-ring-outer" />
        {ALPHABET.split("").map((c, i) => {
          const a = ((i * step - 90) * Math.PI) / 180;
          return (
            <text key={c} x={Math.cos(a) * 100} y={Math.sin(a) * 100} className="xn-ring-l">
              {c}
            </text>
          );
        })}
        <g style={{ rotate: `${-guess * step}deg`, transition: "rotate 0.12s ease-out" }}>
          <circle r={86} className="xn-ring-inner" />
          {ALPHABET.split("").map((c, i) => {
            const a = ((i * step - 90) * Math.PI) / 180;
            return (
              <text key={c} x={Math.cos(a) * 74} y={Math.sin(a) * 74} className="xn-ring-l is-inner">
                {c}
              </text>
            );
          })}
        </g>
        <text className="xn-ring-k" y={6}>
          {guess}
        </text>
      </svg>

      <p className="xn-cipher" aria-label="The line on the fiche, as it reads with the ring where it is">
        {read}
      </p>

      <div className="xz-controls">
        <button type="button" className="btn btn-sm" onMouseDown={(e) => e.preventDefault()} onClick={() => spin(-1)}>
          ◀ A
        </button>
        <button type="button" className="btn btn-solid" onMouseDown={(e) => e.preventDefault()} onClick={lock}>
          It reads · Enter
        </button>
        <button type="button" className="btn btn-sm" onMouseDown={(e) => e.preventDefault()} onClick={() => spin(1)}>
          D ▶
        </button>
      </div>
      {miss && !won ? <p className="xn-bad">Still gibberish. Keep turning.</p> : null}
      {won ? <p className="xn-good">Decoded.</p> : null}
    </Shell>
  );
}

/* ---------------------------------------------------------------------------
   Timeline
   ------------------------------------------------------------------------- */

export function Timeline({
  name,
  facts,
  onOpened,
  onClose,
}: {
  name: string;
  facts: Facts;
  onOpened: () => void;
  onClose: () => void;
}) {
  const answer = useMemo(() => timeline(facts), [facts]);
  const [rows, setRows] = useState<Dated[]>(() => shuffleOrder(answer));
  const [right, setRight] = useState<number | null>(null);
  const [won, win] = useWin(onOpened);

  // One card or none: there is no order to get wrong.
  useEffect(() => {
    if (answer.length < 2) onOpened();
  }, [answer.length, onOpened]);

  const move = (i: number, j: number) => {
    setRows((r) => swapAt(r, i, j));
    setRight(null);
    sound.rustle();
  };

  const check = () => {
    if (isOrdered(rows.map((r) => r.id), answer.map((a) => a.id))) {
      sound.recovered();
      win();
    } else {
      sound.clank();
      setRight(rows.filter((r, i) => r.id === answer[i].id).length);
    }
  };

  return (
    <Shell name={name} title={won ? "In order" : "The cards are out of order"} onClose={onClose}>
      <p className="xn-how">
        Somebody pulled the drawer and shuffled it. Put the record back in date order, <strong>earliest at the
        top</strong>. The drawer only locks shut when every card is where it belongs.
      </p>
      <ol className="xn-cards-list">
        {rows.map((r, i) => (
          <li key={r.id} className={won ? "is-in" : ""}>
            <span className="xn-n">{i + 1}</span>
            <span className="xn-label">{r.label}</span>
            <span className="xn-move">
              <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0 || won} aria-label={`Move ${r.label} up`}>
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(i, i + 1)}
                disabled={i === rows.length - 1 || won}
                aria-label={`Move ${r.label} down`}
              >
                ▼
              </button>
            </span>
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-solid" onClick={check} disabled={won}>
        Close the drawer
      </button>
      {right !== null && !won ? (
        <p className="xn-bad">
          It will not shut. {right} of {rows.length} cards are in the right place.
        </p>
      ) : null}
      {won ? <p className="xn-good">The drawer slides home.</p> : null}
    </Shell>
  );
}
