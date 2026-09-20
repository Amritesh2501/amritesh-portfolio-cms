"use client";

import { CASES } from "@/lib/files/cases";

/**
 * The residence, drawn.
 *
 * Vector rather than photography, for a reason that is not budget: the brief
 * wants foreground, middle-ground and background that move at different rates,
 * and a photograph is one plane. Drawing the rooms means the desk really is in
 * front of the shelf, and the camera can prove it by moving.
 *
 * Everything is built from a handful of primitives that take a `skew` — a
 * small rotation and offset. Nothing in a real office is square to anything
 * else, and a row of perfectly aligned binders is the single clearest tell
 * that a room was generated rather than lived in. The skews are hand-picked
 * constants, not random, so the room is the same room on every render.
 *
 * The hub is a photograph and lives in OfficeRoom; what is drawn here is the
 * residence, whose layers <Stage> parallaxes.
 */

/* ---------------------------------------------------------------------------
   Shared defs: light, grain, glass
   ------------------------------------------------------------------------- */

export function SceneDefs({ id }: { id: string }) {
  return (
    <defs>
      {/* Warm tungsten pool. Desk lamps, not ceiling light. */}
      <radialGradient id={`${id}-tung`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffbf72" stopOpacity="0.5" />
        <stop offset="45%" stopColor="#c47b2e" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#c47b2e" stopOpacity="0" />
      </radialGradient>

      {/* Cold spill from a window at night. */}
      <radialGradient id={`${id}-cool`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#7aa6d8" stopOpacity="0.32" />
        <stop offset="60%" stopColor="#3c5f8c" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#3c5f8c" stopOpacity="0" />
      </radialGradient>

      {/* Monitor glow: the only thing in these rooms that is genuinely bright. */}
      <radialGradient id={`${id}-screen`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#9fd0ff" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#4a7fb5" stopOpacity="0" />
      </radialGradient>

      <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#101015" />
        <stop offset="55%" stopColor="#0b0b0f" />
        <stop offset="100%" stopColor="#060608" />
      </linearGradient>

      <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3a2a1c" />
        <stop offset="100%" stopColor="#1a1209" />
      </linearGradient>

      <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#1d2025" />
        <stop offset="50%" stopColor="#2a2e35" />
        <stop offset="100%" stopColor="#15181c" />
      </linearGradient>

      <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c9bd9e" />
        <stop offset="100%" stopColor="#9c9076" />
      </linearGradient>

      {/* Film grain. Cheap, and it does more for "photographed" than any
          amount of extra geometry. */}
      <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" />
        <feColorMatrix type="saturate" values="0" />
      </filter>

      {/* Softens the far plane so depth reads even when the camera is still. */}
      <filter id={`${id}-haze`} x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="2.5" />
      </filter>
    </defs>
  );
}

/** Grain + vignette, laid over a whole layer. */
export function Grain({ id, w, h }: { id: string; w: number; h: number }) {
  return (
    <>
      <rect
        width={w}
        height={h}
        filter={`url(#${id}-grain)`}
        opacity="0.055"
        style={{ mixBlendMode: "overlay" }}
        pointerEvents="none"
      />
      <radialGradient id={`${id}-vig`} cx="50%" cy="48%" r="72%">
        <stop offset="55%" stopColor="#000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.72" />
      </radialGradient>
      <rect width={w} height={h} fill={`url(#${id}-vig)`} pointerEvents="none" />
    </>
  );
}

/* ---------------------------------------------------------------------------
   Primitives
   ------------------------------------------------------------------------- */

type Skew = { r?: number; dx?: number; dy?: number };
const skew = (s: Skew = {}) =>
  `translate(${s.dx ?? 0} ${s.dy ?? 0}) rotate(${s.r ?? 0})`;

/** A pinned photograph or note on a corkboard. */
function Pinned({
  x,
  y,
  w,
  h,
  s,
  fill = "#b8ad91",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  s?: Skew;
  fill?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) ${skew(s)}`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={fill} opacity="0.5" />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="none" stroke="#000" strokeOpacity="0.4" />
      <circle cx="0" cy={-h / 2 + 5} r="3" fill="#7d2b2b" />
    </g>
  );
}

/** A stack of paper. Never square, never level. */
function Papers({ x, y, w, n = 5, s }: { x: number; y: number; w: number; n?: number; s?: Skew }) {
  return (
    <g transform={`translate(${x} ${y}) ${skew(s)}`}>
      {Array.from({ length: n }, (_, i) => (
        <rect
          key={i}
          x={(i % 3) - 2 + i * 0.4}
          y={-i * 2.2}
          width={w}
          height="3"
          fill="#b9ad90"
          opacity={0.2 + i * 0.045}
          transform={`rotate(${((i % 3) - 1) * 0.7} ${w / 2} 0)`}
        />
      ))}
    </g>
  );
}

/** A book, spine out. */
function Book({ x, y, h, w, fill, s }: { x: number; y: number; h: number; w: number; fill: string; s?: Skew }) {
  return (
    <g transform={`translate(${x} ${y}) ${skew(s)}`}>
      <rect width={w} height={h} fill={fill} opacity="0.55" />
      <rect width={w} height={h} fill="none" stroke="#000" strokeOpacity="0.5" />
      <rect x="1" y={h * 0.14} width={w - 2} height="2" fill="#000" opacity="0.35" />
    </g>
  );
}

/* ---------------------------------------------------------------------------
   THE RESIDENCE — 3000 x 1200
   ------------------------------------------------------------------------- */

const RID = "rs";

export function ResidenceBack({ w, h }: { w: number; h: number }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="fg-art" aria-hidden>
      <SceneDefs id={RID} />
      <rect width={w} height={h} fill={`url(#${RID}-wall)`} />
      <rect width={w} height="90" fill="#08080b" />

      {/* The photo wall: polaroids, a pinned map, and a poster he meant. */}
      <g transform="translate(120 140)">
        {[
          [40, 40, -3], [130, 28, 2], [214, 52, -1], [300, 32, 3.5],
          [46, 150, 1.5], [136, 140, -2.5], [222, 162, 2],
          [52, 262, -1], [142, 252, 3], [228, 272, -2.5],
        ].map(([x, y, r], i) => (
          <Pinned key={i} x={x} y={y} w={66} h={78} s={{ r: r as number }} />
        ))}
        {/* A street map, pinned flat. */}
        <g transform="translate(310 190) rotate(-1.5)">
          <rect width="170" height="160" fill="#2f3a33" opacity="0.4" />
          <g stroke="#7d8d80" strokeOpacity="0.3" strokeWidth="1.5" fill="none">
            <path d="M0 50 H170 M0 108 H170 M56 0 V160 M118 0 V160" />
          </g>
        </g>
      </g>

      {/* DISCIPLINE CREATES FREEDOM. */}
      <g transform="translate(560 250) rotate(-0.6)">
        <rect width="250" height="260" fill="#0b0b0e" stroke="#1e1e24" strokeWidth="2" />
        {["DISCIPLINE", "CREATES", "FREEDOM"].map((line, i) => (
          <text
            key={line}
            x="26"
            y={96 + i * 54}
            fontSize="40"
            fill="#d8d4cb"
            opacity="0.34"
            fontFamily="var(--font-jetbrains), monospace"
            fontWeight="700"
          >
            {line}
          </text>
        ))}
      </g>

      {/* The doorway, and the lit hall behind it: the room's cool key light. */}
      <g transform="translate(1120 200)">
        <rect width="300" height="700" fill="#07070a" stroke="#1a1610" strokeWidth="10" />
        <rect x="30" y="26" width="240" height="650" fill="#16202c" />
        <rect x="30" y="26" width="240" height="650" fill={`url(#${RID}-cool)`} opacity="0.8" />
        <rect x="248" y="330" width="14" height="40" rx="6" fill="#2e2a22" />
      </g>
      <ellipse cx="1270" cy="620" rx="520" ry="420" fill={`url(#${RID}-cool)`} opacity="0.35" />

      {/* Build / Learn / Improve / Repeat, straight onto the paint. */}
      <g transform="translate(1660 170) rotate(-2)">
        {["Build", "Learn", "Improve", "Repeat"].map((word, i) => (
          <text
            key={word}
            y={i * 46}
            fontSize="42"
            fill="#e2ddd2"
            opacity="0.3"
            fontFamily="var(--font-serif), serif"
            fontStyle="italic"
          >
            {word}
          </text>
        ))}
      </g>

      {/* The IDEAS whiteboard. Deliberately NOT a project list: naming builds
          here would be putting words in the subject's mouth, and the projects
          case is where the real rows live. Three ticks is a clue for the
          lock, and the check script knows it. */}
      <g transform="translate(1950 190) rotate(0.8)">
        <rect width="300" height="230" fill="#c6c3b8" opacity="0.13" stroke="#4a4a50" strokeWidth="3" />
        <text x="110" y="42" fontSize="27" fill="#e6e2d4" opacity="0.5" fontFamily="var(--font-jetbrains), monospace" letterSpacing="2">
          IDEAS
        </text>
        {[true, true, true, false, false].map((done, i) => (
          <g key={i} transform={`translate(30 ${72 + i * 31})`}>
            <rect width="17" height="17" fill="none" stroke="#d6d2c6" strokeOpacity="0.34" strokeWidth="2" />
            {done ? (
              <path d="M3 9 L7 13 L14 4" stroke="#d6d2c6" strokeOpacity="0.5" strokeWidth="2.5" fill="none" />
            ) : null}
            <rect x="32" y="4" width={120 + ((i * 37) % 80)} height="8" fill="#d6d2c6" opacity="0.2" />
          </g>
        ))}
      </g>

      {/* Sticky notes beside the board. */}
      {[[2280, 250, 3], [2280, 330, -2], [2360, 292, 1.5]].map(([x, y, r], i) => (
        <rect key={i} x={x} y={y} width="54" height="54" fill="#c9b55e" opacity="0.26" transform={`rotate(${r} ${x} ${y})`} />
      ))}

      <Grain id={RID} w={w} h={h} />
    </svg>
  );
}

export function ResidenceMid({ w, h }: { w: number; h: number }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="fg-art" aria-hidden>
      <SceneDefs id={`${RID}m`} />

      {/* Bed: frame, plaid-ish bedding, pillows, and it has been slept in. */}
      <g transform="translate(300 560)">
        <rect x="-20" y="-120" width="700" height="130" fill="#241a10" />
        <rect x="-20" y="-120" width="700" height="130" fill={`url(#${RID}m-wood)`} opacity="0.75" />
        <rect y="0" width="680" height="240" rx="12" fill="#1a1f26" />
        <rect y="0" width="680" height="240" rx="12" fill="#2a323d" opacity="0.45" />
        {/* Bedding check, at low opacity: pattern, not wallpaper. */}
        <g opacity="0.1" stroke="#cdd6e2" strokeWidth="2">
          {Array.from({ length: 9 }, (_, i) => <path key={`v${i}`} d={`M${i * 76} 0 V240`} />)}
          {Array.from({ length: 4 }, (_, i) => <path key={`h${i}`} d={`M0 ${i * 62} H680`} />)}
        </g>
        <rect x="24" y="-40" width="200" height="70" rx="14" fill="#39424f" opacity="0.6" transform="rotate(-2 124 -5)" />
        <rect x="238" y="-44" width="190" height="70" rx="14" fill="#333b47" opacity="0.55" transform="rotate(1.5 333 -9)" />
        {/* The camera and the notebook left on the covers. */}
        <g transform="translate(430 70) rotate(-6)">
          <rect width="96" height="58" rx="8" fill="#101216" />
          <circle cx="52" cy="29" r="21" fill="#191d23" stroke="#2c323a" strokeWidth="3" />
          <circle cx="52" cy="29" r="11" fill="#0a0c0f" />
          <rect x="10" y="-7" width="26" height="9" rx="3" fill="#15181d" />
        </g>
        <rect x="286" y="62" width="120" height="82" rx="3" fill="#b3a88c" opacity="0.4" transform="rotate(4 346 103)" />
      </g>

      {/* Nightstand: lamp, framed photo, a clock reading 23:47. */}
      <g transform="translate(60 700)">
        <rect width="230" height="180" fill="#241a10" />
        <rect width="230" height="180" fill={`url(#${RID}m-wood)`} opacity="0.8" />
        <rect x="14" y="96" width="202" height="70" fill="#0f0b07" />
        <g transform="translate(70 -110)">
          <rect x="-6" y="40" width="12" height="70" fill="#22262c" />
          <path d="M-58 40 L58 40 L40 -22 L-40 -22 Z" fill="#cfc6b2" opacity="0.32" />
          <ellipse cy="44" rx="54" ry="12" fill="#ffca86" opacity="0.4" />
        </g>
        <g transform="translate(150 40)">
          <rect width="62" height="52" rx="3" fill="#1b1f25" stroke="#333a43" strokeWidth="2" />
          <rect x="7" y="7" width="48" height="38" fill="#2f3a46" opacity="0.6" />
        </g>
        {/* The clock. One of the four lock clues, and legible on purpose. */}
        <g transform="translate(18 54)">
          <rect width="100" height="42" rx="4" fill="#0a0c0f" stroke="#1e2229" strokeWidth="2" />
          <text
            x="50"
            y="30"
            textAnchor="middle"
            fontSize="26"
            fill="#d9563f"
            opacity="0.72"
            fontFamily="var(--font-jetbrains), monospace"
            letterSpacing="2"
          >
            23:47
          </text>
        </g>
      </g>
      <ellipse cx="190" cy="600" rx="330" ry="240" fill={`url(#${RID}m-tung)`} />

      {/* The desk: two monitors, still compiling. */}
      <g transform="translate(1640 560)">
        <rect y="180" width="640" height="26" fill="#241a10" />
        <rect y="180" width="640" height="26" fill={`url(#${RID}m-wood)`} opacity="0.8" />
        <rect y="206" width="640" height="200" fill="#120d08" />
        <g transform="translate(40 -30)">
          <rect width="270" height="176" rx="5" fill="#090b0e" stroke="#20242a" strokeWidth="3" />
          <rect x="9" y="9" width="252" height="158" fill="#0e1a26" />
          {Array.from({ length: 11 }, (_, i) => (
            <rect key={i} x="20" y={22 + i * 13} width={50 + ((i * 47) % 170)} height="5" fill="#6fa3d6" opacity={0.2 + (i % 4) * 0.08} />
          ))}
        </g>
        <g transform="translate(330 -44)">
          <rect width="280" height="190" rx="5" fill="#090b0e" stroke="#20242a" strokeWidth="3" />
          <rect x="9" y="9" width="262" height="172" fill="#0d1620" />
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x="20" y={22 + i * 13} width={44 + ((i * 61) % 180)} height="5" fill="#5c8fbe" opacity={0.16 + (i % 3) * 0.09} />
          ))}
        </g>
        <rect x="150" y="196" width="220" height="14" rx="3" fill="#15181d" transform="rotate(-0.8 260 203)" />
        {/* Desk lamp, warm, clamped to the right of the monitors. */}
        <g transform="translate(600 20)">
          <rect x="-3" y="0" width="7" height="160" fill="#1d2026" />
          <path d="M-40 0 L40 0 L26 -42 L-26 -42 Z" fill="#23272e" />
          <ellipse cy="3" rx="37" ry="9" fill="#ffca86" opacity="0.55" />
        </g>
        <Papers x={430} y={188} w={120} n={5} s={{ r: 2 }} />
      </g>
      <ellipse cx="2000" cy="620" rx="440" ry="300" fill={`url(#${RID}m-screen)`} opacity="0.55" />
      <ellipse cx="2260" cy="600" rx="300" ry="230" fill={`url(#${RID}m-tung)`} opacity="0.8" />

      {/* Desk chair with a hoodie over the back. */}
      <g transform="translate(1520 700)">
        <rect width="190" height="220" rx="26" fill="#0d0f12" />
        <path d="M6 10 q90 -34 178 0 l-10 130 q-84 26 -158 0 Z" fill="#2c3139" opacity="0.5" />
        <rect x="80" y="220" width="26" height="70" fill="#0a0b0e" />
        <ellipse cx="94" cy="300" rx="80" ry="16" fill="#0a0b0e" />
      </g>

      {/* Bookshelf and, at the bottom of it, a guitar. */}
      <g transform="translate(2480 380)">
        <rect width="290" height="620" fill="#1a130c" stroke="#2c2015" strokeWidth="4" />
        {[0, 1, 2, 3].map((row) => (
          <g key={row} transform={`translate(16 ${30 + row * 150})`}>
            <rect y="122" width="258" height="9" fill="#2c2015" />
            {Array.from({ length: 9 }, (_, i) => (
              <Book
                key={i}
                x={i * 27}
                y={122 - (92 + ((i * 29 + row * 13) % 26))}
                w={22}
                h={92 + ((i * 29 + row * 13) % 26)}
                fill={["#4a3a2a", "#2f3c4a", "#463038", "#31432f", "#3d3a4c"][(i + row) % 5]}
                s={{ r: (i + row) % 7 === 3 ? 5 : 0 }}
              />
            ))}
          </g>
        ))}
      </g>
      <g transform="translate(2810 640) rotate(6)">
        <ellipse cx="60" cy="210" rx="96" ry="112" fill="#6b4a24" opacity="0.5" />
        <ellipse cx="60" cy="130" rx="74" ry="82" fill="#6b4a24" opacity="0.45" />
        <circle cx="60" cy="176" r="28" fill="#0a0806" />
        <rect x="48" y="-108" width="24" height="250" fill="#2e2015" />
        <rect x="42" y="-136" width="36" height="42" rx="5" fill="#241a10" />
      </g>

      <Grain id={`${RID}m`} w={w} h={h} />
    </svg>
  );
}

