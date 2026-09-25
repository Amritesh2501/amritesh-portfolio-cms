"use client";

import { useId } from "react";
import { BEDROOM } from "@/lib/bedroom";

/**
 * The bedroom, as a drawing.
 *
 * Same hand as the case room: every solid is a front face, one side face
 * receding along a shared depth vector, and a top or a base depending on which
 * side of eye level it sits. Nothing shaded, nothing filled except to occlude.
 *
 * The layout is what changed. Everything used to be strung along the back wall
 * in a row, which is a shop window rather than a room. It is arranged the way a
 * bedroom actually is now:
 *
 *   back wall    the window, with the bed under it
 *   the bed      head to the wall, foot toward the reader, in perspective
 *   beside it    the side table, where a side table goes
 *   left wall    the posters, seen down the length of the wall
 *   right side   the desk, with the books on a shelf above it
 *   ceiling      one pendant over the middle of the floor
 *
 * The bed is the piece that carries it. Drawn flat on, a bed is a rectangle
 * with a pillow on it and the room around it has nowhere to be. Drawn with its
 * head narrower than its foot, it is a bed you are standing at the end of, and
 * it sets the depth for everything else.
 */

/** Parallel strokes: how a pen makes shadow. */
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

/** The glass, shared by the blind and the view through it. */
const GLASS = { x: 676, y: 372, w: 356, h: 212 } as const;

