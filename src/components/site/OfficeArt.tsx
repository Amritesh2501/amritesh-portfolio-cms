"use client";

import { useId } from "react";
import { OFFICE } from "@/lib/office";

/**
 * The office, as a drawing.
 *
 * Third room, same hand: front face, one side face receding along a shared
 * depth vector, top or base depending on which side of eye level it sits.
 * Nothing shaded, nothing filled except to occlude.
 *
 * What makes it read as an office rather than as a room with desks in it is
 * the ceiling. A bedroom has one pendant; an office has a grid of recessed
 * tubes running the length of it, and once those are overhead nothing else has
 * to try. The other tell is the blinds: full-height vertical louvres rather
 * than a roller, which is the one window covering nobody has ever chosen for
 * their own home.
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
  const id = "oh" + useId().replace(/[^a-zA-Z0-9]/g, "");
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

export function OfficeRoom({
  at,
  lights,
  blindOpen,
  bloom,
  solved,
  onStation,
  onPuzzle,
  onLights,
  onBlind,
  onBloom,
}: {
  at: string | null;
  lights: boolean;
  blindOpen: boolean;
  bloom: number;
  solved: readonly string[];
  onStation: (id: string) => void;
  onPuzzle: (id: "wiring" | "patch" | "backlog" | "record") => void;
  onLights: () => void;
  onBlind: () => void;
  onBloom: () => void;
}) {
  const atBoard = at === "board";
  const atRack = at === "rack";
  const atDesk = at === "desk";
  const atCabinet = at === "cabinet";

  return (
    <svg
      className="xw-svg"
      viewBox={`0 0 ${OFFICE.w} ${OFFICE.h}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Shell. Wider and lower than the other two: an office floor, not a
          room somebody lives in. */}
      <g className="xw-line">
        <path d="M400 300 L2000 296 L1998 940 L402 944 Z" />
        <path d="M402 944 L2 1348" />
        <path d="M1998 940 L2398 1348" />
        <path d="M400 300 L2 120" />
        <path d="M2000 296 L2398 118" />
        <path d="M402 944 L1998 940" className="xw-thin" />
        <path d="M406 956 L1994 952" className="xw-thin" />
      </g>

      {/* Carpet tiles, converging. Square rather than boards — nobody lays a
          floor like this at home. */}
      <g className="xw-line xw-thin xw-faint">
        {[-520, -290, -60, 170, 400, 630, 860].map((o, i) => (
          <path key={i} d={`M${1200 + o * 0.18} 958 L${1200 + o * 1.95} 1350`} />
        ))}
        <path d="M300 1060 L2100 1060" className="xw-faint" />
        <path d="M180 1180 L2220 1180" className="xw-faint" />
      </g>

      {/* Light before the things it falls on, so the wash is under the ink
          rather than over it. */}
      <Daylight open={blindOpen} />
      <Ceiling on={lights} onToggle={onLights} />
      <Window open={blindOpen} onToggle={onBlind} />
      <Whiteboard
        at={atBoard}
        done={solved.includes("wiring")}
        onStation={onStation}
        onOpen={() => onPuzzle("wiring")}
      />
      <Rack
        at={atRack}
        done={solved.includes("patch")}
        onStation={onStation}
        onOpen={() => onPuzzle("patch")}
      />
      <Cabinet at={atCabinet} onStation={onStation} onOpen={() => onPuzzle("record")} />
      <Plant bloom={bloom} onTouch={onBloom} />
      <Desk
        at={atDesk}
        done={solved.includes("backlog")}
        onStation={onStation}
        onOpen={() => onPuzzle("backlog")}
      />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
   The ceiling
   ------------------------------------------------------------------------- */

/**
 * Recessed tubes, in a grid.
 *
 * This is the single thing that says "office" before anything else is read.
 * Four fittings running away from the reader, each one two tubes in a tray,
 * and the whole grid takes one click.
 */
