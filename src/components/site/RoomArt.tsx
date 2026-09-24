"use client";

import { useId } from "react";
import { FILES, WINDOW_GLASS, WORLD, blindHeight, isUnlocked, type CaseFile } from "@/lib/world";

/**
 * The room, as a drawing.
 *
 * Split out of World so that the thing on screen and the machinery driving it
 * are not one twelve-hundred-line file, and so the drawing can be rendered on
 * its own — scripts/render-room.ts puts it through react-dom/server and out to
 * a PNG, which is the only way to actually LOOK at a room that otherwise only
 * exists behind a click.
 *
 * Nothing in here is filled except where something has to occlude what is
 * behind it. It is strokes, hatching and the small overshoot a pen leaves at a
 * corner, which is what makes it read as drawn rather than rendered — and is
 * also why a camera can fly over it for nothing.
 *
 * Every object takes its meaning from where the camera is standing: the same
 * click walks you over from across the room and opens the thing once you are
 * in front of it. That rule is why `at` is passed down rather than a pile of
 * booleans decided further up.
 */

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

export function Room({
  read,
  at,
  blindDown,
  ceiling,
  lamp,
  taken,
  onStation,
  onFile,
  onBoard,
  onDesk,
  onCord,
  onCeiling,
  onLamp,
}: {
  read: string[];
  /** Where the camera is parked. Decides what a click on a thing MEANS. */
  at: string | null;
  blindDown: boolean;
  ceiling: boolean;
  lamp: boolean;
  /** The id of the file that is currently out of the row, if any. Its spine
   *  is not drawn: the book on screen IS that spine. */
  taken: string | null;
  onStation: (id: string) => void;
  onFile: (file: CaseFile) => void;
  onBoard: () => void;
  onDesk: () => void;
  onCord: () => void;
  onCeiling: () => void;
  onLamp: () => void;
}) {
  const atBoard = at === "board";
  const atWindow = at === "window";
  const atDesk = at === "desk";
  const atShelf = at === "shelf";

  return (
    <svg
      className="xw-svg"
      viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Shell: back wall, floor, side walls, ceiling. One-point perspective
          with the vanishing point behind the shelf. */}
      <g className="xw-line">
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

      {/* Daylight, before anything it falls on. A slab of light from the
          window across the floor, clipped to nothing while the blind is down. */}
      <Daylight down={blindDown} />

      <Ceiling on={ceiling} onToggle={onCeiling} />
      <BoardWall atBoard={atBoard} onStation={onStation} onOpen={onBoard} />
      <Window
        down={blindDown}
        atWindow={atWindow}
        onStation={onStation}
        onCord={onCord}
      />
      <Clock />
      <Shelf
        read={read}
        atShelf={atShelf}
        taken={taken}
        onStation={onStation}
        onFile={onFile}
      />

      <Desk
        atDesk={atDesk}
        lamp={lamp}
        onStation={onStation}
        onOpen={onDesk}
        onLamp={onLamp}
      />
      <Cabinet />
      <CoatStand />
    </svg>
  );
}

/**
 * The fitting hanging over the desk, and what it throws.
 *
 * The light is three shapes stacked and nothing else: a filament in the shade,
 * a cone under it, and a pool where the cone lands. Every one of them is
 * filled with `var(--xw-bulb)`, a custom property set once on the room, so
 * changing the bulb colour is one string changing on one element and none of
 * these shapes needs to know it happened.
 *
 * The cone is a flat polygon rather than a gradient because the whole room is
 * flat ink — a soft volumetric falloff in here would be the one thing in the
 * drawing pretending to be lit rather than drawn.
 */
function Ceiling({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <g className={`xw-pendant ${on ? "is-on" : ""}`}>
      {/* What it throws. Before the fitting, so the shade covers the top of
          the cone instead of the cone washing over the shade. */}
      <g className="xw-bulb-light">
        {/* Wide, and all the way to the bottom of the frame. A narrow cone
            stopping at the skirting is a searchlight; a ceiling fitting fills
            the room it is hanging in. Everything solid in the room is drawn
            after this and punches its own shadow out of it. */}
        <path d="M1160 236 L1240 236 L1760 1350 L640 1350 Z" className="xw-bulb-cone" />
        <ellipse cx={1200} cy={1210} rx={560} ry={130} className="xw-bulb-pool" />
      </g>

      <g className="xw-line">
        <path d="M1200 88 L1200 196" className="xw-thin" />
        <path d="M1148 200 L1252 200" />
        <path d="M1148 200 L1176 238 L1224 238 L1252 200" />
      </g>

      {/* The filament, which is the only part that is actually the bulb. */}
      <circle cx={1200} cy={244} r={11} className="xw-bulb-core" />

      <g className="xw-line xw-glow">
        <path d="M1176 240 L1112 330" className="xw-thin" />
        <path d="M1224 240 L1288 330" className="xw-thin" />
      </g>

      <rect
        className="xw-hit"
        x={1132}
        y={184}
        width={136}
        height={80}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      />
    </g>
  );
}

