"use client";

import { useId } from "react";
import { LAB } from "@/lib/lab";

/**
 * The lab, as a drawing.
 *
 * Fourth room, same hand: front face, one side face receding along a shared
 * depth vector, top or base depending on which side of eye level it sits.
 * Nothing shaded, nothing filled except to occlude.
 *
 * What makes it read as a room somebody BUILDS in rather than one somebody
 * works in is the rig: three screens on one desk, the middle one square on and
 * the outer two angled in, which is a shape nobody has ever chosen for a job
 * they did not pick. The other tell is that the only light in here comes from
 * the screens and the cabinet — there is a ceiling fitting and it is off,
 * because nobody who works at two in the morning turns the big light on.
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
  const id = "lh" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const lines = [];
  for (let i = -h; i < w + h; i += gap) {
    const j = (i % 3) - 1;
    lines.push(<line key={i} x1={i + j} y1={h} x2={i + h - j} y2={0} />);
  }
  return (
    <g className={className}>
      <clipPath id={id}>
        <rect x={0} y={0} width={w} height={h} />
      </clipPath>
      <g clipPath={`url(#${id})`} transform={`translate(${x} ${y})`}>
        {lines}
      </g>
    </g>
  );
}

export function LabRoom({
  at,
  lights,
  blindOpen,
  rigOpen,
  onStation,
  onPuzzle,
  onLights,
  onBlind,
}: {
  at: string | null;
  lights: boolean;
  blindOpen: boolean;
  rigOpen: boolean;
  onStation: (id: string) => void;
  onPuzzle: (id: "rig" | "board" | "arcade") => void;
  onLights: () => void;
  onBlind: () => void;
}) {
  return (
    <svg
      className="xw-svg"
      viewBox={`0 0 ${LAB.w} ${LAB.h}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Shell. */}
      <g className="xw-line">
        <path d="M420 320 L1996 316 L1994 944 L422 948 Z" />
        <path d="M422 948 L2 1348" />
        <path d="M1994 944 L2398 1348" />
        <path d="M420 320 L2 130" />
        <path d="M1996 316 L2398 128" />
        <path d="M422 948 L1994 944" className="xw-thin" />
        <path d="M426 960 L1990 956" className="xw-thin" />
      </g>

      {/* Floor, converging. */}
      <g className="xw-line xw-thin xw-faint">
        {[-500, -270, -40, 190, 420, 650, 880].map((o, i) => (
          <path key={i} d={`M${1200 + o * 0.18} 954 L${1200 + o * 1.95} 1350`} />
        ))}
      </g>

      <Daylight open={blindOpen} />
      <Ceiling on={lights} onToggle={onLights} />
      <Window open={blindOpen} onToggle={onBlind} />
      <Board at={at === "board"} onStation={onStation} onOpen={() => onPuzzle("board")} />
      <Shelf />
      <Arcade at={at === "arcade"} onStation={onStation} onOpen={() => onPuzzle("arcade")} />
      <Rig
        at={at === "rig"}
        open={rigOpen}
        onStation={onStation}
        onOpen={() => onPuzzle("rig")}
      />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
   Light
   ------------------------------------------------------------------------- */

/** What comes in when the blind goes up. Same three shapes as the other rooms:
 *  a slab through the glass, a pool where it lands, a bloom on the glass. */
function Daylight({ open }: { open: boolean }) {
  return (
    <g className={`xw-day ${open ? "is-on" : ""}`} aria-hidden>
      <path d="M1462 364 L1806 362 L2120 1350 L1010 1350 Z" className="xw-day-shaft" />
      <ellipse cx={1560} cy={1190} rx={470} ry={160} className="xw-day-pool" />
      <rect x={1462} y={362} width={344} height={252} className="xw-day-glow" />
    </g>
  );
}

/**
 * One fitting, and it is off.
 *
 * Deliberately the dimmest ceiling in the four rooms. The point of this one is
 * that the screens are brighter than it, so turning it on should feel like a
 * mistake you correct — which it cannot if it was never an option.
 */