function Ceiling({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const bays = [
    { y: 128, x1: 470, x2: 1930, h: 26 },
    { y: 176, x1: 500, x2: 1900, h: 24 },
    { y: 222, x1: 528, x2: 1872, h: 22 },
    { y: 264, x1: 554, x2: 1846, h: 20 },
  ];

  return (
    <g className={`xw-pendant ${on ? "is-on" : ""}`}>
      {/* What they throw: one broad wash rather than four cones. A ceiling
          grid does not have beams in it, which is the whole difference between
          an office and a room with a lamp. */}
      <g className="xw-bulb-light">
        <path d="M470 290 L1930 286 L2260 1350 L140 1350 Z" className="xw-bulb-cone" />
        <ellipse cx={1200} cy={1160} rx={760} ry={170} className="xw-bulb-pool" />
      </g>

      <g className="xw-line">
        {bays.map((b) => (
          <g key={b.y}>
            <path
              d={`M${b.x1} ${b.y} L${b.x2} ${b.y} L${b.x2} ${b.y + b.h} L${b.x1} ${b.y + b.h} Z`}
              className="xw-thin xw-solid"
            />
            <path d={`M${b.x1 + 12} ${b.y + 7} L${b.x2 - 12} ${b.y + 7}`} className="xw-thin xw-faint" />
            <path
              d={`M${b.x1 + 12} ${b.y + b.h - 7} L${b.x2 - 12} ${b.y + b.h - 7}`}
              className="xw-thin xw-faint"
            />
          </g>
        ))}
      </g>

      {/* The tubes themselves, which are what actually light. */}
      <g className="xw-office-tubes">
        {bays.map((b) => (
          <rect
            key={b.y}
            x={b.x1 + 12}
            y={b.y + 4}
            width={b.x2 - b.x1 - 24}
            height={b.h - 8}
            className="xw-bulb-core"
          />
        ))}
      </g>

      <rect
        className="xw-hit"
        x={460}
        y={118}
        width={1480}
        height={172}
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

/**
 * What comes in when the louvres turn.
 *
 * The blind opening used to reveal the city and change nothing else, so the
 * room stayed exactly as dark with the window open as with it shut — which
 * reads as the window being a picture of a window. Same three shapes the other
 * rooms use: a slab through the glass, a pool where it lands, a bloom on the
 * glass itself.
 */
function Daylight({ open }: { open: boolean }) {
  return (
    <g className={`xw-day ${open ? "is-on" : ""}`} aria-hidden>
      <path d="M1440 350 L1900 346 L2170 1350 L1000 1350 Z" className="xw-day-shaft" />
      <ellipse cx={1580} cy={1180} rx={490} ry={165} className="xw-day-pool" />
      <rect x={1440} y={348} width={462} height={280} className="xw-day-glow" />
    </g>
  );
}

/**
 * Vertical louvres, and the wand that turns them.
 *
 * The one window covering nobody has ever chosen for their own home. It was
 * drawn permanently half open and nothing could be done to it, which also meant
 * the city behind it never showed: the reveal is keyed off `.xw-outside.is-open`
 * and there was nothing in this room to ever set it. So it turns now, and
 * turning it is what lets the outside in.
 *
 * One number does the whole thing. Edge-on you see the 9px edge of each slat and
 * the gaps between them; turned flat they are 26 wide and overlap into a wall.
 * That is what a louvre actually does, and it is cheaper than animating a
 * rotation nobody would read at this scale.
 */
function Window({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const louvres = [];
  for (let x = 1452; x < 1900; x += 28) louvres.push(x);
  const face = open ? 9 : 26;

  return (
    <g className="xw-office-win">
      <path d="M1424 336 L1918 332 L1918 640 L1424 644 Z" className="xw-line xw-solid" />

      <g className={`xw-outside xw-office-out ${open ? "is-open" : ""}`}>
        <rect x={1440} y={348} width={462} height={280} className="xw-bed-sky-fill" />
        <g className="xw-line xw-thin xw-faint">
          <path d="M1460 628 L1460 392 L1524 392 L1524 628" />
          <path d="M1546 628 L1546 430 L1620 430 L1620 628" />
          <path d="M1646 628 L1646 368 L1704 368 L1704 628" />
          <path d="M1728 628 L1728 452 L1812 452 L1812 628" />
          <path d="M1834 628 L1834 404 L1894 404 L1894 628" />
        </g>
        <g className="xw-city">
          {[
            [1470, 410], [1494, 410], [1470, 442], [1494, 442], [1470, 474],
            [1558, 448], [1584, 448], [1558, 480], [1596, 480], [1558, 512],
            [1656, 386], [1680, 386], [1656, 418], [1656, 450], [1680, 450],
            [1740, 470], [1768, 470], [1788, 470], [1740, 502], [1768, 502],
            [1846, 422], [1846, 454], [1870, 454], [1846, 486],
          ].map(([x, y], i) => (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={15}
              height={18}
              className={i % 3 === 0 ? "xw-city-lit is-warm" : "xw-city-lit"}
            />
          ))}
        </g>
      </g>

      {/* The louvres. Turned flat they are filled, because a closed blind is
          opaque and a closed blind you can see through is not closed. */}
      <g className={`xw-office-slats ${open ? "is-open" : ""}`}>
        {louvres.map((x) => (
          <rect key={x} x={x} y={350} width={face} height={278} />
        ))}
      </g>
      <g className="xw-line xw-thin xw-faint">
        {louvres.map((x) => (
          <path key={x} d={`M${x} 350 L${x} 628`} />
        ))}
        {/* The headrail they all hang off. */}
        <path d="M1440 348 L1902 344" />
      </g>

      <g className="xw-line">
        <path d="M1436 348 L1906 344 L1906 632 L1436 636 Z" className="xw-thin" />
        <path d="M1408 644 L1934 640" />
        <path d="M1416 658 L1926 654" className="xw-thin" />
      </g>

      {/* The wand. What you actually take hold of to turn a vertical blind,
          and the only warm thing on the window — which is the instruction. */}
      <g className={`xw-office-wand ${open ? "is-open" : ""}`}>
        <path d="M1896 352 L1896 452" className="xw-hot-line" />
        <circle cx={1896} cy={458} r={7} className="xw-cord-bead" />
      </g>

      <rect
        className="xw-hit"
        x={1424}
        y={332}
        width={496}
        height={314}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      />
    </g>
  );
}

/* ---------------------------------------------------------------------------
   The whiteboard
   ------------------------------------------------------------------------- */

/**
 * An architecture nobody has redrawn since it stopped being true.
 *
 * Boxes and lines, and the lines cross. That is the puzzle — the untangle one,
 * which already existed for the case room's diagnostics and is reused here
 * rather than rebuilt, because a graph with no crossings is a graph with no
 * crossings wherever it is drawn.
 */
function Whiteboard({
  at,
  done,
  onStation,
  onOpen,
}: {
  at: boolean;
  done: boolean;
  onStation: (id: string) => void;
  onOpen: () => void;
}) {
  return (
    <g className={`xw-office-board ${done ? "is-done" : ""}`}>
      <g className="xw-line">
        <path d="M472 360 L1012 356 L1012 664 L472 668 Z" className="xw-solid" />
        <path d="M1012 356 L1034 344 L1034 652 L1012 664 Z" className="xw-solid" />
        <path d="M472 360 L494 348 L1034 344 L1012 356 Z" className="xw-solid" />
        <path d="M486 374 L998 370 L998 650 L486 654 Z" className="xw-thin xw-faint" />
        {/* A pen tray along the bottom. */}
        <path d="M486 664 L998 660" className="xw-thin" />
        <path d="M560 660 L640 659" className="xw-thin xw-faint" />
      </g>

      {/* The diagram. Boxes, and lines between them that cross. */}
      <g className="xw-office-diagram">
        {[
          [520, 410], [700, 396], [872, 412],
          [560, 520], [760, 506], [906, 540],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width={78} height={44} className="xw-thin" />
        ))}
        <g className="xw-office-edge">
          <path d="M598 432 L906 562" />
          <path d="M778 418 L598 542" />
          <path d="M950 434 L638 528" />
          <path d="M760 528 L872 434" />
        </g>
      </g>

      <rect
        className="xw-hit"
        x={466}
        y={340}
        width={576}
        height={334}
        onClick={at ? onOpen : () => onStation("board")}
      />
    </g>
  );
}

/* ---------------------------------------------------------------------------
   The patch panel, on the left wall
   ------------------------------------------------------------------------- */

/**
 * A rack against the left wall, seen down its length.
 *
 * Drawn in the same perspective the posters in the bedroom are: the near edge
 * taller than the far one. What is on it is a panel of ports with the cables
 * hanging out of them, which is the puzzle.
 */
function Rack({
  at,
  done,
  onStation,
  onOpen,
}: {
  at: boolean;
  done: boolean;
  onStation: (id: string) => void;
  onOpen: () => void;
}) {
  return (
    <g className={`xw-office-rack ${done ? "is-done" : ""}`}>
      <g className="xw-line">
        {/* Cabinet. */}
        <path d="M84 402 L300 468 L300 1012 L84 1030 Z" className="xw-solid" />
        <path d="M100 428 L286 486 L286 990 L100 1006 Z" className="xw-thin xw-faint" />
        {/* Shelves, converging with the wall. */}
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M100 ${520 + i * 118} L286 ${572 + i * 110}`}
            className="xw-thin xw-faint"
          />
        ))}
      </g>

      {/* The panel itself: a strip of ports, and cables out of them. */}
      <g className="xw-office-ports">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle key={i} cx={122 + i * 28} cy={648 + i * 9} r={7} className="xw-thin" />
        ))}
        <g className="xw-office-cable">
          <path d="M122 648 Q150 714 206 700" />
          <path d="M150 657 Q170 730 250 712" />
          <path d="M178 666 Q196 742 132 736" />
        </g>
      </g>

      <Hatch x={96} y={930} w={196} h={78} gap={12} className="xw-hatch xw-faint" />

      <rect
        className="xw-hit"
        x={78}
        y={396}
        width={230}
        height={642}
        onClick={at ? onOpen : () => onStation("rack")}
      />
    </g>
  );
}

/* ---------------------------------------------------------------------------
   The cabinet
   ------------------------------------------------------------------------- */

/** Personnel files. No lock on this one — it is the thing somebody came for. */
function Cabinet({
  at,
  onStation,
  onOpen,
}: {
  at: boolean;
  onStation: (id: string) => void;
  onOpen: () => void;
}) {
  return (
    <g className="xw-office-cab">
      <g className="xw-line">
        <path d="M566 700 L790 696 L790 950 L566 954 Z" className="xw-solid" />
        <path d="M790 696 L846 668 L846 922 L790 950 Z" className="xw-solid" />
        <path d="M566 700 L622 672 L846 668 L790 696 Z" className="xw-solid" />
        {/* Four drawers, with their divisions carried round the corner. */}
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <path d={`M566 ${762 + i * 62} L790 ${758 + i * 62}`} className="xw-thin" />
            <path d={`M790 ${758 + i * 62} L846 ${730 + i * 62}`} className="xw-thin xw-faint" />
          </g>
        ))}
        {/* Pulls. */}
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M648 ${730 + i * 62} L708 ${729 + i * 62}`} className="xw-thin" />
        ))}
        {/* A label on the top drawer, because it is the one that matters. */}
        <path d="M594 714 L662 713 L662 730 L594 731 Z" className="xw-thin xw-faint" />
      </g>

      <rect
        className="xw-hit"
        x={560}
        y={664}
        width={294}
        height={296}
        onClick={at ? onOpen : () => onStation("cabinet")}
      />
    </g>
  );
}

