/**
 * The experiments world: an officer's room drawn in ink, the shelf in it, and
 * the files on that shelf.
 *
 * This lives outside the "use client" components for the same reason
 * lib/untangle does: a file nothing can reach, a camera that frames the wrong
 * thing, or a generated puzzle that comes out already solved is not a hard
 * game, it is a broken one, and every one of those shows up as a player giving
 * up rather than as an error anyone would ever see. See scripts/check-world.ts.
 *
 * Nothing here touches the database. The experiments page is deliberately
 * DB-free, so the puzzles are about the SHAPE of a portfolio, which is
 * knowledge the visitor already has by the time they get here, rather than
 * about rows that would have to be fetched and could be empty.
 */

export type GameId = "untangle" | "order" | "recall";

/** Where the camera stands and how far in it is. */
export type Shot = { x: number; y: number; z: number };

/** The SVG coordinate space the room is drawn in. */
export const WORLD = { w: 2400, h: 1350 } as const;

/* ---------------------------------------------------------------------------
   Where the camera stands
   ------------------------------------------------------------------------- */

export type Station = {
  id: string;
  /** HUD label. */
  name: string;
  /** One line, shown while the camera is parked here. */
  blurb: string;
  /** The world-space point the camera centres, and how far in it goes. */
  cam: Shot;
};

/**
 * The opening shot: the whole room, square on, before the camera is handed
 * over. A zoom of 0.8 is exactly the room's own height against a 16:9 screen,
 * so nothing is cropped and nothing is letterboxed.
 */
export const ESTABLISH: Shot = { x: 1200, y: 675, z: 0.8 };

/**
 * Where the camera lands out of the black.
 *
 * Not the establishing shot. It arrives close on the desk, in the dark, and
 * pulls back to find the room — which is the difference between a room being
 * revealed and a picture being shown.
 */
export const ARRIVAL: Shot = { x: 1080, y: 960, z: 1.6 };

export const STATIONS: Station[] = [
  {
    id: "board",
    name: "The board",
    blurb: "Photographs, a map, and string between them. Somebody was working.",
    cam: { x: 330, y: 520, z: 1.7 },
  },
  {
    id: "window",
    name: "The window",
    blurb: "Blinds half drawn. It is the middle of the night out there.",
    cam: { x: 760, y: 520, z: 1.7 },
  },
  {
    id: "desk",
    name: "The desk",
    blurb: "A lamp still on, a cold cup, and a phone off its cradle.",
    cam: { x: 1120, y: 960, z: 1.35 },
  },
  {
    id: "shelf",
    name: "The shelf",
    blurb: "Four files, standing upright. Names down the spines.",
    cam: { x: 1550, y: 640, z: 2.1 },
  },
];

export const stationById = (id: string) => STATIONS.find((s) => s.id === id);

/* ---------------------------------------------------------------------------
   The files on the shelf
   ------------------------------------------------------------------------- */

export type CaseFile = {
  id: string;
  /** The number inked on the spine. */
  index: string;
  /** The name down the spine, and the title on the cover. */
  name: string;
  /** The line under the title on the cover. */
  subject: string;
  /** What the cover says is inside, before you open it. */
  brief: string;
  /** The puzzle inside. null means there is nothing to solve, only to read. */
  game: GameId | null;
  /** The piece of the portfolio solving it hands back. */
  reward: string;
  /** Files that must be solved before this one comes off the shelf. */
  needs?: string[];
  /**
   * Where the spine stands, in world units, on the upper shelf board.
   *
   * Explicit per file rather than a pitch, because they lean: a row of
   * perfectly upright files is the fastest way to make a drawing look
   * generated. The lean is drawn from `tilt`.
   */
  spine: { x: number; y: number; w: number; h: number; tilt: number };
};

/**
 * Four files. Three carry a puzzle; the fourth is what the other three add up
 * to, and it cannot be opened until they are done.
 *
 * The rewards are pieces of this site, not points. That is the whole
 * conceit of the room — you are not scoring, you are getting the portfolio
 * back one piece at a time.
 */