/**
 * The pinned board, on the left wall, in perspective.
 *
 * One target, two meanings, decided by where the camera already is. From
 * across the room it walks you over; from in front of it, it takes the board
 * down and puts it full screen. The same rule the shelf uses, and for the same
 * reason: a board that goes full screen the instant somebody clicks the far
 * wall is not a room, it is a menu.
 */
function BoardWall({
  atBoard,
  onStation,
  onOpen,
}: {
  atBoard: boolean;
  onStation: (id: string) => void;
  onOpen: () => void;
}) {
  return (
    <g>
      <g className="xw-line">
        {/* The face of the board, and the frame standing off the wall behind
            it. A pinboard is a slab hung on a wall, so it has a visible edge
            all the way round — and on a wall seen this obliquely that edge is
            most of what says the board is not painted on. */}
        <path d="M70 300 L470 388 L470 800 L70 772 Z" className="xw-solid" />
        {/* The frame's own thickness: the same quad, pushed back to the wall. */}
        <path d="M94 318 L470 400 L470 788 L94 758 Z" className="xw-thin xw-faint" />
        <path d="M70 300 L94 318" className="xw-thin" />
        <path d="M70 772 L94 758" className="xw-thin" />
        {/* The cork inside the frame. */}
        <path d="M100 338 L440 412 L440 766 L100 742 Z" className="xw-thin xw-faint" />

        {/* Pinned scraps. Each one is a quad and each one at its own angle,
            and each gets a curled corner so it reads as paper rather than as
            a hole in the board. */}
        <path d="M124 380 L226 402 L222 496 L120 478 Z" className="xw-thin" />
        <path d="M226 402 L214 414 L222 420" className="xw-thin xw-faint" />
        <path d="M262 414 L356 434 L350 524 L256 508 Z" className="xw-thin" />
        <path d="M386 446 L432 456 L428 540 L382 532 Z" className="xw-thin" />
        <path d="M128 546 L232 566 L228 664 L124 648 Z" className="xw-thin" />
        <path d="M232 566 L220 578 L228 584" className="xw-thin xw-faint" />
        <path d="M268 574 L378 596 L372 694 L262 676 Z" className="xw-thin" />

        {/* String between them, and a pin at each turn. */}
        <g className="xw-hot-line">
          <path d="M174 424 L306 462 L408 486 L296 612 L176 592 Z" />
        </g>
        <g className="xw-fill xw-glow">
          <circle cx={174} cy={424} r={5} />
          <circle cx={306} cy={462} r={5} />
          <circle cx={408} cy={486} r={5} />
          <circle cx={296} cy={612} r={5} />
          <circle cx={176} cy={592} r={5} />
        </g>
      </g>
      <Hatch x={100} y={700} w={340} h={64} gap={13} className="xw-hatch xw-faint" />
      <rect
        className="xw-hit"
        x={64}
        y={294}
        width={412}
        height={512}
        // One click, wherever it is made from. Clicking a thing is using the
        // thing; walking to it and then having to click it again was a step
        // that only ever existed because the camera got there first.
        onClick={onOpen}
      />
    </g>
  );
}

