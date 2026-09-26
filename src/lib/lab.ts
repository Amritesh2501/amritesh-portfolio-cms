/**
 * The room through the PROJECTS book.
 *
 * Where the work actually got made. The case room is an investigation, the
 * bedroom is a person and the office is a job; this is the fourth register — a
 * room somebody builds things in at two in the morning, which is a different
 * kind of room from one somebody works in.
 *
 * Same shape as lib/bedroom and lib/office: a world box, stations with a camera
 * each, and the things in the room as data rather than as coordinates buried in
 * JSX. Anything a player can get stuck behind is checked in
 * scripts/check-lab.ts rather than trusted.
 */

import type { Shot } from "./world";

/** Matched to the other three so `frameFor` needs no per-room tuning. */
export const LAB = { w: 2400, h: 1350 } as const;

/** The whole floor, square on. */
export const LAB_ESTABLISH: Shot = { x: 1200, y: 700, z: 0.82 };

/** Where the camera lands out of the black: close on the three screens, which
 *  are the thing this room is about, then it pulls back. */
export const LAB_ARRIVAL: Shot = { x: 1180, y: 560, z: 1.9 };

export type LabStation = {
  id: string;
  name: string;
  blurb: string;
  cam: Shot;
};

export const LAB_STATIONS: LabStation[] = [
  {
    id: "rig",
    name: "The rig",
    blurb: "Three screens, and the machine locked. It wants the route back in.",
    cam: { x: 1146, y: 566, z: 2.1 },
  },
  {
    id: "board",
    name: "The board",
    blurb: "Everything that was going to get built. Most of it did not.",
    cam: { x: 470, y: 520, z: 2.4 },
  },
  {
    id: "arcade",
    name: "The cabinet",
    blurb: "It still has a credit on it.",
    cam: { x: 1944, y: 700, z: 2.3 },
  },
  {
    id: "window",
    name: "The window",
    blurb: "Whatever time it is out there, it stopped mattering hours ago.",
    cam: { x: 1620, y: 440, z: 2.4 },
  },
];

export const labStationById = (id: string) => LAB_STATIONS.find((s) => s.id === id);

/* ---------------------------------------------------------------------------
   What is in the room
   ------------------------------------------------------------------------- */

export type LabPuzzleId = "rig" | "board" | "arcade";

export type LabPuzzle = {
  id: LabPuzzleId;
  /** The station the camera has to be at before it can be opened. */
  at: string;
  name: string;
  /** What it is guarding, in one line. */
  holds: string;
};

/**
 * One lock, and two things that are not locked.
 *
 * The same ratio the other two rooms settled on and for the same reason: a room
 * where everything is a puzzle is a corridor of puzzles. The machine is the
 * lock, because the machine is where the work is; the board and the cabinet are
 * simply there, because a room you can only look at through a keyhole is not a
 * room somebody lived in.
 */
export const LAB_PUZZLES: LabPuzzle[] = [
  {
    id: "rig",
    at: "rig",
    name: "The machine",
    holds: "Three screens: what shipped, what it is doing now, and what he plays.",
  },
  {
    id: "board",
    at: "board",
    name: "The board",
    holds: "What was planned, in the order it was thought of. No lock.",
  },
  {
    id: "arcade",
    at: "arcade",
    name: "The cabinet",
    holds: "Two games that fit in a corner of a screen. No lock.",
  },
];

export const labPuzzleById = (id: string) => LAB_PUZZLES.find((p) => p.id === id);

/* ---------------------------------------------------------------------------
   The three screens
   ------------------------------------------------------------------------- */

/** Which screen the machine is showing once it is open. The rig has three and
 *  they do different jobs, so it is a real switch rather than a tab bar. */
export type LabScreen = "work" | "dash" | "play";

export const LAB_SCREENS: { id: LabScreen; name: string; note: string }[] = [
  { id: "work", name: "PROJECTS", note: "Everything published, and what it was built out of." },
  { id: "dash", name: "DASHBOARD", note: "What the machine is doing while nobody is watching." },
  { id: "play", name: "GAMES", note: "Two of them, written in an evening each." },
];
