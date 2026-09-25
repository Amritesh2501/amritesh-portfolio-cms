/**
 * The room through the book.
 *
 * The case room is where somebody worked; this is where they live. It is the
 * second half of the same conceit — you get into it by reading the index file
 * on the shelf, the pages turn, and you come out the other side somewhere the
 * investigation cannot follow.
 *
 * Same shape as lib/world, and deliberately so: a world box, stations with a
 * camera each, and the things in the room as data rather than as coordinates
 * buried in JSX. Anything a player can get stuck behind — a station pointed at
 * nothing, a thing with no way to reach it, a lock with no key — is checked in
 * scripts/check-bedroom.ts rather than trusted, because every one of those
 * fails as somebody giving up rather than as an error anyone sees.
 */

import type { Shot } from "./world";

/** The SVG coordinate space, matched to the case room so the camera behaves
 *  identically in both and `frameFor` needs no per-room tuning. */
export const BEDROOM = { w: 2400, h: 1350 } as const;

/** The whole room, square on. Where you land, and where "the room" returns to. */
export const BED_ESTABLISH: Shot = { x: 1200, y: 690, z: 0.82 };

/**
 * Where the camera lands out of the black.
 *
 * Close on the bed, because that is what somebody coming round in a room they
 * do not recognise looks at first, and then it pulls back.
 */
export const BED_ARRIVAL: Shot = { x: 860, y: 880, z: 1.7 };

export type BedStation = {
  id: string;
  name: string;
  blurb: string;
  cam: Shot;
};

export const BED_STATIONS: BedStation[] = [
  {
    id: "posters",
    name: "The posters",
    blurb: "Pinned over the bed. One of them is not a poster.",
    cam: { x: 690, y: 452, z: 2.2 },
  },
  {
    id: "side",
    name: "The side table",
    blurb: "A drawer, and it is locked.",
    cam: { x: 1148, y: 902, z: 2.6 },
  },
  {
    id: "desk",
    name: "The desk",
    blurb: "A machine, still on, asking for something.",
    cam: { x: 1748, y: 742, z: 2.1 },
  },
  {
    id: "window",
    name: "The window",
    blurb: "It is getting light out there.",
    cam: { x: 402, y: 560, z: 2.1 },
  },
];

export const bedStationById = (id: string) => BED_STATIONS.find((s) => s.id === id);

/* ---------------------------------------------------------------------------
   What is in the room
   ------------------------------------------------------------------------- */

/**
 * The three things that hold a puzzle.
 *
 * Named here rather than in the components because the check needs them, and
 * because a puzzle that cannot be reached from any station is the exact failure
 * this file exists to make impossible.
 */
export type PuzzleId = "poster" | "drawer" | "terminal";

export type BedPuzzle = {
  id: PuzzleId;
  /** The station the camera has to be at before it can be opened. */
  at: string;
  name: string;
  /** What it is guarding, in one line, for the panel that stands in for it. */
  holds: string;
};

export const BED_PUZZLES: BedPuzzle[] = [
  {
    id: "poster",
    at: "posters",
    name: "The poster",
    holds: "A photograph of whoever this room belongs to.",
  },
  {
    id: "drawer",
    at: "side",
    name: "The drawer",
    holds: "A diary: what he does when nobody is paying him to do it.",
  },
  {
    id: "terminal",
    at: "desk",
    name: "The terminal",
    holds: "Whatever he was in the middle of.",
  },
];

export const bedPuzzleById = (id: string) => BED_PUZZLES.find((p) => p.id === id);