export function BedroomRoom({
  at,
  lamp,
  ceiling,
  blindDown,
  drawerOpen,
  posterDone,
  onStation,
  onPuzzle,
  onLamp,
  onCeiling,
  onCord,
}: {
  at: string | null;
  lamp: boolean;
  ceiling: boolean;
  blindDown: boolean;
  drawerOpen: boolean;
  posterDone: boolean;
  onStation: (id: string) => void;
  onPuzzle: (id: "poster" | "drawer" | "terminal" | "books") => void;
  onLamp: () => void;
  onCeiling: () => void;
  onCord: () => void;
}) {
  const atPosters = at === "posters";
  const atSide = at === "side";
  const atDesk = at === "desk";
  const atWindow = at === "window";

  return (
    <svg
      className="xw-svg"
      viewBox={`0 0 ${BEDROOM.w} ${BEDROOM.h}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Shell. One-point perspective, vanishing behind the bed. */}
      <g className="xw-line">
        <path d="M430 330 L1990 326 L1988 948 L432 952 Z" />
        <path d="M432 952 L2 1348" />
        <path d="M1988 948 L2398 1348" />
        <path d="M430 330 L2 140" />
        <path d="M1990 326 L2398 138" />
        <path d="M432 952 L1988 948" className="xw-thin" />
        <path d="M436 964 L1984 960" className="xw-thin" />
      </g>

      {/* Floorboards, converging on the same point the walls do. */}
      <g className="xw-line xw-thin xw-faint">
        {[-460, -240, -20, 210, 440, 670, 900].map((o, i) => (
          <path key={i} d={`M${1200 + o * 0.17} 954 L${1200 + o * 1.9} 1350`} />
        ))}
      </g>

      {/* Light, before the things it falls on. */}
      <Daylight down={blindDown} />
      <Pendant on={ceiling} onToggle={onCeiling} />

      <Window
        down={blindDown}
        atWindow={atWindow}
        onStation={onStation}
        onCord={onCord}
      />
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
      <Desk
        at={atDesk}
        onStation={onStation}
        onOpen={() => onPuzzle("terminal")}
        onBooks={() => onPuzzle("books")}
      />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
   The ceiling
   ------------------------------------------------------------------------- */

/**
 * A shade over the middle of the floor.
 *
 * Deliberately a different fitting from the case room's: a drum rather than a
 * cone, hung on a short flex. It is the same three shapes doing the lighting
 * though — a filament, a cone, and a pool where the cone lands.
 */
function Pendant({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <g className={`xw-pendant ${on ? "is-on" : ""}`}>
      <g className="xw-bulb-light">
        <path d="M1128 268 L1272 268 L1700 1350 L700 1350 Z" className="xw-bulb-cone" />
        <ellipse cx={1200} cy={1180} rx={480} ry={120} className="xw-bulb-pool" />
      </g>

      <g className="xw-line">
        <path d="M1200 140 L1200 214" className="xw-thin" />
        {/* A drum shade: an ellipse on top and the sides falling from it. */}
        <path d="M1128 224 L1136 268 L1264 268 L1272 224 Z" className="xw-solid" />
        <ellipse cx={1200} cy={224} rx={72} ry={16} className="xw-solid xw-thin" />
      </g>
      <ellipse cx={1200} cy={268} rx={64} ry={13} className="xw-bulb-core" />

      <rect
        className="xw-hit"
        x={1118}
        y={206}
        width={164}
        height={78}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      />
    </g>
  );
}

/* ---------------------------------------------------------------------------
   The window, behind the bed
   ------------------------------------------------------------------------- */

function Window({
  down,
  atWindow,
  onStation,
  onCord,
}: {
  down: boolean;
  atWindow: boolean;
  onStation: (id: string) => void;
  onCord: () => void;
}) {
  const clip = "bblind" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const g = GLASS;
  const h = down ? g.h * 0.96 : g.h * 0.08;

  const slats = [];
  for (let y = g.y + 12; y < g.y + g.h; y += 12) slats.push(y);

  return (
    <g>
      {/* The frame's fill first, so it knocks the wall out from behind the
          glass. Everything meant to be seen THROUGH the window comes after. */}
      <path d="M660 356 L1048 352 L1048 600 L660 604 Z" className="xw-line xw-solid" />

      {/* What is out there: towers taller than this one, and other people with
          the light on. */}
      <g className="xw-bed-out">
        <rect x={g.x} y={g.y} width={g.w} height={g.h} className="xw-bed-sky-fill" />
        <g className="xw-line xw-thin xw-faint">
          <path d="M688 584 L688 372 L744 372 L744 584" />
          <path d="M762 584 L762 408 L828 408 L828 584" />
          <path d="M846 584 L846 372 L898 372 L898 584" />
          <path d="M916 584 L916 430 L982 430 L982 584" />
          <path d="M998 584 L998 396 L1030 396 L1030 584" />
        </g>

        {/* Their windows. Two thirds dark, because a block where every one is
            lit is a wall of squares rather than a building at six in the
            morning. */}
        <g className="xw-city">
          {[
            [696, 392], [718, 392], [696, 420], [718, 420], [696, 448],
            [770, 424], [794, 424], [770, 452], [806, 452], [770, 480], [794, 480],
            [854, 388], [876, 388], [854, 416], [854, 444], [876, 444], [876, 472],
            [924, 446], [948, 446], [960, 446], [924, 474], [948, 474], [924, 502],
            [1004, 412], [1004, 440], [1004, 468], [1004, 496],
          ].map(([x, y], i) => (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={14}
              height={17}
              className={i % 3 === 0 ? "xw-city-lit is-warm" : "xw-city-lit"}
            />
          ))}
        </g>
      </g>

      {/* Frame and glazing bars. */}
      <g className="xw-line">
        <path d="M672 368 L1036 364 L1036 590 L672 594 Z" className="xw-thin" />
        <path d="M854 366 L854 592" />
        <path d="M672 480 L1036 477" />
      </g>

      {/* The blind. The clip is the glass and never changes; the fabric slides
          up behind it, which is what a roller blind does — the cloth winds on
          at the top rather than shrinking. */}
      <clipPath id={clip}>
        <rect x={g.x} y={g.y - 2} width={g.w} height={g.h + 2} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <g className="xw-blind" style={{ transform: `translateY(${h - g.h}px)` }}>
          <rect x={g.x} y={g.y} width={g.w} height={g.h} className="xw-blind-face" />
          <g className="xw-line xw-thin">
            {slats.map((y, i) => (
              <path key={y} d={`M${g.x + 2 + (i % 2)} ${y} L${g.x + g.w - 2 - (i % 2)} ${y}`} />
            ))}
          </g>
        </g>
      </g>
      <g className="xw-blind-rail xw-line" style={{ transform: `translateY(${h}px)` }}>
        <path d={`M${g.x} ${g.y} L${g.x + g.w} ${g.y}`} />
        <path d={`M${g.x + 4} ${g.y + 7} L${g.x + g.w - 4} ${g.y + 7}`} className="xw-thin" />
      </g>

      {/* Sill, with a depth under it. */}
      <g className="xw-line">
        <path d="M644 604 L1064 600" />
        <path d="M652 618 L1056 614" className="xw-thin" />
        <path d="M644 604 L652 618" className="xw-thin" />
      </g>

      {/* The window's own target, and then the cord ON TOP of it — SVG has no
          z-index, so a target drawn after the cord would swallow every press
          meant for the bead. */}
      <rect
        className="xw-hit"
        x={644}
        y={350}
        width={424}
        height={272}
        onClick={() => onStation("window")}
      />

      <g
        className={`xw-cord ${atWindow ? "is-live" : ""}`}
        style={{ transform: `translateY(${down ? 0 : 76}px)` }}
      >
        <path className="xw-line xw-thin" d={`M${g.x + g.w - 14} ${g.y - 2} L${g.x + g.w - 14} 556`} />
        <circle className="xw-cord-bead" cx={g.x + g.w - 14} cy={560} r={9} />
        <circle
          className="xw-hit"
          cx={g.x + g.w - 14}
          cy={560}
          r={30}
          onClick={(e) => {
            e.stopPropagation();
            onCord();
          }}
        />
      </g>
    </g>
  );
}

/**
 * The light the window lets in.
 *
 * Out of the glass and down across the bed and the floor in front of it. Drawn
 * behind everything, so the bed stands in it rather than on it.
 */
function Daylight({ down }: { down: boolean }) {
  return (
    <g className={`xw-day ${down ? "" : "is-on"}`} aria-hidden>
      <path d="M676 372 L1032 372 L1420 1350 L420 1350 Z" className="xw-day-shaft" />
      <ellipse cx={920} cy={1170} rx={430} ry={140} className="xw-day-pool" />
      <rect x={676} y={372} width={356} height={212} className="xw-day-glow" />
    </g>
  );
}

/* ---------------------------------------------------------------------------
   The left wall
   ------------------------------------------------------------------------- */

/**
 * Three posters, on the wall he wakes up facing.
 *
 * Drawn down the length of that wall rather than flat on: the left edge of
 * each one is taller than its right, because the right edge is further away.
 * That convergence is what makes them read as being ON a wall rather than
 * floating in front of one.
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
      <g className="xw-line xw-thin">
        {/* Nearest, so tallest. */}
        <path d="M74 392 L204 440 L204 690 L74 664 Z" className="xw-solid" />
        <path d="M92 440 L188 472" className="xw-faint" />
        <path d="M92 470 L166 500" className="xw-faint" />
        <path d="M92 620 L188 644" className="xw-faint" />

        {/* Furthest. */}
        <path d="M330 496 L420 528 L420 716 L330 700 Z" className="xw-solid" />
        <circle cx={376} cy={598} r={30} className="xw-faint" />
      </g>

      {/* The one that is not a poster. Middle of the wall, and the only warm
          thing on it until it is solved. */}
      <g className="xw-bed-poster-live">
        <g className="xw-line">
          <path d="M228 462 L312 494 L312 712 L228 690 Z" className="xw-solid" />
          <path d="M240 480 L302 504 L302 700 L240 682 Z" className="xw-thin xw-faint" />
        </g>
        <Hatch x={240} y={560} w={62} h={120} gap={9} className="xw-hatch xw-faint" />
        <text className="xw-bed-sum" x={272} y={532} textAnchor="middle">
          {done ? "✓" : "7 × 8"}
        </text>
      </g>

      <rect
        className="xw-hit"
        x={66}
        y={384}
        width={366}
        height={344}
        onClick={at ? onOpen : () => onStation("posters")}
      />
    </g>
  );
}

/* ---------------------------------------------------------------------------
   The bed
   ------------------------------------------------------------------------- */

/**
 * Head to the wall, foot toward the reader.
 *
 * The whole piece is one trapezium and its thicknesses: the head is narrower
 * than the foot because it is further away, and every other edge follows from
 * that. Drawn flat on — which is what it was — a bed is a rectangle with a
 * pillow on it, and the room around it has nowhere to be.
 */
function Bed() {
  // The bed's sides converge, so anything drawn ON it has to converge too. One
  // fraction across the width gives the head point and the foot point, and the
  // line between them is a fold running away from the reader.
  const along = (t: number) => ({
    hx: 604 + t * 440,
    fx: 500 + t * 650,
  });

  return (
    <g className="xw-line">
      {/*
        Headboard: a slatted panel, and a low one.

        What it replaced was a 140-deep slab that started at y566 — above the
        window's sill — so the one thing in the room worth looking out of was
        boarded up by the furniture in front of it. It is 94 now and it starts
        under the sill, which is the whole reason a headboard is a headboard
        rather than a wall.
      */}
      <path d="M598 616 L1046 612 L1046 706 L598 710 Z" className="xw-solid" />
      <path d="M1046 612 L1070 600 L1070 694 L1046 706 Z" className="xw-solid" />
      <path d="M598 616 L622 604 L1070 600 L1046 612 Z" className="xw-solid" />
      <path d="M610 628 L1034 624" className="xw-thin xw-faint" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={i}
          d={`M${644 + i * 72} 628 L${644 + i * 72} 702`}
          className="xw-thin xw-faint"
        />
      ))}

      {/* The mattress: narrower at the head, wider at the foot. Both side
          faces, not just the near one — the far side is what tells you the
          thing has a width rather than an edge. */}
      <path d="M604 706 L1044 702 L1150 942 L500 948 Z" className="xw-solid" />
      <path d="M500 948 L1150 942 L1150 990 L500 996 Z" className="xw-solid" />
      <path d="M604 706 L500 948 L500 996 L604 754 Z" className="xw-solid" />
      <path d="M1044 702 L1150 942 L1150 990 L1044 750 Z" className="xw-solid" />

      {/* The frame under it, and four feet. A mattress straight onto the floor
          is a mattress on the floor. Drawn before the bedding, because the
          bedding hangs in front of it. */}
      <path d="M504 992 L1146 986 L1146 1022 L504 1028 Z" className="xw-thin xw-solid" />
      <path d="M522 1028 L522 1072" />
      <path d="M534 1027 L534 1068" className="xw-thin xw-faint" />
      <path d="M1128 1022 L1128 1064" />
      <path d="M1116 1023 L1116 1061" className="xw-thin xw-faint" />

      {/*
        The duvet.

        The thing the last version was missing entirely: it had a mattress with
        two faint lines ruled across it, which from the door reads as a table.
        A duvet is a separate object that sits ON the mattress and hangs OVER
        it, so it is drawn as one — wider than what it covers at every edge,
        and with its own thickness down the foot and both sides.
      */}
      <path d="M562 780 L1088 776 L1166 944 L484 950 Z" className="xw-solid" />
      <path d="M484 950 L1166 944 L1166 986 L484 992 Z" className="xw-solid" />
      <path d="M562 780 L484 950 L484 992 L562 822 Z" className="xw-solid" />
      <path d="M1088 776 L1166 944 L1166 986 L1088 818 Z" className="xw-solid" />

      {/* Turned back at the head, and two folds running down the LENGTH with
          the taper. Across the width they would contradict the perspective
          every other line in the room is drawn in. */}
      <path d="M572 800 L1078 796 L1094 850 L556 854 Z" className="xw-thin xw-faint" />
      <path d="M580 818 L1086 814" className="xw-thin xw-faint" />
      {[0.33, 0.66].map((t) => {
        const { hx, fx } = along(t);
        // Started below the turn-back, because a fold that runs under the
        // sheet is a line drawn through a thing rather than on it.
        const x0 = hx + ((854 - 705) / 241) * (fx - hx);
        return (
          <path key={t} d={`M${Math.round(x0)} 854 L${fx} 944`} className="xw-thin xw-faint" />
        );
      })}

      {/* Two pillows, propped against the headboard rather than lying flat —
          which is the difference between a made bed and a shop display. */}
      <path d="M630 712 L822 709 L804 774 L602 777 Z" className="xw-thin xw-solid" />
      <path d="M642 726 L812 723" className="xw-thin xw-faint" />
      <path d="M842 709 L1024 706 L1048 774 L826 777 Z" className="xw-thin xw-solid" />
      <path d="M856 723 L1016 720" className="xw-thin xw-faint" />

      {/* And the shadow it sits in. */}
      <Hatch x={528} y={1028} w={600} h={34} gap={13} className="xw-hatch xw-faint" />
    </g>
  );
}

/* ---------------------------------------------------------------------------
   Beside the bed
   ------------------------------------------------------------------------- */

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
          <path d="M1204 704 L1302 704 L1394 906 L1114 906 Z" className="xw-lamp-cone" />
          <ellipse cx={1254} cy={902} rx={150} ry={32} className="xw-lamp-pool" />
        </g>
      </g>

      {/*
        A table rather than a box.

        What it replaced was a carcass: one cube, floor to top, with two drawer
        faces cut into it. Beside a bed on legs it read as a filing cabinet
        somebody had left in a bedroom. This is the piece it should have been —
        a top that overhangs, one drawer in an apron under it, an open shelf,
        and four legs that are actually visible.
      */}
      <g className="xw-line">
        {/* Top, overhanging the frame on every side. */}
        <path d="M1166 888 L1222 860 L1390 856 L1334 884 Z" className="xw-solid" />
        <path d="M1166 888 L1334 884 L1334 906 L1166 910 Z" className="xw-solid" />
        <path d="M1334 884 L1390 856 L1390 878 L1334 906 Z" className="xw-solid" />

        {/* The apron the drawer sits in, set back from the top's edge. */}
        <path d="M1180 910 L1326 906 L1326 992 L1180 996 Z" className="xw-solid" />
        <path d="M1326 906 L1374 882 L1374 968 L1326 992 Z" className="xw-solid" />

        {/* An open shelf under it, and something left on it. */}
        <path d="M1182 1032 L1324 1028 L1324 1044 L1182 1048 Z" className="xw-thin xw-solid" />
        <path d="M1324 1028 L1370 1006 L1370 1022 L1324 1044 Z" className="xw-thin xw-solid" />
        <path d="M1222 1010 L1300 1008 L1300 1030 L1222 1032 Z" className="xw-thin xw-solid" />
        <path d="M1228 1016 L1294 1014" className="xw-thin xw-faint" />

        {/* Four legs, tapering and splayed a little. The back pair is short
            because the shelf and the apron cover most of them. */}
        <path d="M1186 996 L1178 1104" />
        <path d="M1198 996 L1194 1100" className="xw-thin xw-faint" />
        <path d="M1318 992 L1326 1094" />
        <path d="M1306 993 L1312 1092" className="xw-thin xw-faint" />
        <path d="M1364 968 L1370 1062" className="xw-thin xw-faint" />
        <path d="M1234 982 L1230 1066" className="xw-thin xw-faint" />
      </g>

      {/* The drawer. Shut it is a face; open it is the same face further out
          with a cavity behind it. */}
      <g className={`xw-bed-drawer ${open ? "is-open" : ""}`}>
        {open ? (
          <g className="xw-line">
            <path d="M1190 920 L1318 917 L1318 982 L1190 985 Z" className="xw-thin xw-faint" />
            <Hatch x={1192} y={922} w={124} h={58} gap={10} className="xw-hatch xw-faint" />
            <path d="M1210 938 L1298 936 L1300 972 L1212 974 Z" className="xw-thin xw-solid" />
            <path d="M1220 948 L1288 946" className="xw-thin xw-faint" />
          </g>
        ) : null}

        <g className="xw-line xw-bed-drawer-face">
          <path d="M1182 918 L1324 914 L1324 988 L1182 992 Z" className="xw-solid" />
          {/* A pull rather than two scratches: a bar on two posts. */}
          <path d="M1226 946 L1280 945" />
          <path d="M1228 946 L1228 954" className="xw-thin" />
          <path d="M1278 945 L1278 953" className="xw-thin" />
        </g>
      </g>

      {/* The lamp itself, after its own light. A drum on a slim stem with a
          weighted base — the shade reads as round because it is closed top and
          bottom with an ellipse rather than being a flat trapezium. */}
      <g className={`xw-lamp ${lamp ? "is-on" : ""}`}>
        <g className="xw-line">
          <path d="M1186 706 L1300 704 L1312 764 L1174 766 Z" className="xw-solid" />
          <ellipse cx={1243} cy={765} rx={69} ry={12} className="xw-solid xw-thin" />
          <ellipse cx={1243} cy={705} rx={57} ry={9} className="xw-thin" />
          <path d="M1240 766 L1240 858" />
          <path d="M1248 766 L1248 858" className="xw-thin xw-faint" />
          <ellipse cx={1244} cy={862} rx={38} ry={10} className="xw-solid xw-thin" />
          <path d="M1206 862 L1206 872" className="xw-thin" />
          <path d="M1282 862 L1282 872" className="xw-thin" />
          <path d="M1206 872 Q1244 884 1282 872" className="xw-thin" />
        </g>
        <circle cx={1243} cy={748} r={9} className="xw-lamp-core" />
        <rect
          className="xw-hit"
          x={1170}
          y={698}
          width={148}
          height={74}
          onClick={(e) => {
            e.stopPropagation();
            onLamp();
          }}
        />
      </g>

      <rect
        className="xw-hit"
        x={1168}
        y={858}
        width={224}
        height={216}
        onClick={at ? onOpen : () => onStation("side")}
      />
    </g>
  );
}

/* ---------------------------------------------------------------------------
   The desk
   ------------------------------------------------------------------------- */

/**
 * A slim desk, a wide screen on a single blade, and books on a shelf over it.
 *
 * Different from both of the case room's machines on purpose. That room has a
 * chassis under a panel; this is one wide screen on a blade, which is what
 * somebody's own desk at home looks like — and it leaves the wall above it
 * free for the shelf.
 */
function Desk({
  at,
  onStation,
  onOpen,
  onBooks,
}: {
  at: boolean;
  onStation: (id: string) => void;
  onOpen: () => void;
  onBooks: () => void;
}) {
  return (
    <g>
      {/* Books, on a shelf above the desk. The one thing in this room that
          opens on a plain click. */}
      <g className="xw-bed-books">
        <g className="xw-line">
          <path d="M1528 520 L1878 516 L1878 542 L1528 546 Z" className="xw-solid" />
          <path d="M1878 516 L1910 500 L1910 526 L1878 542 Z" className="xw-solid" />
          <path d="M1528 520 L1560 504 L1910 500 L1878 516 Z" className="xw-solid" />
          {[
            [1544, 0], [1562, -1.5], [1580, 0], [1598, 2], [1616, 0],
            [1642, -3], [1660, 0], [1678, 1.5], [1696, 0],
          ].map(([x, tilt], i) => (
            <path
              key={i}
              d={`M${x} 520 L${x + 14} 520 L${x + 14} ${438 + (i % 3) * 10} L${x} ${438 + (i % 3) * 10} Z`}
              className="xw-thin"
              transform={`rotate(${tilt} ${x + 7} 520)`}
            />
          ))}
          {/* A few laid flat on the end. */}
          <path d="M1766 520 L1856 519 L1856 506 L1766 507 Z" className="xw-thin" />
          <path d="M1770 506 L1852 505 L1852 494 L1770 495 Z" className="xw-thin" />
        </g>
        <rect
          className="xw-hit"
          x={1524}
          y={432}
          width={392}
          height={118}
          onClick={(e) => {
            e.stopPropagation();
            onBooks();
          }}
        />
      </g>

      <g className="xw-line">
        {/* A thin top on two blades. */}
        <path d="M1520 792 L1902 788 L1948 852 L1478 858 Z" className="xw-solid" />
        <path d="M1478 858 L1948 852 L1948 872 L1478 878 Z" className="xw-solid" />
        <path d="M1506 878 L1540 878 L1548 1084 L1514 1084 Z" className="xw-solid" />
        <path d="M1540 878 L1562 866 L1570 1072 L1548 1084 Z" className="xw-solid" />
        <path d="M1888 872 L1922 872 L1914 1076 L1880 1076 Z" className="xw-solid" />
        <path d="M1888 872 L1866 860 L1858 1064 L1880 1076 Z" className="xw-solid" />
      </g>

      {/* The machine: one wide screen on a single blade. */}
      <g className="xw-bed-term">
        <g className="xw-line">
          <path d="M1552 620 L1876 616 L1878 764 L1550 768 Z" className="xw-solid" />
          <path d="M1876 616 L1892 608 L1894 756 L1878 764 Z" className="xw-solid" />
          <path d="M1552 620 L1568 612 L1892 608 L1876 616 Z" className="xw-solid" />
          <path d="M1562 630 L1866 626 L1868 752 L1560 756 Z" className="xw-thin" />
          {/* Blade and foot. */}
          <path d="M1700 768 L1700 812" />
          <path d="M1728 768 L1728 812" />
          <ellipse cx={1714} cy={818} rx={74} ry={13} className="xw-solid xw-thin" />
        </g>

        {/* What is on the glass. */}
        <g className="xw-bed-term-glow">
          <path d="M1582 656 L1650 655" className="xw-line xw-thin" />
          <path d="M1582 678 L1722 676" className="xw-line xw-thin" />
          <path d="M1582 700 L1664 699" className="xw-line xw-thin" />
          <path d="M1582 722 L1706 721" className="xw-line xw-thin" />
          <rect className="xw-bed-term-caret" x={1582} y={738} width={16} height={14} />
        </g>

        {/* A low board in front of it. */}
        <g className="xw-line">
          <path d="M1592 812 L1804 808 L1816 842 L1600 846 Z" className="xw-thin xw-solid" />
          <path d="M1600 846 L1816 842 L1816 854 L1600 858 Z" className="xw-thin xw-solid" />
          <path d="M1610 822 L1792 819" className="xw-thin xw-faint" />
          <path d="M1614 832 L1766 829" className="xw-thin xw-faint" />
        </g>
      </g>

      <rect
        className="xw-hit"
        x={1470}
        y={598}
        width={490}
        height={300}
        onClick={at ? onOpen : () => onStation("desk")}
      />
    </g>
  );
}