/**
 * The window, its blind, and the cord that works it.
 *
 * The blind is one rect whose height is the only thing that changes, with a
 * CSS transition on it, and the slats are clipped to that rect so they roll up
 * with it instead of sliding out from underneath. The cord is two lines and a
 * bead, and it is what the click is actually on: pulling a cord and having a
 * blind go up is a mechanism, whereas clicking a blind and having it go up is
 * a button that happens to look like a blind.
 */
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
  const clip = "xw-blind-clip" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const g = WINDOW_GLASS;
  const h = blindHeight(down);
  // The slats are drawn for the full drop once and clipped; which of them you
  // can see is the whole animation.
  const slats = [];
  for (let y = g.y + 14; y < g.y + g.h; y += 13) slats.push(y);

  return (
    <g>
      {/* The frame's own fill, FIRST. It is the page colour, so it knocks the
          wall out from behind the glass — which is also why everything that is
          supposed to be seen through the window has to come after it. Drawing
          the view first, as this once did, paints the whole street out again. */}
      <path d="M596 368 L906 366 L906 652 L596 654 Z" className="xw-line xw-solid" />

      {/* What is out there, seen once the blind is off it. Hatching for the
          night behind it, then a skyline, one window still lit, and a moon. */}
      <g className={`xw-outside ${down ? "" : "is-open"}`}>
        <Hatch x={610} y={514} w={286} h={128} gap={9} className="xw-hatch xw-faint" />
        <g className="xw-line xw-thin xw-faint">
          <path d="M612 600 L612 540 L660 540 L660 600" />
          <path d="M676 600 L676 505 L734 505 L734 600" />
          <path d="M748 600 L748 556 L800 556 L800 600" />
          <path d="M818 600 L818 520 L884 520 L884 600" />
        </g>

        {/* The lit windows.
            A city at night is not a silhouette, it is a grid of other people's
            rooms with the light on — and it is also where the light coming in
            through this window has to come FROM. Two thirds of them are dark,
            because a block where every window is lit reads as a wall of
            squares rather than as a building at three in the morning. */}
        <g className="xw-city">
          {[
            [620, 552], [640, 552], [620, 574], [648, 574],
            [684, 517], [706, 517], [684, 542], [712, 542], [690, 566], [712, 566],
            [756, 568], [778, 568], [756, 586],
            [826, 532], [850, 532], [864, 532], [826, 556], [850, 556],
            [838, 578], [864, 578],
          ].map(([x, y], i) => (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={13}
              height={15}
              className={i % 3 === 0 ? "xw-city-lit is-warm" : "xw-city-lit"}
            />
          ))}
        </g>

        <circle cx={846} cy={410} r={17} className="xw-line xw-thin" />
      </g>

      <g className="xw-line">
        <path d="M606 378 L896 376 L896 642 L606 644 Z" className="xw-thin" />
        {/* Mullions. */}
        <path d="M751 376 L751 643" />
        <path d="M606 510 L896 509" />
      </g>

      {/* The blind.
          The clip is the GLASS and never changes; what moves is the fabric,
          slid up behind it, which is what a roller blind actually does — the
          cloth winds onto the roller at the top rather than shrinking. Doing it
          this way also means the animation is a transform, which every browser
          composites, rather than an animated clip height, which is a geometry
          property and not reliably transitionable. */}
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
      {/* The bottom rail, which rides on the blind rather than being clipped by
          it — a rail clipped to its own blind would be shaved in half. */}
      <g
        className="xw-blind-rail xw-line"
        style={{ transform: `translateY(${h}px)` }}
      >
        <path d={`M${g.x} ${g.y} L${g.x + g.w} ${g.y}`} />
        <path d={`M${g.x + 4} ${g.y + 7} L${g.x + g.w - 4} ${g.y + 7}`} className="xw-thin" />
      </g>

      <g className="xw-line">
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

      {/* The cord, and it has to come AFTER the window's own target.
          SVG has no z-index — the last thing drawn is the thing on top, and it
          is also the thing that gets the click. With the cord above this rect
          the bead sat under a 340x310 target that swallowed every press on it,
          which is exactly what "the blind does not open" looks like from the
          outside.

          Drawn once at its short length; the whole group translates down when
          the blind goes up, because that is where the slack goes. A translate
          rather than a longer line, because the `d` of a path is not something
          a browser will reliably transition. */}
      <g
        className={`xw-cord ${atWindow ? "is-live" : ""}`}
        style={{ transform: `translateY(${down ? 0 : 90}px)` }}
      >
        <path className="xw-line xw-thin" d={`M${g.x + g.w - 16} ${g.y - 2} L${g.x + g.w - 16} 600`} />
        <circle className="xw-cord-bead" cx={g.x + g.w - 16} cy={604} r={9} />
        <circle
          className="xw-hit"
          cx={g.x + g.w - 16}
          cy={604}
          r={32}
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
 * One slab from the glass across the floor, drawn behind everything so the
 * furniture stands in it rather than on it. Its opacity is the only thing the
 * cord changes, which means the whole lighting change is one CSS transition
 * rather than a second drawing of the room.
 *
 * There was a second wash on the back wall and it is gone: a rectangle of flat
 * tint has a hard vertical edge down the middle of the room, and a hard edge is
 * the one thing light does not have. The beam works because it is the shape a
 * beam is.
 */
function Daylight({ down }: { down: boolean }) {
  return (
    <g className={`xw-day ${down ? "" : "is-on"}`} aria-hidden>
      {/* The slab through the glass and across the floor. */}
      <path d="M606 376 L896 376 L1490 1350 L360 1350 Z" className="xw-day-shaft" />
      {/* And the pool where it lands, which is what makes it read as light
          arriving rather than as a wedge drawn over the floorboards. */}
      <ellipse cx={880} cy={1180} rx={430} ry={150} className="xw-day-pool" />
      {/* A bloom on the glass itself. The light in this room at night comes
          out of other people's windows, so it has to be brightest at the one
          it is coming through. */}
      <rect x={606} y={376} width={290} height={268} className="xw-day-glow" />
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
  read,
  atShelf,
  taken,
  onStation,
  onFile,
}: {
  read: string[];
  atShelf: boolean;
  taken: string | null;
  onStation: (id: string) => void;
  onFile: (file: CaseFile) => void;
}) {
  return (
    <g className={`xw-shelf ${atShelf ? "is-near" : ""}`}>
      <g className="xw-line">
        {/* The opening, and the box behind it.

            A shelf is a cavity, so the depth has to be on the INSIDE: the
            front frame, a smaller back plane, and the four corners joined.
            Standing left of it we see its left inner cheek and the underside
            of nothing, which is exactly the four lines below. Drawn as a
            recess rather than as a rectangle with a line across it, the thing
            stops being a picture of a shelf and becomes one. */}
        <path d="M1150 422 L1950 418 L1950 862 L1150 866 Z" className="xw-solid" />
        {/* The back plane, pulled in toward the room's centre. */}
        <path d="M1196 452 L1904 449 L1904 832 L1196 836 Z" className="xw-thin xw-faint" />
        {/* The four inside corners. Only the left cheek gets a full-weight
            line: it is the one actually turned toward us. */}
        <path d="M1150 422 L1196 452" className="xw-thin" />
        <path d="M1150 866 L1196 836" className="xw-thin" />
        <path d="M1950 418 L1904 449" className="xw-thin xw-faint" />
        <path d="M1950 862 L1904 832" className="xw-thin xw-faint" />

        {/* The middle board, with a thickness and a top surface running back
            to the cavity wall. */}
        <path d="M1152 676 L1948 672" />
        <path d="M1156 688 L1944 684" className="xw-thin" />
        <path d="M1152 676 L1196 662" className="xw-thin" />
        <path d="M1196 662 L1904 659" className="xw-thin xw-faint" />
        <path d="M1948 672 L1904 659" className="xw-thin xw-faint" />

        {/* The bottom board, same treatment. */}
        <path d="M1152 862 L1948 858" />
        <path d="M1152 862 L1196 836" className="xw-thin" />
        <path d="M1196 836 L1904 832" className="xw-thin xw-faint" />

        {/* Uprights, and the little overshoot a pen leaves at a corner. */}
        <path d="M1150 414 L1150 872" className="xw-thin" />
        <path d="M1950 410 L1950 868" className="xw-thin" />
      </g>

      {/* The shadow inside the cavity. Before the contents, or the hatching
          crosses the things standing in it. */}
      <Hatch x={1156} y={690} w={790} h={160} gap={16} className="xw-hatch xw-faint" />

      {/* The files, standing on the upper board. */}
      {FILES.map((f) => {
        const done = read.includes(f.id);
        const locked = !isUnlocked(f, read);
        const { x, y, w, h, tilt } = f.spine;
        return (
          <g
            key={f.id}
            className={`xw-file ${done ? "is-done" : ""} ${locked ? "is-locked" : ""}`}
            // The lean, and nothing else. The pull lives on the group inside,
            // because a CSS transform REPLACES an element's transform
            // attribute rather than composing with it — put both on one
            // element and a file snaps upright the instant it is picked.
            transform={`rotate(${tilt} ${x + w / 2} ${y + h})`}
          >
            {/* Hidden outright while the book is out, not animated out of the
                row. The animation moved to ShelfBook, which starts at exactly
                this spine's position on screen — so there is nothing here to
                perform, only a gap to leave where the file used to be. */}
            <g className={`xw-file-body ${taken === f.id ? "is-out" : ""}`}>
            <g className="xw-line">
              <path d={`M${x} ${y} L${x + w} ${y - 2} L${x + w} ${y + h} L${x} ${y + h} Z`} className="xw-solid" />
              {/* The label block down the spine.
                  Taller than it was at both ends, because the number and the
                  name have to live INSIDE it — the old block stopped 26 units
                  short of the foot while the name ran to 14, so every label
                  crossed its own border on the way down. */}
              <path
                d={`M${x + 7} ${y + 16} L${x + w - 7} ${y + 14} L${x + w - 7} ${y + h - 14} L${x + 7} ${y + h - 12} Z`}
                className="xw-thin"
              />
              {/* Two ring-binder clips, because a file has them. */}
              <path d={`M${x} ${y + h - 64} L${x + 9} ${y + h - 64}`} className="xw-thin" />
              <path d={`M${x} ${y + h - 44} L${x + 9} ${y + h - 44}`} className="xw-thin" />
            </g>
            <text
              className="xw-file-index"
              x={x + w / 2}
              y={y + 40}
              textAnchor="middle"
            >
              {f.index}
            </text>
            {/* Every name set to the same block: from just under the number to
                the foot of the spine, whatever it says.

                Two things do that together, because neither is enough alone.
                The size comes down for a long name — CERTIFICATIONS at the
                stylesheet's 14px runs up through its own number and out of the
                top of the file, and shortening the name to fit is the drawing
                telling the content what it is allowed to be called. Then
                textLength with `spacing` opens the tracking back out to fill
                the block, so a short name is not left floating at the bottom.
                `spacing` rather than `spacingAndGlyphs`, so the letterforms
                stay the shape they were drawn and only the gaps give. */}
            <text
              className="xw-file-name"
              transform={`translate(${x + w / 2} ${y + h - 24}) rotate(-90)`}
              // An inline style and not a fontSize attribute: the stylesheet
              // sets a size on .xw-file-name, and any CSS rule beats a
              // presentation attribute, so the attribute version of this line
              // is silently ignored and the long name still overflows.
              style={{ fontSize: Math.min(13, (h - 82) / (f.name.length * 0.78)) }}
              textLength={h - 82}
              lengthAdjust="spacing"
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
          </g>
        );
      })}

      {/* Clutter, so the shelf is a shelf and not a rack of six files. It
          starts to the right of the last spine, which is why these numbers
          moved when the shelf went from four files to six. */}
      <g className="xw-line">
        <path d="M1700 498 L1782 496 L1782 674 L1700 676 Z" className="xw-solid" />
        <path d="M1710 520 L1772 518" className="xw-thin" />
        <path d="M1710 536 L1772 534" className="xw-thin" />
        <path d="M1798 560 L1844 558 L1856 674 L1798 674 Z" className="xw-thin xw-solid" />
        {/* A leaning ledger. */}
        <path d="M1872 540 L1914 532 L1936 672 L1880 674 Z" className="xw-solid" />
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

/**
 * The desk, and the machine somebody left running on it.
 *
 * The monitor is drawn as a CRT because a flat panel in a room drawn this way
 * would have to be two rectangles and would read as a picture frame. The
 * scanline across the glass is the only animated thing in the whole drawing,
 * and it is there to say the machine is on before anybody clicks it.
 */
function Desk({
  atDesk,
  lamp,
  onStation,
  onOpen,
  onLamp,
}: {
  atDesk: boolean;
  lamp: boolean;
  onStation: (id: string) => void;
  onOpen: () => void;
  onLamp: () => void;
}) {
  return (
    <g>
      <g className="xw-line">
        {/* Top, in perspective: narrower at the back, and with a real edge
            under it rather than a line pretending to be one. */}
        <path d="M812 872 L1468 870 L1596 1004 L690 1008 Z" className="xw-solid" />
        <path d="M690 1008 L1596 1004 L1596 1042 L690 1046 Z" className="xw-solid" />
        {/* The lip under the front edge, so the top has a thickness you can
            see the underside of. */}
        <path d="M694 1046 L1592 1042" className="xw-thin xw-faint" />

        {/* Legs, as boxes. Two faces each: the one facing us and the one
            turned inward, which is the whole difference between a leg and a
            line drawn where a leg would be. */}
        <path d="M700 1046 L728 1046 L734 1262 L706 1262 Z" className="xw-solid" />
        <path d="M728 1046 L748 1034 L754 1250 L734 1262 Z" className="xw-solid" />
        <path d="M1556 1042 L1584 1042 L1576 1258 L1548 1258 Z" className="xw-solid" />
        <path d="M1556 1042 L1536 1030 L1528 1246 L1548 1258 Z" className="xw-solid" />

        {/* The back edge of the top, seen because the desk sits below eye
            level — and the right return, which is the side of the slab. */}
        <path d="M1468 870 L1596 1004" className="xw-thin xw-faint" />
        <path d="M842 886 L846 1010" className="xw-thin xw-faint" />

        {/* Modesty panel, set back from the front edge. */}
        <path d="M860 1050 L1430 1046" className="xw-thin xw-faint" />
        <path d="M872 1062 L1418 1058" className="xw-thin xw-faint" />

        {/* Papers, a mug, a phone off its cradle. */}
        <path d="M1372 928 L1468 926 L1470 958 L1374 960 Z" className="xw-thin xw-solid" />
        <path d="M1258 908 L1310 906 L1314 956 L1262 958 Z" className="xw-solid" />
        <path d="M1314 918 Q1338 930 1314 944" className="xw-thin" />
      </g>

      {/* The lamp, and the only warm thing on this desk.
          Drawn after the desk so its pool lands ON the surface, and BEFORE the
          machine, so the monitor and the keyboard standing in the cone cut
          their own shadows out of it rather than being washed over by it —
          the same occlusion rule the ceiling cone follows.

          Its own target, so that clicking the lamp is clicking the lamp rather
          than walking to the desk. A gooseneck burns tungsten and nothing
          else, so unlike the ceiling this one has no colours to choose from. */}
      <g className={`xw-lamp ${lamp ? "is-on" : ""}`}>
        <g className="xw-lamp-light">
          {/* Out of the shade, down onto the desk in front of it. */}
          <path d="M916 806 L964 828 L1128 962 L862 966 Z" className="xw-lamp-cone" />
          <ellipse cx={984} cy={946} rx={168} ry={34} className="xw-lamp-pool" />
        </g>

        <g className="xw-line">
          <path d="M872 900 L872 812" />
          <path d="M872 812 L930 786" />
          <path d="M906 760 L968 796 L936 818 Z" className="xw-solid" />
          <path d="M846 900 L900 898" />
        </g>
        <circle cx={938} cy={800} r={7} className="xw-lamp-core" />

        <rect
          className="xw-hit"
          x={890}
          y={748}
          width={92}
          height={84}
          onClick={(e) => {
            e.stopPropagation();
            onLamp();
          }}
        />
      </g>


      {/* The machine.

          An all-in-one: one wedge with the screen built into it, rather than a
          monitor balanced on a separate chassis. It is a different object, not
          a restyled one — the silhouette is a single tapering block leaning
          back from the reader, which is what a terminal of this kind actually
          looked like and reads very differently in a room of boxes.

          The wedge is the whole idea: the case is deeper at the base than at
          the top, so the side face is a trapezium rather than a rectangle and
          the machine looks like it is sitting back on its heels. */}
      <g className={`xw-crt ${atDesk ? "is-live" : ""}`}>
        <g className="xw-line">
          {/* Front, leaning back. */}
          <path d="M1004 674 L1224 670 L1240 886 L996 890 Z" className="xw-solid" />
          {/* Right side: the taper, which is the object. */}
          <path d="M1224 670 L1258 652 L1282 858 L1240 886 Z" className="xw-solid" />
          {/* The top, seen from below, so only a sliver of it. */}
          <path d="M1004 674 L1038 656 L1258 652 L1224 670 Z" className="xw-solid" />

          {/* The bezel, and the tube set back inside it. */}
          <path d="M1022 692 L1208 688 L1216 816 L1018 820 Z" className="xw-thin" />
          <path
            d="M1034 702 Q1120 697 1202 702 Q1208 754 1202 806 Q1120 811 1030 806 Q1026 754 1034 702 Z"
            className="xw-thin xw-faint"
          />

          {/* Under the screen: a drive slot, a brand rule, and vents down the
              side of the wedge where the heat actually went. */}
          <path d="M1026 846 L1112 845" className="xw-thin" />
          <path d="M1026 858 L1112 857" className="xw-thin xw-faint" />
          <path d="M1136 840 L1216 838" className="xw-thin xw-faint" />
          {/* Slots ACROSS the side face, not strokes down it. Run the other
              way and they read as scratches on the case rather than as the
              louvres the heat went out of. Each one spans the trapezium at its
              own height, so they lean with the taper. */}
          {[708, 736, 764, 792, 820].map((y) => {
            const x1 = 1226 + (y - 670) * 0.074;
            const x2 = 1256 + (y - 652) * 0.1165;
            return (
              <path key={y} d={`M${x1.toFixed(1)} ${y} L${x2.toFixed(1)} ${y - 12}`} className="xw-thin xw-faint" />
            );
          })}
        </g>
        <circle cx={1196} cy={854} r={5} className="xw-fill xw-crt-led" />

        {/* What is on the glass: a prompt, and a line sweeping down it. */}
        <g className="xw-crt-glow">
          <path d="M1050 722 L1094 721" className="xw-line xw-thin" />
          <path d="M1050 740 L1152 739" className="xw-line xw-thin" />
          <path d="M1050 758 L1112 757" className="xw-line xw-thin" />
          <rect className="xw-crt-scan" x={1032} y={702} width={168} height={4} />
        </g>

        {/* Keyboard, pulled forward and wedged the same way the case is. */}
        <g className="xw-line">
          <path d="M1006 918 L1178 915 L1192 958 L1016 962 Z" className="xw-thin xw-solid" />
          <path d="M1016 962 L1192 958 L1192 972 L1016 976 Z" className="xw-thin xw-solid" />
          <path d="M1022 930 L1168 927" className="xw-thin xw-faint" />
          <path d="M1026 941 L1172 938" className="xw-thin xw-faint" />
          <path d="M1030 952 L1140 949" className="xw-thin xw-faint" />
        </g>

        {/* The machine's own target, tight around the case and the keyboard.
            Its own rather than part of the desk's, because the desk is wide
            enough that a rectangle covering both the desk and the machine
            standing on it would also cover the bottom-left corner of the
            shelf — and a click on the shelf that walks you to the desk is the
            kind of thing that makes a room feel like it is not listening. */}
        <rect
          className="xw-hit"
          x={992}
          y={648}
          width={296}
          height={332}
          onClick={atDesk ? onOpen : () => onStation("desk")}
        />
      </g>

      <Hatch x={700} y={1012} w={890} h={40} gap={12} className="xw-hatch xw-faint" />
      {/* The desk surface, which only ever walks you over. Kept below the
          shelf carcass so the two do not fight for the same pixels. */}
      <rect
        className="xw-hit"
        x={686}
        y={868}
        width={920}
        height={192}
        onClick={atDesk ? onOpen : () => onStation("desk")}
      />
    </g>
  );
}

function Cabinet() {
  return (
    <g className="xw-line">
      {/* Front. */}
      <path d="M150 858 L352 900 L352 1268 L150 1186 Z" className="xw-solid" />
      {/* Right side, receding. */}
      <path d="M352 900 L430 872 L430 1216 L352 1268 Z" className="xw-solid" />
      {/* Top, seen from below the cabinet's height — so only a sliver. */}
      <path d="M150 858 L352 900 L430 872 L228 832 Z" className="xw-solid" />

      {/* Three drawers, each with its own face and a returned edge on the
          side panel, so the divisions carry round the corner. */}
      <path d="M150 980 L352 1022" className="xw-thin" />
      <path d="M352 1022 L430 992" className="xw-thin xw-faint" />
      <path d="M150 1102 L352 1144" className="xw-thin" />
      <path d="M352 1144 L430 1112" className="xw-thin xw-faint" />

      {/* Handles: a recessed pull, which is two lines and a shadow. */}
      <path d="M212 908 L290 924" className="xw-thin" />
      <path d="M212 916 L290 932" className="xw-thin xw-faint" />
      <path d="M212 1030 L290 1046" className="xw-thin" />
      <path d="M212 1038 L290 1054" className="xw-thin xw-faint" />
      <path d="M212 1152 L290 1168" className="xw-thin" />
      <path d="M212 1160 L290 1176" className="xw-thin xw-faint" />

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
