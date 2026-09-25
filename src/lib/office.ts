/**
 * The room through the EXPERIENCE book.
 *
 * Where he worked, as a place. The case room is an investigation and the
 * bedroom is a person; this is the third register — an office at the end of a
 * day, with the work still on the walls.
 *
 * Same shape as lib/bedroom: a world box, stations with a camera each, and the
 * things in the room as data rather than as coordinates buried in JSX. Anything
 * a player can get stuck behind is checked in scripts/check-office.ts rather
 * than trusted.
 */

import type { Shot } from "./world";

/** Matched to the other two rooms so `frameFor` needs no per-room tuning. */
export const OFFICE = { w: 2400, h: 1350 } as const;

/** The whole floor, square on. */
export const OFFICE_ESTABLISH: Shot = { x: 1200, y: 700, z: 0.82 };

/** Where the camera lands out of the black: close on the whiteboard, where
 *  the work is, and then it pulls back to show the room it is in. */
export const OFFICE_ARRIVAL: Shot = { x: 760, y: 520, z: 1.8 };

export type OfficeStation = {
  id: string;
  name: string;
  blurb: string;
  cam: Shot;
};

export const OFFICE_STATIONS: OfficeStation[] = [
  {
    id: "board",
    name: "The whiteboard",
    blurb: "An architecture nobody has redrawn since it stopped being true.",
    cam: { x: 742, y: 508, z: 2.3 },
  },
  {
    id: "rack",
    name: "The patch panel",
    blurb: "Somebody pulled every cable out and did not label them.",
    cam: { x: 236, y: 612, z: 2.5 },
  },
  {
    id: "desk",
    name: "The desk",
    blurb: "A board of tickets, and nobody left to move them.",
    cam: { x: 1592, y: 796, z: 2.2 },
  },
  {
    id: "cabinet",
    name: "The cabinet",
    blurb: "Personnel files. His is in there.",
    cam: { x: 664, y: 842, z: 2.6 },
  },
];

export const officeStationById = (id: string) =>
  OFFICE_STATIONS.find((s) => s.id === id);

/* ---------------------------------------------------------------------------
   What is in the room
   ------------------------------------------------------------------------- */

export type OfficePuzzleId = "wiring" | "patch" | "backlog" | "record";

export type OfficePuzzle = {
  id: OfficePuzzleId;
  /** The station the camera has to be at before it can be opened. */
  at: string;
  name: string;
  /** What it is guarding, in one line. */
  holds: string;
};

/**
 * Three locks and one thing that is not locked.
 *
 * The same shape the bedroom settled on, and for the same reason: a room where
 * every single thing is a puzzle is a corridor of puzzles, and the piece
 * somebody actually came for — the record of where he worked — should not be
 * behind any of them.
 */
export const OFFICE_PUZZLES: OfficePuzzle[] = [
  {
    id: "wiring",
    at: "board",
    name: "The architecture",
    holds: "What each job was actually for, once the lines stop crossing.",
  },
  {
    id: "patch",
    at: "rack",
    name: "The patch panel",
    holds: "What every one of those jobs was built out of.",
  },
  {
    id: "backlog",
    at: "desk",
    name: "The backlog",
    holds: "What it took to get out of school and into the work.",
  },
  {
    id: "record",
    at: "cabinet",
    name: "The personnel file",
    holds: "The whole record, in order. No lock on this one.",
  },
];

export const officePuzzleById = (id: string) =>
  OFFICE_PUZZLES.find((p) => p.id === id);
