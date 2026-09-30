/**
 * The three rooms behind the last three books: the college archive (STACK),
 * the locked archives (CERTIFICATIONS) and the training facility (SKILLS).
 *
 * One file for three rooms rather than one each like the lab and the office,
 * because these three share every piece of machinery — a shell, a window, a
 * ceiling, shelves with lights under them — and differ only in what stands in
 * them. So the difference is data and the machinery is written once.
 *
 * Every prop carries its own hit box in world units. That is what lets
 * scripts/check-archives.ts assert the thing a player would actually notice:
 * that standing at a prop's station puts that prop on screen.
 */

import type { Shot } from "./world";
import type { PropSound } from "./sound";

export type ArchiveId = "college" | "vault" | "training";

/** Matched to the other rooms so `frameFor` needs no per-room tuning. */
export const ARCHIVE = { w: 2400, h: 1350 } as const;

export const ARCHIVE_ESTABLISH: Shot = { x: 1200, y: 700, z: 0.82 };

export type Box = { x: number; y: number; w: number; h: number };

/** What a prop shows when it is used, beyond changing how it looks. */
export type Shows =
  | "records"
  | "years"
  | "places"
  | "diploma"
  | "certifications"
  | "issuers"
  | "drills"
  | "skills"
  | "achievements";

/**
 * The games that guard a prop: a pin tumbler (default), a combination dial,
 * the vault safe (a dial on a clock, whose numbers the office phone gives
 * away), fingerprint dusting, the decoder ring, and the timeline.
 */
export type Lock = "pick" | "dial" | "safe" | "prints" | "decoder" | "timeline";

export type ArchiveProp = {
  id: string;
  /** The station the camera has to be at before it can be used. */
  at: string;
  name: string;
  /** Said in the HUD when it is used. */
  note: string;
  /** Opens a card with this on it. Absent means using it only changes it. */
  shows?: Shows;
  /** Behind a lock that has to be beaten first. */
  locked?: boolean;
  /** Which lock: a pin tumbler to pick (default) or a combination dial. */
  lock?: Lock;
  /** Opens its own screen rather than a card of CMS rows. */
  opens?: "cctv";
  /** What it sounds like to touch. */
  sfx: PropSound;
  /** Something picked up and carried to every room. */
  gives?: "torch";
  hit: Box;
};

export type ArchiveStation = { id: string; name: string; blurb: string; cam: Shot };

export type ArchiveRoom = {
  id: ArchiveId;
  /** HUD title. */
  title: string;
  /** The HUD line before the camera is parked anywhere. */
  blurb: string;
  arrival: Shot;
  /** The ceiling fittings burn this. */
  bulb: string;
  /** The glass the blind covers. */
  glass: Box;
  /** A slit with bars in it rather than a window you could climb out of. */
  bars?: boolean;
  /** Where the ceiling fittings hang, by x. */
  pendants: number[];
  /** Boards with a light strip under each. */
  shelves: { x: number; y: number; w: number }[];
  stations: ArchiveStation[];
  props: ArchiveProp[];
};