export const FILES: CaseFile[] = [
  {
    id: "access",
    index: "01",
    name: "ACCESS",
    subject: "A lock, and the wiring behind it",
    brief:
      "The panel was opened once already and put back badly. Pull the nodes apart until no two lines cross.",
    game: "untangle",
    reward: "the way in",
    spine: { x: 1252, y: 492, w: 58, h: 176, tilt: -1.6 },
  },
  {
    id: "page",
    index: "02",
    name: "THE PAGE",
    subject: "A site, in the wrong order",
    brief:
      "Somebody photocopied the whole portfolio and dropped it down the stairs. Put the sections back in the order the page reads.",
    game: "order",
    reward: "selected work",
    spine: { x: 1338, y: 488, w: 62, h: 182, tilt: 0.9 },
  },
  {
    id: "signal",
    index: "03",
    name: "THE SIGNAL",
    subject: "Four pads, still transmitting",
    brief:
      "Something in this building is still sending. Watch what it plays and repeat it back.",
    game: "recall",
    reward: "the contact line",
    spine: { x: 1430, y: 494, w: 56, h: 174, tilt: -0.7 },
  },
  {
    id: "dossier",
    index: "04",
    name: "THE FILE",
    subject: "Everything recovered, in one place",
    brief:
      "Empty until the other three are done. Whatever you get back out of this room ends up in here.",
    game: null,
    reward: "the whole thing",
    needs: ["access", "page", "signal"],
    spine: { x: 1516, y: 490, w: 60, h: 180, tilt: 1.4 },
  },
];

export const fileById = (id: string) => FILES.find((f) => f.id === id);

/** Files that carry a puzzle, which is what the HUD counts. */
export const PUZZLE_COUNT = FILES.filter((f) => f.game).length;

/** Can this file be taken off the shelf yet? */
export function isUnlocked(file: CaseFile, solved: readonly string[]) {
  return (file.needs ?? []).every((id) => solved.includes(id));
}

/**
 * Every file is eventually openable by solving what is already open.
 *
 * This is what rules out a cycle, or a file waiting on something that is not
 * on the shelf. Neither would throw: the file would simply sit there refusing
 * to come out, with nothing on screen to say why.
 */
export function allFilesReachable(): boolean {
  const solved: string[] = [];
  for (;;) {
    const next = FILES.filter(
      (f) => !solved.includes(f.id) && isUnlocked(f, solved),
    );
    if (next.length === 0) break;
    solved.push(...next.map((f) => f.id));
  }
  return solved.length === FILES.length;
}

/* ---------------------------------------------------------------------------
   Order: put the page back together
   ------------------------------------------------------------------------- */

/** The site's own section order, which is the answer. */
export const PAGE_ORDER = [
  "Hero",
  "Selected work",
  "About",
  "Experience",
  "Stack",
  "Contact",
] as const;

/**
 * A shuffle that is never already the answer.
 *
 * A Fisher-Yates on six items lands on the sorted order about once in every
 * seven hundred and twenty boards. Rare is not never, and a puzzle that opens
 * solved reads as broken rather than lucky, so a shuffle that comes out sorted
 * is rotated by one, which cannot be sorted.
 */
export function shuffleOrder<T>(items: readonly T[], rnd: () => number = Math.random): T[] {
  if (items.length < 2) return [...items];

  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }

  const sorted = out.every((v, i) => v === items[i]);
  return sorted ? [...out.slice(1), out[0]] : out;
}

export function isOrdered<T>(current: readonly T[], answer: readonly T[]) {
  return current.length === answer.length && current.every((v, i) => v === answer[i]);
}

/** Swap two neighbours. Out-of-range is a no-op rather than a throw: it is the
 *  arrow key at the top of the list, not a bug. */
export function swapAt<T>(items: readonly T[], i: number, j: number): T[] {
  if (i < 0 || j < 0 || i >= items.length || j >= items.length) return [...items];
  const out = [...items];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/* ---------------------------------------------------------------------------
   Recall: repeat the beacon
   ------------------------------------------------------------------------- */

/** The four pads the signal transmits on. */
export const SIGNALS = ["WORK", "ABOUT", "STACK", "SAY HI"] as const;

/** How long the sequence runs at each round. Four rounds, then it is yours. */
export const RECALL_ROUNDS = 4;

/**
 * A sequence of pad indices, with no pad used three times running.
 *
 * Not for difficulty: a triple flash is ambiguous to watch, because the gap
 * between two repeats of the same pad is the only thing telling you it was two
 * and not one. Ruling it out removes the one failure that is the animation's
 * fault rather than the player's.
 */
export function buildSequence(
  length: number,
  rnd: () => number = Math.random,
  pads: number = SIGNALS.length,
): number[] {
  // With one pad there is no sequence to get wrong and the no-triples rule can
  // never be satisfied, so the loop below would spin forever. Not a case the
  // game reaches; it is here so the function cannot hang whatever it is given.
  if (pads < 2) return Array.from({ length }, () => 0);

  const out: number[] = [];
  while (out.length < length) {
    const next = Math.floor(rnd() * pads);
    const n = out.length;
    if (n >= 2 && out[n - 1] === next && out[n - 2] === next) continue;
    out.push(next);
  }
  return out;
}