/** What the flower can be. Named as well as coloured, for the same reason the
 *  patch panel's strands are. */
export const BLOOMS = [
  { name: "amber", hex: "#e0a33c" },
  { name: "red", hex: "#e2564a" },
  { name: "violet", hex: "#9a6fd0" },
  { name: "blue", hex: "#4a86d8" },
  { name: "green", hex: "#4fb477" },
  { name: "white", hex: "#dcd6c6" },
];

/**
 * The one in every office, and nobody knows whose job it is.
 *
 * The only thing in this room that is not work. It has a flower in it now, and
 * the flower is the one thing here that does nothing at all except change
 * colour when you touch it — which is the point of it.
 */
function Plant({ bloom, onTouch }: { bloom: number; onTouch: () => void }) {
  // Six petals round the centre, placed rather than drawn one at a time.
  const petals = [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    return { cx: 1189 + Math.cos(a) * 15, cy: 772 + Math.sin(a) * 15 };
  });

  return (
    <g
      className="xw-office-pot"
      style={{ ["--bloom" as string]: BLOOMS[bloom % BLOOMS.length].hex }}
    >
      <g className="xw-line">
        {/* A tapered pot, and a rim that sits proud of it. */}
        <path d="M1150 872 L1228 870 L1218 962 L1160 964 Z" className="xw-solid" />
        <path d="M1144 866 L1234 864 L1234 882 L1144 884 Z" className="xw-thin xw-solid" />
        <ellipse cx={1189} cy={866} rx={45} ry={9} className="xw-thin xw-solid" />
        {/* Leaves, and the stem the flower is on. */}
        <path d="M1189 866 Q1176 812 1140 790" className="xw-thin" />
        <path d="M1189 866 Q1196 806 1232 782" className="xw-thin" />
        <path d="M1189 866 Q1184 822 1204 796" className="xw-thin" />
        <path d="M1189 866 Q1200 828 1166 800" className="xw-thin" />
        <path d="M1189 866 Q1192 820 1189 788" className="xw-thin" />
      </g>

      {/* The flower. `--bloom` is set from the room, so the colour lives in one
          list rather than being spelled again per petal. */}
      <g className="xw-office-bloom">
        {petals.map((p, i) => (
          <ellipse key={i} cx={p.cx} cy={p.cy} rx={11} ry={11} />
        ))}
        <circle cx={1189} cy={772} r={8} className="xw-office-bloom-eye" />
      </g>

      <rect
        className="xw-hit"
        x={1132}
        y={748}
        width={116}
        height={228}
        onClick={(e) => {
          e.stopPropagation();
          onTouch();
        }}
      />
    </g>
  );
}