export function ResidenceNear({ w, h }: { w: number; h: number }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="fg-art" aria-hidden>
      <SceneDefs id={`${RID}n`} />

      {/* Rug, to sit the foreground furniture on something. */}
      <ellipse cx="1300" cy="1080" rx="900" ry="200" fill="#1d1a16" opacity="0.6" />

      {/* Backpack and a pair of shoes by the bed. */}
      <g transform="translate(260 800) rotate(-3)">
        <rect width="190" height="230" rx="42" fill="#12151a" />
        <rect width="190" height="230" rx="42" fill="#232932" opacity="0.5" />
        <rect x="34" y="118" width="122" height="74" rx="16" fill="#0d1014" />
        <path d="M46 16 q48 -40 98 0" stroke="#2b323c" strokeWidth="12" fill="none" />
        <path d="M74 60 L96 92 L118 60 Z" fill="#3c4553" opacity="0.6" />
      </g>
      <g transform="translate(60 980)">
        <ellipse cx="46" cy="40" rx="52" ry="24" fill="#15181d" />
        <ellipse cx="126" cy="54" rx="52" ry="24" fill="#12151a" transform="rotate(8 126 54)" />
      </g>

      {/* The low table: where he actually works. */}
      <g transform="translate(700 900)">
        <rect width="760" height="30" rx="4" fill="#3a2a1a" />
        <rect width="760" height="30" rx="4" fill={`url(#${RID}n-wood)`} opacity="0.65" />
        <rect y="30" width="760" height="14" fill="#0c0805" />
        <rect x="26" y="44" width="22" height="180" fill="#20170e" />
        <rect x="712" y="44" width="22" height="180" fill="#20170e" />

        {/* Open notebook, mid-sentence. */}
        <g transform="translate(60 -48) rotate(-2.5)">
          <rect width="330" height="58" rx="2" fill="#cfc3a4" opacity="0.5" />
          <rect x="163" width="4" height="58" fill="#000" opacity="0.25" />
          {Array.from({ length: 5 }, (_, i) => (
            <rect key={i} x={16} y={12 + i * 9} width={120 - ((i * 23) % 50)} height="2.5" fill="#2a2418" opacity="0.4" />
          ))}
          {Array.from({ length: 4 }, (_, i) => (
            <rect key={`r${i}`} x={182} y={12 + i * 9} width={110 - ((i * 31) % 60)} height="2.5" fill="#2a2418" opacity="0.4" />
          ))}
          <rect x="250" y="44" width="86" height="5" rx="2" fill="#1b1f26" transform="rotate(-6 293 46)" />
        </g>

        {/* The mug. The sweep game names it, so it is drawn to be findable. */}
        <g transform="translate(420 -62)">
          <rect width="72" height="76" rx="6" fill="#14161a" />
          <rect width="72" height="76" rx="6" fill="#23272e" opacity="0.6" />
          <ellipse cx="36" cy="2" rx="36" ry="9" fill="#0a0b0d" />
          <path d="M72 22 q28 16 0 34" stroke="#23272e" strokeWidth="9" fill="none" />
          {["Good", "Code", "Better", "Days"].map((t, i) => (
            <text key={t} x="36" y={22 + i * 14} textAnchor="middle" fontSize="11" fill="#cfd6e0" opacity="0.4" fontFamily="var(--font-jetbrains), monospace">
              {t}
            </text>
          ))}
        </g>

        {/* A potted plant, a book stack, a phone and a set of keys. */}
        <g transform="translate(530 -96)">
          <path d="M20 96 L64 96 L58 40 L26 40 Z" fill="#2a2119" />
          {[[-4, -30, -28], [42, -34, 22], [18, -46, -4], [-14, -6, -52], [56, -10, 46]].map(([dx, dy, r], i) => (
            <ellipse key={i} cx={42 + dx} cy={38 + dy} rx="22" ry="9" fill="#33452f" opacity="0.5" transform={`rotate(${r} ${42 + dx} ${38 + dy})`} />
          ))}
        </g>
        <g transform="translate(640 -34)">
          {["#2a3340", "#3a2f26", "#2f3a2f"].map((f, i) => (
            <g key={i} transform={`translate(${i * 2} ${-i * 15}) rotate(${(i - 1) * 1.4})`}>
              <rect width="206" height="15" rx="2" fill={f} opacity="0.75" />
              <rect y="11" width="206" height="4" fill="#000" opacity="0.35" />
            </g>
          ))}
        </g>
        <rect x="330" y="4" width="112" height="56" rx="8" fill="#0b0d10" stroke="#20242a" strokeWidth="2" transform="rotate(-8 386 32)" />
        <g transform="translate(486 8) rotate(12)" fill="#2c323b" opacity="0.7">
          <circle r="9" fill="none" stroke="#2c323b" strokeWidth="4" />
          <rect x="7" y="-3" width="34" height="6" rx="2" />
        </g>
      </g>

      {/* Armchair, right, with a slogan throw over the back. */}
      <g transform="translate(2140 720)">
        <rect width="420" height="330" rx="30" fill="#0b0c0f" />
        <rect x="24" y="-30" width="372" height="300" rx="24" fill="#191c21" opacity="0.7" />
        <g transform="translate(120 20)">
          {["A", "BETTER", "VERSION", "EVERYDAY"].map((t, i) => (
            <text key={t} y={i * 40} fontSize="34" fill="#9d9a94" opacity="0.32" fontFamily="var(--font-jetbrains), monospace" fontWeight="700">
              {t}
            </text>
          ))}
        </g>
      </g>

      {/* Nearest plane: the unfiled CONFIDENTIAL folder, cropped by the frame
          the way a real foreground object is. */}
      <g transform="translate(1860 960) rotate(-2)">
        <rect width="620" height="290" rx="4" fill="#0a0806" opacity="0.5" transform="translate(10 14)" />
        <rect width="620" height="290" rx="4" fill={`url(#${RID}n-paper)`} opacity="0.62" />
        <rect width="620" height="290" rx="4" fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="2" />
        {/* Punch holes and a worn edge: it has been in and out of a binder. */}
        {[70, 150, 230].map((cy) => (
          <circle key={cy} cx="26" cy={cy} r="7" fill="#0c0a08" opacity="0.5" />
        ))}
        <g transform="translate(70 40) rotate(-3)">
          <rect width="230" height="56" fill="none" stroke="#8c2f2f" strokeOpacity="0.62" strokeWidth="4" />
          <text x="115" y="40" textAnchor="middle" fontSize="33" fill="#8c2f2f" opacity="0.66" fontFamily="var(--font-jetbrains), monospace" fontWeight="700" letterSpacing="2">
            CONFIDENTIAL
          </text>
        </g>
        <text x="360" y="60" fontSize="19" fill="#2a2418" opacity="0.45" fontFamily="var(--font-jetbrains), monospace" letterSpacing="2">
          AMR-001
        </text>
        <text x="70" y="160" fontSize="27" fill="#2a2418" opacity="0.5" fontFamily="var(--font-serif), serif" fontStyle="italic">
          &ldquo;Not just a developer,
        </text>
        <text x="70" y="198" fontSize="27" fill="#2a2418" opacity="0.5" fontFamily="var(--font-serif), serif" fontStyle="italic">
          but a problem solver.&rdquo;
        </text>
        <text x="430" y="242" fontSize="22" fill="#2a2418" opacity="0.42" fontFamily="var(--font-serif), serif" fontStyle="italic">
          — A.T.
        </text>
        {/* A small brass padlock through the punch holes. */}
        <g transform="translate(560 210)">
          <rect y="14" width="46" height="38" rx="5" fill="#3d3524" />
          <path d="M11 14 V6 a12 12 0 0 1 24 0 v8" stroke="#3d3524" strokeWidth="6" fill="none" />
          <circle cx="23" cy="33" r="5" fill="#15120c" />
        </g>
      </g>

      <Grain id={`${RID}n`} w={w} h={h} />
    </svg>
  );
}
