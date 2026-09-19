/**
 * The experiments world: what is in it, where the camera stands to look at
 * each thing, and the two puzzles whose rules are worth checking rather than
 * trusting.
 *
 * This lives outside the "use client" components for the same reason
 * lib/untangle does: a generated puzzle that can come out already solved, or a
 * station nothing can reach, is not a hard game, it is a broken one, and it
 * would only ever show up as a player giving up. See scripts/check-world.ts.
 *
 * Nothing here touches the database. The experiments page is deliberately
 * DB-free, so the puzzles are about the SHAPE of a portfolio, which is
 * knowledge the visitor already has by the time they get here, rather than
 * about rows that would have to be fetched and could be empty.
 */

export type GameId = "untangle" | "order" | "recall";

export type Station = {
  id: string;
  /** HUD label. */
  name: string;
  /** One line, shown while the camera is parked here. */
  blurb: string;
  /** The world-space point the camera centres, and how far in it goes. */
  cam: { x: number; y: number; z: number };
  game: GameId | null;
  /** The piece of the portfolio solving it hands back. */
  reward: string;
  /** Station that has to be solved before this one can be reached. */
  needs?: string;
};

/** The SVG coordinate space the scene is drawn in. */
export const WORLD = { w: 2400, h: 1000 } as const;

/**
 * The route through, west to east: you arrive on the road, the gate is shut,
 * and the house and the mast are on the far side of it. Everything past the
 * gate names `needs: "gate"`, so the gate is the one real lock in the world
 * and the rest is open once it is off.
 */
export const STATIONS: Station[] = [
  {
    id: "road",
    name: "The road",
    blurb: "The portfolio is up there behind the bars. The gate is shut.",
    cam: { x: 560, y: 600, z: 1.15 },
    game: null,
    reward: "",
  },
  {
    id: "gate",
    name: "The gate",
    blurb:
      "The lock is a knot of wiring. Pull the nodes apart until no two lines cross.",
    cam: { x: 900, y: 590, z: 2.1 },
    game: "untangle",
    reward: "the way in",
  },
  {
    id: "house",
    name: "The house",
    blurb:
      "The rooms came apart. Put the floors back in the order the page reads.",
    cam: { x: 1530, y: 560, z: 1.75 },
    game: "order",
    reward: "selected work",
    needs: "gate",
  },
  {
    id: "mast",
    name: "The signal mast",
    blurb: "It is still transmitting the contact line. Repeat it back.",
    cam: { x: 2060, y: 520, z: 1.9 },
    game: "recall",
    reward: "the contact line",
    needs: "gate",
  },
];

/** The opening shot: wide, high and off to the west, before the camera moves. */
export const ESTABLISH = { x: 1150, y: 520, z: 0.52 };

/** Where the camera lands out of the black: the house, seen across the gate. */
export const ARRIVAL = { x: 1500, y: 545, z: 1.25 };

export function stationById(id: string) {
  return STATIONS.find((s) => s.id === id);
}

/** Can the camera go here yet? */
export function isReachable(station: Station, solved: readonly string[]) {
  return !station.needs || solved.includes(station.needs);
}

/** Every station that carries a puzzle, which is what the HUD counts. */
export const PUZZLE_COUNT = STATIONS.filter((s) => s.game).length;

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

/** The four pads the mast transmits on. */
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