/* ---------------------------------------------------------------------------
   The desk
   ------------------------------------------------------------------------- */

/**
 * A corporate desk, and a board of tickets nobody is going to move.
 *
 * The screen carries the match-three, which is a joke that only works if it
 * plays like the thing it is named after — so the tiles on the glass here are
 * the same grid the game uses, sitting there waiting.
 */
function Desk({
  at,
  done,
  onStation,
  onOpen,
}: {
  at: boolean;
  done: boolean;
  onStation: (id: string) => void;
  onOpen: () => void;
}) {
  return (
    <g>
      <g className="xw-line">
        {/* Top, and the modesty panel offices always have. */}
        <path d="M1300 796 L1852 792 L1916 868 L1246 874 Z" className="xw-solid" />
        <path d="M1246 874 L1916 868 L1916 892 L1246 898 Z" className="xw-solid" />
        <path d="M1290 898 L1872 892 L1872 1046 L1290 1052 Z" className="xw-thin xw-solid" />
        <path d="M1300 916 L1862 910" className="xw-thin xw-faint" />
        {/* Feet. */}
        <path d="M1290 1052 L1290 1090" />
        <path d="M1872 1046 L1872 1084" />
      </g>

      {/* A pedestal on castors, under the desk. */}
      <g className="xw-line">
        <path d="M1656 902 L1792 898 L1792 1032 L1656 1036 Z" className="xw-thin xw-solid" />
        <path d="M1656 946 L1792 942" className="xw-thin xw-faint" />
        <path d="M1656 990 L1792 986" className="xw-thin xw-faint" />
      </g>

      {/* The screen, and the backlog on it. */}
      <g className={`xw-office-screen ${done ? "is-done" : ""}`}>
        <g className="xw-line">
          <path d="M1362 596 L1682 592 L1684 776 L1360 780 Z" className="xw-solid" />
          <path d="M1682 592 L1700 582 L1702 766 L1684 776 Z" className="xw-solid" />
          <path d="M1362 596 L1380 586 L1700 582 L1682 592 Z" className="xw-solid" />
          <path d="M1374 606 L1672 602 L1674 766 L1372 770 Z" className="xw-thin" />
          <path d="M1516 780 L1516 818" />
          <ellipse cx={1522} cy={824} rx={62} ry={12} className="xw-solid xw-thin" />
        </g>

        {/* Tickets, waiting. */}
        <g className="xw-office-tiles">
          {Array.from({ length: 24 }, (_, i) => {
            const c = i % 6;
            const r = Math.floor(i / 6);
            return (
              <rect
                key={i}
                x={1392 + c * 46}
                y={622 + r * 36}
                width={36}
                height={26}
                className={`xw-office-tile is-k${i % 5}`}
              />
            );
          })}
        </g>
      </g>

      {/* A board and a mug, because it is somebody's desk. */}
      <g className="xw-line">
        <path d="M1372 824 L1594 820 L1606 856 L1380 860 Z" className="xw-thin xw-solid" />
        <path d="M1380 860 L1606 856 L1606 868 L1380 872 Z" className="xw-thin xw-solid" />
        <path d="M1648 816 L1652 858 Q1682 866 1710 858 L1714 816 Z" className="xw-solid" />
        <ellipse cx={1681} cy={816} rx={33} ry={9} className="xw-solid xw-thin" />
      </g>

      {/* The desk, in two pieces rather than one rectangle over the screen.
          The screen was the only thing here anybody could click; the desk
          itself — the top, the pedestal, the mug, two thirds of what reads as
          "the desk" — was dead surface. Both go to the same place. */}
      <rect
        className="xw-hit"
        x={1340}
        y={576}
        width={390}
        height={266}
        onClick={at ? onOpen : () => onStation("desk")}
      />
      <rect
        className="xw-hit"
        x={1246}
        y={790}
        width={676}
        height={264}
        onClick={at ? onOpen : () => onStation("desk")}
      />
    </g>
  );
}