function Ceiling({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <g className={`xw-pendant ${on ? "is-on" : ""}`}>
      <g className="xw-bulb-light">
        <path d="M980 250 L1420 248 L1720 1350 L680 1350 Z" className="xw-bulb-cone" />
        <ellipse cx={1200} cy={1170} rx={560} ry={150} className="xw-bulb-pool" />
      </g>

      <g className="xw-line">
        <path d="M1196 130 L1196 214" className="xw-thin" />
        <path d="M1104 218 L1288 216 L1310 262 L1082 264 Z" className="xw-solid" />
        <ellipse cx={1196} cy={263} rx={114} ry={13} className="xw-thin" />
      </g>
      <circle cx={1196} cy={252} r={13} className="xw-bulb-core" />

      <rect
        className="xw-hit"
        x={1076}
        y={212}
        width={240}
        height={62}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      />
    </g>
  );
}

/* ---------------------------------------------------------------------------
   The window
   ------------------------------------------------------------------------- */

/** A roller blind on a strap, and a city that does not sleep either. */
function Window({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const clip = "lbl" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const g = { x: 1462, y: 362, w: 344, h: 252 };
  const h = open ? g.h * 0.09 : g.h * 0.95;

  return (
    <g className="xw-lab-win">
      <path d="M1444 344 L1824 342 L1824 632 L1444 634 Z" className="xw-line xw-solid" />

      <g className={`xw-outside ${open ? "is-open" : ""}`}>
        <rect x={g.x} y={g.y} width={g.w} height={g.h} className="xw-bed-sky-fill" />
        <g className="xw-line xw-thin xw-faint">
          <path d="M1480 610 L1480 420 L1534 420 L1534 610" />
          <path d="M1552 610 L1552 450 L1616 450 L1616 610" />
          <path d="M1634 610 L1634 396 L1686 396 L1686 610" />
          <path d="M1706 610 L1706 464 L1774 464 L1774 610" />
        </g>
        <g className="xw-city">
          {[
            [1488, 436], [1510, 436], [1488, 462], [1510, 462], [1488, 488],
            [1562, 466], [1584, 466], [1562, 492], [1596, 492], [1562, 518],
            [1642, 412], [1664, 412], [1642, 438], [1642, 464], [1664, 464],
            [1716, 480], [1740, 480], [1756, 480], [1716, 506], [1740, 506],
          ].map(([x, y], i) => (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={14}
              height={16}
              className={i % 3 === 0 ? "xw-city-lit is-warm" : "xw-city-lit"}
            />
          ))}
        </g>
      </g>

      {/* The blind itself, clipped to the glass so it rolls rather than slides. */}
      <clipPath id={clip}>
        <rect x={g.x} y={g.y} width={g.w} height={g.h} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <g className="xw-lab-blind" style={{ ["--h" as string]: `${h}` }}>
          <rect x={g.x} y={g.y} width={g.w} height={h} className="xw-blind-face" />
          <path
            d={`M${g.x} ${g.y + h} L${g.x + g.w} ${g.y + h}`}
            className="xw-line xw-thin"
          />
        </g>
      </g>

      <g className="xw-line">
        <path d="M1456 356 L1812 354 L1812 620 L1456 622 Z" className="xw-thin" />
        <path d="M1430 640 L1838 638" />
      </g>

      {/* The strap. Last, so nothing is painted over the thing you pull. */}
      <g className={`xw-cord ${open ? "is-up" : ""}`}>
        <path d={`M1796 ${g.y + h} L1796 ${g.y + h + 70}`} className="xw-hot-line" />
        <circle cx={1796} cy={g.y + h + 78} r={8} className="xw-cord-bead" />
      </g>

      <rect
        className="xw-hit"
        x={1444}
        y={342}
        width={396}
        height={300}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      />
    </g>
  );
}

/* ---------------------------------------------------------------------------
   The board
   ------------------------------------------------------------------------- */

/** Everything that was going to get built. A cork board, not a whiteboard —
 *  the office has the whiteboard, and this room is older than that job. */
function Board({
  at,
  onStation,
  onOpen,
}: {
  at: boolean;
  onStation: (id: string) => void;
  onOpen: () => void;
}) {
  return (
    <g className="xw-lab-board">
      <g className="xw-line">
        <path d="M452 372 L900 368 L900 660 L452 664 Z" className="xw-solid" />
        <path d="M900 368 L920 358 L920 650 L900 660 Z" className="xw-solid" />
        <path d="M452 372 L472 362 L920 358 L900 368 Z" className="xw-solid" />
        <path d="M466 386 L886 382 L886 646 L466 650 Z" className="xw-thin xw-faint" />
      </g>

      {/* Notes pinned to it, at the angles paper actually ends up at. */}
      <g>
        {[
          { x: 492, y: 408, w: 92, h: 76, a: -3 },
          { x: 610, y: 400, w: 86, h: 70, a: 2 },
          { x: 722, y: 414, w: 96, h: 78, a: -1.5 },
          { x: 500, y: 512, w: 88, h: 72, a: 2.5 },
          { x: 618, y: 520, w: 94, h: 76, a: -2 },
          { x: 736, y: 508, w: 84, h: 70, a: 1.5 },
        ].map((n, i) => (
          <g key={i} transform={`rotate(${n.a} ${n.x + n.w / 2} ${n.y + n.h / 2})`}>
            <rect x={n.x} y={n.y} width={n.w} height={n.h} className="xw-lab-note" />
            <path
              d={`M${n.x + 10} ${n.y + 22} L${n.x + n.w - 14} ${n.y + 22}`}
              className="xw-line xw-thin xw-faint"
            />
            <path
              d={`M${n.x + 10} ${n.y + 38} L${n.x + n.w - 24} ${n.y + 38}`}
              className="xw-line xw-thin xw-faint"
            />
            <circle cx={n.x + n.w / 2} cy={n.y + 8} r={4} className="xw-lab-pin" />
          </g>
        ))}
      </g>

      <rect
        className="xw-hit"
        x={446}
        y={354}
        width={480}
        height={316}
        onClick={at ? onOpen : () => onStation("board")}
      />
    </g>
  );
}

/** A shelf of the things that pile up next to a machine. */
function Shelf() {
  return (
    <g className="xw-line">
      <path d="M452 726 L900 722 L900 744 L452 748 Z" className="xw-solid" />
      <path d="M900 722 L920 712 L920 734 L900 744 Z" className="xw-solid" />
      {/* Books on end, and a box. */}
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M${480 + i * 26} 726 L${480 + i * 26} ${668 + (i % 3) * 8} L${498 + i * 26} ${
            666 + (i % 3) * 8
          } L${498 + i * 26} 725 Z`}
          className="xw-thin xw-solid"
        />
      ))}
      <path d="M660 726 L784 724 L784 678 L660 680 Z" className="xw-thin xw-solid" />
      <path d="M660 700 L784 698" className="xw-thin xw-faint" />
      {/* And a mug, because there is always a mug. */}
      <path d="M828 726 L830 690 Q852 684 872 690 L874 726 Z" className="xw-thin xw-solid" />
      <ellipse cx={851} cy={690} rx={23} ry={7} className="xw-thin xw-solid" />
    </g>
  );
}

/* ---------------------------------------------------------------------------
   The cabinet
   ------------------------------------------------------------------------- */

/** An upright arcade cabinet against the right wall, seen at an angle. It is
 *  the only thing in the room with its own light. */
function Arcade({
  at,
  onStation,
  onOpen,
}: {
  at: boolean;
  onStation: (id: string) => void;
  onOpen: () => void;
}) {
  return (
    <g className="xw-lab-arcade">
      <g className="xw-line">
        {/* Body. */}
        <path d="M1862 420 L2046 388 L2046 1044 L1862 1006 Z" className="xw-solid" />
        <path d="M2046 388 L2128 420 L2128 1012 L2046 1044 Z" className="xw-solid" />
        {/* Top. The corners go round the face — front-left, front-right,
            back-right, back-left. Listed in any other order it crosses itself
            and fills as a bowtie, which is what it was doing. */}
        <path d="M1862 420 L2046 388 L2128 420 L1944 452 Z" className="xw-solid" />
        {/* Marquee. */}
        <path d="M1874 446 L2036 418 L2036 480 L1874 506 Z" className="xw-thin xw-solid" />
        {/* Control deck, kicked out toward the player. */}
        <path d="M1862 740 L2046 708 L2062 762 L1858 796 Z" className="xw-solid" />
        <path d="M1858 796 L2062 762 L2062 790 L1858 824 Z" className="xw-solid" />
        {/* Coin door, and the kick plate. */}
        <path d="M1888 906 L2020 884 L2020 934 L1888 956 Z" className="xw-thin xw-faint" />
      </g>

      {/* The screen, and something still running on it. */}
      <g>
        <path d="M1888 528 L2024 504 L2024 690 L1888 712 Z" className="xw-lab-crt-glass" />
        <g className="xw-lab-crt-art">
          {/* A ship and three rows of invaders, which is the only thing a
              cabinet in a drawing is ever allowed to be showing. */}
          <path d="M1950 676 L1962 676 L1956 662 Z" />
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={1902 + c * 30 + r * 4}
                y={548 + r * 30}
                width={16}
                height={12}
              />
            )),
          )}
        </g>
      </g>

      {/* Stick and two buttons on the deck. */}
      <g className="xw-line">
        <path d="M1916 764 L1912 736" />
        <circle cx={1911} cy={731} r={9} className="xw-solid" />
        <circle cx={1968} cy={752} r={9} className="xw-thin" />
        <circle cx={2000} cy={746} r={9} className="xw-thin" />
      </g>

      <Hatch x={1866} y={1006} w={200} h={44} gap={12} className="xw-hatch xw-faint" />

      <rect
        className="xw-hit"
        x={1854}
        y={384}
        width={280}
        height={670}
        onClick={at ? onOpen : () => onStation("arcade")}
      />
    </g>
  );
}

/* ---------------------------------------------------------------------------
   The rig
   ------------------------------------------------------------------------- */

/**
 * Three screens on one desk: the middle square on, the outer two angled in.
 *
 * The middle one is the work, and it is the one that is locked — the other two
 * carry a dashboard and a pair of games, which is the whole joke of the room.
 * Until the machine is open all three show the same thing, which is a lock
 * screen, because a rig that shows you everything and then asks for a password
 * has already shown you everything.
 */
function Rig({
  at,
  open,
  onStation,
  onOpen,
}: {
  at: boolean;
  open: boolean;
  onStation: (id: string) => void;
  onOpen: () => void;
}) {
  return (
    <g className={`xw-lab-rig ${open ? "is-open" : ""}`}>
      {/* Desk. */}
      <g className="xw-line">
        <path d="M980 800 L1660 794 L1728 872 L920 880 Z" className="xw-solid" />
        <path d="M920 880 L1728 872 L1728 898 L920 906 Z" className="xw-solid" />
        <path d="M956 906 L1692 898 L1692 1062 L956 1070 Z" className="xw-thin xw-solid" />
        <path d="M968 924 L1680 916" className="xw-thin xw-faint" />
        <path d="M960 1070 L960 1108" />
        <path d="M1688 1062 L1688 1100" />
      </g>

      {/* The three screens. Middle square on; the outer two turned in, which is
          one shear each rather than a second projection. */}
      <g className="xw-line">
        {/* Left, angled in. */}
        <path d="M1002 566 L1146 552 L1146 720 L1002 706 Z" className="xw-solid" />
        <path d="M1002 566 L1014 560 L1156 546 L1146 552 Z" className="xw-solid" />
        {/* Middle. */}
        <path d="M1158 546 L1400 544 L1400 724 L1158 722 Z" className="xw-solid" />
        <path d="M1158 546 L1170 540 L1412 538 L1400 544 Z" className="xw-solid" />
        {/* Right, angled in. */}
        <path d="M1412 552 L1556 566 L1556 706 L1412 720 Z" className="xw-solid" />
        <path d="M1412 552 L1422 546 L1566 560 L1556 566 Z" className="xw-solid" />
        {/* One stand under the middle, and a bar the outer two hang off. */}
        <path d="M1279 724 L1279 774" />
        <ellipse cx={1279} cy={780} rx={72} ry={13} className="xw-solid xw-thin" />
        <path d="M1074 706 L1074 748" className="xw-thin" />
        <path d="M1484 706 L1484 748" className="xw-thin" />
      </g>

      {/* What is on them. */}
      <g className="xw-lab-glass">
        <rect x={1012} y={572} width={126} height={130} />
        <rect x={1168} y={556} width={224} height={158} />
        <rect x={1422} y={572} width={126} height={130} />
      </g>

      {open ? (
        <g>
          {/* Left: a dashboard. Bars, because a dashboard is always bars. */}
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={1024 + i * 22}
              y={676 - (12 + ((i * 29) % 78))}
              width={13}
              height={12 + ((i * 29) % 78)}
              className="xw-lab-bar"
            />
          ))}
          {/* Middle: rows of work. */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <g key={i}>
              <rect x={1180} y={572 + i * 23} width={14} height={14} className="xw-lab-chip" />
              <path
                d={`M1202 ${580 + i * 23} L${1300 + ((i * 37) % 76)} ${580 + i * 23}`}
                className="xw-lab-row"
              />
            </g>
          ))}
          {/* Right: a game, mid-frame. */}
          <g className="xw-lab-play">
            <path d="M1478 686 L1490 686 L1484 672 Z" />
            {[0, 1, 2].map((c) => (
              <rect key={c} x={1440 + c * 34} y={596} width={18} height={12} />
            ))}
            {[0, 1].map((c) => (
              <rect key={c} x={1458 + c * 34} y={626} width={18} height={12} />
            ))}
          </g>
        </g>
      ) : (
        /* Locked: the same nine by nine on all three, which is the route it is
           asking for. Drawn dim, because it is a prompt rather than the game. */
        <g className="xw-lab-lock">
          {[
            { x: 1030, y: 590, s: 10 },
            { x: 1214, y: 578, s: 13 },
            { x: 1440, y: 590, s: 10 },
          ].map((p, k) => (
            <g key={k}>
              {Array.from({ length: 81 }, (_, i) => (
                <rect
                  key={i}
                  x={p.x + (i % 9) * p.s}
                  y={p.y + Math.floor(i / 9) * p.s}
                  width={p.s - 3}
                  height={p.s - 3}
                />
              ))}
            </g>
          ))}
        </g>
      )}

      {/* Keyboard and a pad on the desk. */}
      <g className="xw-line">
        <path d="M1130 816 L1442 812 L1456 848 L1120 852 Z" className="xw-thin xw-solid" />
        <path d="M1120 852 L1456 848 L1456 860 L1120 864 Z" className="xw-thin xw-solid" />
        <ellipse cx={1546} cy={834} rx={40} ry={18} className="xw-thin xw-solid" />
      </g>

      <rect
        className="xw-hit"
        x={992}
        y={536}
        width={580}
        height={260}
        onClick={at ? onOpen : () => onStation("rig")}
      />
      <rect
        className="xw-hit"
        x={920}
        y={794}
        width={812}
        height={270}
        onClick={at ? onOpen : () => onStation("rig")}
      />
    </g>
  );
}