export const ARCHIVES: ArchiveRoom[] = [
  {
    id: "college",
    title: "COLLEGE ARCHIVE",
    blurb: "Every year of it, filed, and a lamp somebody left on in the reading room.",
    arrival: { x: 1080, y: 760, z: 1.9 },
    bulb: "#ffc178",
    glass: { x: 1560, y: 372, w: 300, h: 240 },
    pendants: [900, 1500],
    shelves: [
      { x: 462, y: 470, w: 356 },
      { x: 462, y: 590, w: 356 },
      { x: 462, y: 710, w: 356 },
      { x: 462, y: 830, w: 356 },
    ],
    stations: [
      {
        id: "stacks",
        name: "The stacks",
        blurb: "Yearbooks, spine out, one for every year he was there.",
        cam: { x: 640, y: 640, z: 1.6 },
      },
      {
        id: "catalogue",
        name: "The catalogue",
        blurb: "A card for everything the college ever handed him.",
        cam: { x: 1080, y: 780, z: 2.3 },
      },
      {
        id: "desk",
        name: "The reading desk",
        blurb: "A green lamp and a microfiche reader nobody has returned.",
        cam: { x: 1500, y: 760, z: 2.1 },
      },
      {
        id: "wall",
        name: "The wall",
        blurb: "A frame, and a window onto the quad.",
        cam: { x: 1560, y: 500, z: 2.2 },
      },
    ],
    props: [
      {
        id: "yearbooks",
        at: "stacks",
        sfx: "page",
        name: "The yearbooks",
        note: "One pulled out. Somebody has written the years on the spines in pencil, and SHIFT {shift} in a margin.",
        shows: "years",
        hit: { x: 450, y: 350, w: 380, h: 590 },
      },
      {
        id: "catalogue",
        at: "catalogue",
        sfx: "rustle",
        name: "The card catalogue",
        note: "The drawer slides out on its runners. Every card is typed, and now in order.",
        shows: "records",
        locked: true,
        lock: "timeline",
        hit: { x: 900, y: 640, w: 280, h: 300 },
      },
      {
        id: "globe",
        at: "catalogue",
        sfx: "whir",
        name: "The globe",
        note: "It spins. There are pins in it where the courses were taken.",
        shows: "places",
        hit: { x: 1200, y: 720, w: 110, h: 220 },
      },
      {
        id: "lamp",
        at: "desk",
        sfx: "flick",
        name: "The banker's lamp",
        note: "Click. Green glass, a pool of light, and a UV torch in the base. You take it.",
        gives: "torch",
        hit: { x: 1350, y: 690, w: 100, h: 100 },
      },
      {
        id: "fiche",
        at: "desk",
        sfx: "whir",
        name: "The microfiche reader",
        note: "The screen warms up. The scrambled line on it reads clearly now.",
        locked: true,
        lock: "decoder",
        hit: { x: 1560, y: 630, w: 150, h: 160 },
      },
      {
        id: "diploma",
        at: "wall",
        sfx: "latch",
        name: "The frame",
        note: "Straightened. It had been hanging crooked for years.",
        shows: "diploma",
        hit: { x: 1250, y: 400, w: 210, h: 160 },
      },
    ],
  },
  {
    id: "vault",
    title: "LOCKED ARCHIVES",
    blurb: "Cold light, a cage, and a door that has not been opened in years.",
    arrival: { x: 860, y: 680, z: 2.2 },
    bulb: "#cfe6ff",
    glass: { x: 1040, y: 380, w: 320, h: 64 },
    bars: true,
    pendants: [760, 1640],
    shelves: [
      { x: 470, y: 520, w: 430 },
      { x: 470, y: 680, w: 430 },
      { x: 470, y: 840, w: 430 },
      { x: 980, y: 470, w: 440 },
    ],
    stations: [
      {
        id: "cage",
        name: "The cage",
        blurb: "Chain link floor to ceiling, and a padlock on the gate.",
        cam: { x: 680, y: 660, z: 1.6 },
      },
      {
        id: "boxes",
        name: "The boxes",
        blurb: "A wall of deposit boxes, and a trolley nobody put away.",
        cam: { x: 1200, y: 650, z: 1.8 },
      },
      {
        id: "door",
        name: "The vault door",
        blurb: "Round, steel, and watched.",
        cam: { x: 1700, y: 650, z: 1.6 },
      },
    ],
    props: [
      {
        id: "cage",
        at: "cage",
        sfx: "creak",
        name: "The cage",
        note: "The padlock gives. The gate swings in.",
        shows: "certifications",
        locked: true,
        hit: { x: 450, y: 370, w: 470, h: 570 },
      },
      {
        id: "boxes",
        at: "boxes",
        sfx: "clank",
        name: "The deposit boxes",
        note: "The prints match. The little door opens on a list of names.",
        shows: "issuers",
        locked: true,
        lock: "prints",
        hit: { x: 980, y: 480, w: 440, h: 300 },
      },
      {
        id: "trolley",
        at: "boxes",
        sfx: "rustle",
        name: "The trolley",
        note: "The lid comes off an archive box. Empty — it was moved to the cage.",
        hit: { x: 1020, y: 800, w: 360, h: 140 },
      },
      {
        id: "vault",
        at: "door",
        sfx: "clank",
        name: "The vault door",
        note: "The last wheel drops. The door swings out on what the vault was keeping.",
        shows: "achievements",
        locked: true,
        lock: "safe",
        hit: { x: 1490, y: 440, w: 420, h: 440 },
      },
      {
        id: "camera",
        at: "door",
        sfx: "beep",
        name: "The camera",
        note: "The red light comes on. Somebody is watching the door.",
        opens: "cctv",
        hit: { x: 1860, y: 390, w: 110, h: 70 },
      },
    ],
  },
  {
    id: "training",
    title: "TRAINING FACILITY",
    blurb: "Floodlights, a bag on a chain, and a locker for every skill.",
    arrival: { x: 1300, y: 560, z: 1.9 },
    bulb: "#e6f0ff",
    glass: { x: 1600, y: 372, w: 320, h: 250 },
    pendants: [760, 1200, 1640],
    shelves: [
      { x: 462, y: 720, w: 356 },
      { x: 880, y: 410, w: 280 },
    ],
    stations: [
      {
        id: "board",
        name: "The board",
        blurb: "This week's drills, in marker, and a shelf of what they were for.",
        cam: { x: 640, y: 600, z: 2.0 },
      },
      {
        id: "lockers",
        name: "The lockers",
        blurb: "A name on every door, and the kit inside.",
        cam: { x: 1020, y: 680, z: 1.7 },
      },
      {
        id: "gym",
        name: "The floor",
        blurb: "A heavy bag, a rack of weights and a clock that counts rounds.",
        cam: { x: 1360, y: 630, z: 1.6 },
      },
      {
        id: "track",
        name: "The treadmill",
        blurb: "By the window, so there is something to look at.",
        cam: { x: 1760, y: 660, z: 1.6 },
      },
    ],
    props: [
      {
        id: "whiteboard",
        at: "board",
        sfx: "page",
        name: "The whiteboard",
        note: "This week's drills, and how many reps of each.",
        shows: "drills",
        hit: { x: 450, y: 390, w: 380, h: 230 },
      },
      {
        id: "trophies",
        at: "board",
        sfx: "chime",
        name: "The trophies",
        note: "Picked up and put back. They catch the light.",
        hit: { x: 460, y: 630, w: 360, h: 90 },
      },
      {
        id: "lockers",
        at: "lockers",
        sfx: "clank",
        name: "The lockers",
        note: "The door swings open. Everything is labelled.",
        shows: "skills",
        locked: true,
        lock: "dial",
        hit: { x: 880, y: 420, w: 280, h: 520 },
      },
      {
        id: "bag",
        at: "gym",
        sfx: "thud",
        name: "The heavy bag",
        note: "Thud. The chain rattles and the bag swings.",
        hit: { x: 1240, y: 320, w: 120, h: 450 },
      },
      {
        id: "rack",
        at: "gym",
        sfx: "clank",
        name: "The rack",
        note: "A dumbbell comes off the rack and goes back on.",
        hit: { x: 1380, y: 760, w: 180, h: 180 },
      },
      {
        id: "clock",
        at: "gym",
        sfx: "beep",
        name: "The round clock",
        note: "Three minutes on, one off. The hand starts going round.",
        hit: { x: 1420, y: 390, w: 80, h: 80 },
      },
      {
        id: "treadmill",
        at: "track",
        sfx: "whir",
        name: "The treadmill",
        note: "The belt starts to run.",
        hit: { x: 1600, y: 760, w: 360, h: 190 },
      },
    ],
  },
];

export const archiveById = (id: ArchiveId) => ARCHIVES.find((a) => a.id === id)!;
