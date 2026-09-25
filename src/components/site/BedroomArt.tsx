"use client";

import { useId } from "react";
import { BEDROOM } from "@/lib/bedroom";

/**
 * The bedroom, as a drawing.
 *
 * Same language as the case room and deliberately so — it is the same hand.
 * Every solid is a front face, one side face receding along a shared depth
 * vector, and a top or a base depending on which side of eye level it sits.
 * Nothing is shaded and nothing is filled except to occlude.
 *
 * What is different is the light. The case room is the middle of the night
 * with the blind down; this one is getting light, so the window is the
 * brightest thing in it and everything reads slightly warmer.
 */

/** Parallel strokes: how a pen makes shadow. Same helper, same reasoning as
 *  the case room's — clipped to its own box so a block can be dropped
 *  anywhere without working out where each stroke should stop. */
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
  const id = "bh" + useId().replace(/[^a-zA-Z0-9]/g, "");
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

export function BedroomRoom({
  at,
  lamp,
  drawerOpen,
  posterDone,
  onStation,
  onPuzzle,
  onLamp,
}: {
  at: string | null;
  lamp: boolean;
  drawerOpen: boolean;
  /** Once the poster is solved it is a photograph rather than a poster. */
  posterDone: boolean;
  onStation: (id: string) => void;
  onPuzzle: (id: "poster" | "drawer" | "terminal" | "books") => void;
  onLamp: () => void;
}) {
  const atPosters = at === "posters";
  const atSide = at === "side";
  const atDesk = at === "desk";

  return (
    <svg
      className="xw-svg"
      viewBox={`0 0 ${BEDROOM.w} ${BEDROOM.h}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Shell. One-point perspective, vanishing behind the bed, and a lower
          ceiling than the case room because this is somebody's room and not
          an office. */}
      <g className="xw-line">
        <path d="M430 330 L1990 326 L1988 948 L432 952 Z" />
        <path d="M432 952 L2 1348" />
        <path d="M1988 948 L2398 1348" />
        <path d="M430 330 L2 140" />
        <path d="M1990 326 L2398 138" />
        <path d="M432 952 L1988 948" className="xw-thin" />
        <path d="M436 964 L1984 960" className="xw-thin" />
      </g>

      {/* Floorboards, converging. */}
      <g className="xw-line xw-thin xw-faint">
        {[-420, -200, 40, 300, 560, 820, 1080].map((o, i) => (
          <path key={i} d={`M${1200 + o * 0.16} 954 L${1200 + o} 1350`} />
        ))}
      </g>

      {/* Daylight through the window, before anything it falls on. */}
      <g className="xw-bed-day">
        <path d="M300 420 L520 420 L980 1350 L60 1350 Z" className="xw-day-shaft" />
        <ellipse cx={520} cy={1180} rx={380} ry={130} className="xw-day-pool" />
      </g>

      <Window onStation={onStation} />
      <Posters
        at={atPosters}
        done={posterDone}
        onStation={onStation}
        onOpen={() => onPuzzle("poster")}
      />
      <Bed />
      <SideTable
        at={atSide}
        open={drawerOpen}
        lamp={lamp}
        onStation={onStation}
        onOpen={() => onPuzzle("drawer")}
        onLamp={onLamp}
      />
      <Shelf onOpen={() => onPuzzle("books")} />
      <Desk at={atDesk} onStation={onStation} onOpen={() => onPuzzle("terminal")} />
    </svg>
  );
}

/* ------------------------------------------------------------------------- */

function Window({ onStation }: { onStation: (id: string) => void }) {
  return (
    <g>
      {/* The opening, and the wall's own thickness round it. */}
      <g className="xw-line">
        <path d="M286 402 L540 398 L540 726 L286 730 Z" className="xw-solid" />
        <path d="M300 414 L528 410 L528 714 L300 718 Z" className="xw-thin" />
        <path d="M286 402 L300 414" className="xw-thin" />
        <path d="M286 730 L300 718" className="xw-thin" />
        {/* Glazing bars. */}
        <path d="M414 410 L414 716" />
        <path d="M300 560 L528 557" />
        {/* Sill, with a depth. */}
        <path d="M272 730 L556 726" />
        <path d="M280 744 L548 740" className="xw-thin" />
        <path d="M272 730 L280 744" className="xw-thin" />
      </g>

      {/* Morning, not night: a sky and a low sun rather than lit windows. */}
      <g className="xw-bed-sky">
        <rect x={300} y={410} width={228} height={306} className="xw-bed-sky-fill" />
        <circle cx={464} cy={636} r={30} className="xw-bed-sun" />
        <g className="xw-line xw-thin xw-faint">
          <path d="M302 690 L360 672 L412 684 L470 666 L528 678" />
        </g>
      </g>

      <rect
        className="xw-hit"
        x={272}
        y={396}
        width={292}
        height={352}
        onClick={() => onStation("window")}
      />
    </g>
  );
}

/**
 * Three posters over the bed, and one of them is the way in.
 *
 * The live one is drawn with a grid on it rather than a picture: it is a
 * sheet of arithmetic, which is the puzzle it holds, and it should look like
 * a thing to be worked rather than a thing to be looked at. Once it is solved
 * it is a photograph in a frame, which is the only change in this room that
 * is permanent.
 */
function Posters({
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
    <g className={`xw-bed-posters ${done ? "is-done" : ""}`}>
      {/* Two that are only posters. */}
      <g className="xw-line xw-thin">
        <path d="M604 372 L742 368 L742 546 L604 550 Z" className="xw-solid" />
        <path d="M620 396 L726 393" className="xw-faint" />
        <path d="M620 418 L700 415" className="xw-faint" />
        <path d="M620 502 L726 499" className="xw-faint" />

        <path d="M906 378 L1014 375 L1014 528 L906 531 Z" className="xw-solid" />
        <circle cx={960} cy={440} r={34} className="xw-faint" />
      </g>

      {/* The one that is not. A ruled sheet with figures on it. */}
      <g className="xw-bed-poster-live">
        <g className="xw-line">
          <path d="M776 358 L872 356 L872 552 L776 554 Z" className="xw-solid" />
          <path d="M786 370 L862 368 L862 542 L786 544 Z" className="xw-thin xw-faint" />
        </g>
        <Hatch x={786} y={430} w={76} h={100} gap={9} className="xw-hatch xw-faint" />
        <text className="xw-bed-sum" x={824} y={404} textAnchor="middle">
          {done ? "✓" : "7 × 8"}
        </text>
      </g>

      <rect
        className="xw-hit"
        x={596}
        y={350}
        width={426}
        height={210}
        onClick={at ? onOpen : () => onStation("posters")}
      />
    </g>
  );
}

function Bed() {
  return (
    <g className="xw-line">
      {/* Headboard, against the wall under the posters. */}
      <path d="M596 586 L1014 580 L1014 706 L596 712 Z" className="xw-solid" />
      <path d="M1014 580 L1058 560 L1058 686 L1014 706 Z" className="xw-solid" />
      <path d="M596 586 L640 566 L1058 560 L1014 580 Z" className="xw-solid" />

      {/* The mattress, in perspective, wider at the front. */}
      <path d="M580 706 L1030 700 L1092 900 L536 908 Z" className="xw-solid" />
      <path d="M536 908 L1092 900 L1092 946 L536 954 Z" className="xw-solid" />

      {/* Bedding: a turned-back sheet and a pillow each end of the head. */}
      <path d="M592 780 L1046 772" className="xw-thin xw-faint" />
      <path d="M586 800 L1052 792" className="xw-thin xw-faint" />
      <path d="M622 714 L780 711 L788 762 L620 766 Z" className="xw-thin xw-solid" />
      <path d="M812 710 L968 707 L974 758 L812 762 Z" className="xw-thin xw-solid" />

      {/* Legs. */}
      <path d="M552 954 L552 1010" />
      <path d="M1082 946 L1082 1002" />
    </g>
  );
}

/**
 * The side table, its drawer, and the lamp on it.
 *
 * The drawer is the one thing in this room that opens, so it is drawn twice:
 * shut, it is a face with a pull on it; open, the same face has slid forward
 * and there is a cavity behind it with something in it. Both states are in the
 * drawing rather than one being an animation of the other, because a drawer
 * that slides is a transform and a drawer you can see into is a different set
 * of lines.
 */
function SideTable({
  at,
  open,
  lamp,
  onStation,
  onOpen,
  onLamp,
}: {
  at: boolean;
  open: boolean;
  lamp: boolean;
  onStation: (id: string) => void;
  onOpen: () => void;
  onLamp: () => void;
}) {
  return (
    <g>
      {/* The lamp's light, before the things it falls on. */}
      <g className={`xw-lamp ${lamp ? "is-on" : ""}`}>
        <g className="xw-lamp-light">
          <path d="M1108 700 L1196 700 L1288 892 L1016 892 Z" className="xw-lamp-cone" />
          <ellipse cx={1152} cy={888} rx={140} ry={30} className="xw-lamp-pool" />
        </g>
      </g>

      {/* Carcass. */}
      <g className="xw-line">
        <path d="M1064 880 L1236 876 L1236 1056 L1064 1060 Z" className="xw-solid" />
        <path d="M1236 876 L1284 852 L1284 1030 L1236 1056 Z" className="xw-solid" />
        <path d="M1064 880 L1112 856 L1284 852 L1236 876 Z" className="xw-solid" />
        <path d="M1074 1060 L1074 1104" />
        <path d="M1226 1056 L1226 1098" />
      </g>

      {/* The drawer. Shut it is a face; open it is the same face further
          forward with a cavity behind it. */}
      <g className={`xw-bed-drawer ${open ? "is-open" : ""}`}>
        {open ? (
          <g className="xw-line">
            {/* The hole it came out of. */}
            <path d="M1076 900 L1224 897 L1224 968 L1076 971 Z" className="xw-thin xw-faint" />
            <Hatch x={1078} y={902} w={144} h={64} gap={10} className="xw-hatch xw-faint" />
            {/* What is in it. */}
            <path d="M1098 918 L1196 916 L1198 956 L1100 958 Z" className="xw-thin xw-solid" />
            <path d="M1108 928 L1186 926" className="xw-thin xw-faint" />
          </g>
        ) : null}

        <g className="xw-line xw-bed-drawer-face">
          <path d="M1066 898 L1234 894 L1234 972 L1066 976 Z" className="xw-solid" />
          <path d="M1124 930 L1176 929" className="xw-thin" />
          <path d="M1124 938 L1176 937" className="xw-thin xw-faint" />
        </g>
      </g>

      {/* A second, plain drawer under it, so the table is a table. */}
      <g className="xw-line">
        <path d="M1066 990 L1234 986 L1234 1050 L1066 1054 Z" className="xw-thin" />
        <path d="M1124 1018 L1176 1017" className="xw-thin xw-faint" />
      </g>

      {/* The lamp itself, after its own light. */}
      <g className={`xw-lamp ${lamp ? "is-on" : ""}`}>
        <g className="xw-line">
          <path d="M1120 856 L1120 762" />
          <path d="M1088 756 L1186 754 L1204 700 L1078 702 Z" className="xw-solid" />
          <ellipse cx={1140} cy={858} rx={40} ry={11} className="xw-solid xw-thin" />
        </g>
        <circle cx={1140} cy={748} r={9} className="xw-lamp-core" />
        <rect
          className="xw-hit"
          x={1070}
          y={694}
          width={140}
          height={72}
          onClick={(e) => {
            e.stopPropagation();
            onLamp();
          }}
        />
      </g>

      <rect
        className="xw-hit"
        x={1056}
        y={846}
        width={240}
        height={230}
        onClick={at ? onOpen : () => onStation("side")}
      />
    </g>
  );
}

/** Books, on a shelf that is only a shelf. Nothing here opens. */
/**
 * Books, and one of them is his.
 *
 * The only thing in this room that opens on a plain click — no lock, no sum,
 * no cipher. ABOUT is the door to the room rather than a file with pages, so
 * the long version of who he is has to live in here somewhere, and a shelf of
 * books is where a person's own account of themselves belongs. Making it a
 * fourth puzzle would be making somebody earn the thing they came for.
 */
function Shelf({ onOpen }: { onOpen: () => void }) {
  return (
    <g className="xw-bed-books">
      <g className="xw-line">
      <path d="M1352 470 L1620 466 L1620 492 L1352 496 Z" className="xw-solid" />
      <path d="M1620 466 L1650 452 L1650 478 L1620 492 Z" className="xw-solid" />
      {/* Spines, leaning the way a half-empty shelf does. */}
      {[
        [1366, 0], [1384, -1.5], [1402, 0], [1420, 2], [1438, 0],
        [1462, -3], [1480, 0], [1498, 1.5],
      ].map(([x, tilt], i) => (
        <path
          key={i}
          d={`M${x} 470 L${x + 13} 470 L${x + 13} ${392 + (i % 3) * 9} L${x} ${392 + (i % 3) * 9} Z`}
          className="xw-thin"
          transform={`rotate(${tilt} ${x + 6} 470)`}
        />
      ))}
      {/* A few laid flat on the end. */}
        <path d="M1540 470 L1610 469 L1610 458 L1540 459 Z" className="xw-thin" />
        <path d="M1544 458 L1606 457 L1606 448 L1544 449 Z" className="xw-thin" />
      </g>

      <rect
        className="xw-hit"
        x={1344}
        y={382}
        width={320}
        height={120}
        onClick={onOpen}
      />
    </g>
  );
}

/**
 * The desk, and the terminal on it.
 *
 * A green screen rather than the case room's flat panel, because the thing it
 * is asking for is a password and a machine that wants a password should look
 * older than the room it is in.
 */
function Desk({
  at,
  onStation,
  onOpen,
}: {
  at: boolean;
  onStation: (id: string) => void;
  onOpen: () => void;
}) {
  return (
    <g>
      <g className="xw-line">
        {/* Top. */}
        <path d="M1568 806 L1934 802 L1976 862 L1528 868 Z" className="xw-solid" />
        <path d="M1528 868 L1976 862 L1976 884 L1528 890 Z" className="xw-solid" />
        {/* Panel ends. */}
        <path d="M1552 890 L1590 890 L1596 1096 L1558 1096 Z" className="xw-solid" />
        <path d="M1590 890 L1614 878 L1620 1084 L1596 1096 Z" className="xw-solid" />
        <path d="M1912 884 L1950 884 L1944 1088 L1906 1088 Z" className="xw-solid" />
        <path d="M1912 884 L1888 872 L1882 1076 L1906 1088 Z" className="xw-solid" />
      </g>

      {/* The terminal. */}
      <g className="xw-bed-term">
        <g className="xw-line">
          <path d="M1650 624 L1852 620 L1856 796 L1646 800 Z" className="xw-solid" />
          <path d="M1852 620 L1886 602 L1890 778 L1856 796 Z" className="xw-solid" />
          <path d="M1650 624 L1684 606 L1886 602 L1852 620 Z" className="xw-solid" />
          <path d="M1666 640 L1836 637 L1840 764 L1662 768 Z" className="xw-thin" />
        </g>
        {/* What is on the glass. */}
        <g className="xw-bed-term-glow">
          <path d="M1684 668 L1744 667" className="xw-line xw-thin" />
          <path d="M1684 690 L1802 688" className="xw-line xw-thin" />
          <path d="M1684 712 L1758 711" className="xw-line xw-thin" />
          <rect className="xw-bed-term-caret" x={1684} y={730} width={14} height={16} />
        </g>
        {/* Board. */}
        <g className="xw-line">
          <path d="M1640 816 L1812 813 L1822 846 L1648 850 Z" className="xw-thin xw-solid" />
          <path d="M1648 850 L1822 846 L1822 858 L1648 862 Z" className="xw-thin xw-solid" />
        </g>
      </g>

      <rect
        className="xw-hit"
        x={1620}
        y={596}
        width={290}
        height={280}
        onClick={at ? onOpen : () => onStation("desk")}
      />
    </g>
  );
}
