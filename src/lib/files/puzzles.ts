/**
 * The rules behind the minigames, split out from the components that draw
 * them.
 *
 * Everything in here is pure so that scripts/check-files.ts can assert the
 * properties that are invisible until they bite: a shuffle that can hand back
 * an already-solved board, a lock whose combination is not actually written
 * anywhere in the room, a sort with a category that nothing belongs to.
 * Each of those reads to a player as "this game is broken" or, worse, as
 * "I am too stupid for this", and none of them would ever throw.
 */

import type { GameId } from "./cases";

/* ---------------------------------------------------------------------------
   Shared
   ------------------------------------------------------------------------- */

/** Injectable so the check script can drive these deterministically. */
export type Rng = () => number;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A shuffle that refuses to hand back the answer.
 *
 * A one-in-N chance of the puzzle opening already solved is not a rare bug,
 * it is a rare INSULT: the player is denied the thing they came for and is
 * given the reward anyway. Falls back to a rotation, which is guaranteed
 * different for any list of two or more distinct items.
 */
export function shuffleUnsolved<T>(
  items: readonly T[],
  rng: Rng = Math.random,
  same: (a: readonly T[], b: readonly T[]) => boolean = defaultSame,
): T[] {
  if (items.length < 2) return items.slice();
  for (let attempt = 0; attempt < 12; attempt++) {
    const out = shuffle(items, rng);
    if (!same(out, items)) return out;
  }
  return [...items.slice(1), items[0]];
}

const defaultSame = <T>(a: readonly T[], b: readonly T[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/* ---------------------------------------------------------------------------
   GAME A — timing / hack
   ------------------------------------------------------------------------- */

export type TimingRound = {
  /** Width of the target zone, as a fraction of the bar. */
  zone: number;
  /** Fraction of the bar the indicator covers per second. */
  speed: number;
};

/**
 * Three rounds, getting harder. The last one is the tightest window that is
 * still fair at 60fps: at 0.85 bar/second a 14% zone is open for ~165ms, which
 * is comfortably above a normal reaction floor once the player can see the
 * indicator coming.
 */
export const TIMING_ROUNDS: TimingRound[] = [
  { zone: 0.26, speed: 0.55 },
  { zone: 0.19, speed: 0.7 },
  { zone: 0.14, speed: 0.85 },
];

/** Where the target sits this round. Kept off the extreme edges. */
export function timingTarget(round: TimingRound, rng: Rng = Math.random) {
  const margin = 0.08;
  const span = 1 - round.zone - margin * 2;
  const start = margin + rng() * span;
  return { start, end: start + round.zone };
}

export const timingHit = (pos: number, t: { start: number; end: number }) =>
  pos >= t.start && pos <= t.end;

/* ---------------------------------------------------------------------------
   GAME F — memory
   ------------------------------------------------------------------------- */

/** Glyphs, not colours: colour alone would exclude a chunk of players. */
export const SYMBOLS = ["◆", "▲", "●", "■", "✚", "◈"] as const;

export const MEMORY_LENGTH = 5;

export function buildSequence(
  length = MEMORY_LENGTH,
  rng: Rng = Math.random,
): string[] {
  const out: string[] = [];
  for (let i = 0; i < length; i++) {
    // No immediate repeats: "◆ ◆" is not a memory test, it is a reading test.
    let pick: string;
    do {
      pick = SYMBOLS[Math.floor(rng() * SYMBOLS.length)];
    } while (pick === out[out.length - 1]);
    out.push(pick);
  }
  return out;
}

export const sequenceMatches = (got: string[], want: string[]) =>
  got.length <= want.length && got.every((s, i) => s === want[i]);

/* ---------------------------------------------------------------------------
   GAME G — the lock
   ------------------------------------------------------------------------- */

export type LockClue = {
  /** Where in the room the player reads it. */
  source: string;
  /** What it says, verbatim, as it appears in the scene. */
  reads: string;
  /** The digit it contributes. */
  digit: number;
};

/**
 * Four clues, four digits, in the order the HUD lists them.
 *
 * Every digit is legible somewhere in the residence art — the clock face, the
 * case number on the folder, the ticked rows on the ideas board, the poster.
 * The check script asserts CODE is exactly these digits in order, so the
 * puzzle cannot drift away from the room the way a hardcoded string would.
 */
export const LOCK_CLUES: LockClue[] = [
  {
    source: "The bedside clock",
    reads: "23:47",
    digit: 4,
  },
  {
    source: "The case number",
    reads: "AMR-001",
    digit: 1,
  },
  {
    source: "The ideas board",
    reads: "3 of 5 ticked",
    digit: 3,
  },
  {
    source: "The poster",
    reads: "DISCIPLINE CREATES FREEDOM",
    digit: 3,
  },
];

export const LOCK_CODE = LOCK_CLUES.map((c) => c.digit).join("");

/* ---------------------------------------------------------------------------
   GAME H — hidden object
   ------------------------------------------------------------------------- */

/**
 * The player is told what to find and has to pick it out of the clutter. The
 * decoys are the other things genuinely lying around the residence, so the
 * game is looking at the room rather than at a widget.
 */
export const SEARCH_TARGET = "Good Code Better Days mug";

export const SEARCH_DECOYS = [
  "Water bottle",
  "Desk lamp",
  "Car keys",
  "Earbuds case",
  "Reading glasses",
  "Pen cup",
  "Wallet",
  "Phone",
];

/* ---------------------------------------------------------------------------
   GAME E — file sorting
   ------------------------------------------------------------------------- */

/**
 * Loose documents, and the six drawers they belong in. The drawers are the six
 * cases, so the game teaches the shape of the archive the player is standing
 * in — which is the only reason it is worth playing twice.
 */
export const SORT_BINS = [
  "ABOUT",
  "EXPERIENCE",
  "PROJECTS",
  "EDUCATION",
  "SKILLS",
  "CERTIFICATES",
] as const;

export type SortBin = (typeof SORT_BINS)[number];

export type SortDoc = { id: string; label: string; bin: SortBin };

export const SORT_DOCS: SortDoc[] = [
  { id: "d1", label: "Signed offer letter", bin: "EXPERIENCE" },
  { id: "d2", label: "Degree transcript", bin: "EDUCATION" },
  { id: "d3", label: "Deployment runbook", bin: "PROJECTS" },
  { id: "d4", label: "Handwritten personal note", bin: "ABOUT" },
  { id: "d5", label: "Exam pass slip", bin: "CERTIFICATES" },
  { id: "d6", label: "Language proficiency sheet", bin: "SKILLS" },
];

/* ---------------------------------------------------------------------------
   GAME I — technical reconstruction
   ------------------------------------------------------------------------- */

/**
 * The request path, in order. Generic on purpose: it is the shape every system
 * in the archive shares, so it is a fair thing to ask of a player who has not
 * read the projects case yet.
 */
export const PIPELINE = ["CLIENT", "API", "SERVER", "DATABASE"] as const;

export const isOrdered = (got: readonly string[], want: readonly string[]) =>
  got.length === want.length && got.every((v, i) => v === want[i]);

export function swapAt<T>(items: readonly T[], a: number, b: number): T[] {
  if (a < 0 || b < 0 || a >= items.length || b >= items.length) {
    return items.slice();
  }
  const out = items.slice();
  [out[a], out[b]] = [out[b], out[a]];
  return out;
}

/* ---------------------------------------------------------------------------
   Registry
   ------------------------------------------------------------------------- */

/** Player-facing name and one-line brief, shown on the minigame's title card. */
export const GAME_META: Record<GameId, { name: string; brief: string }> = {
  timing: {
    name: "BYPASS",
    brief: "Stop the marker inside the window. Three passes, each one tighter.",
  },
  memory: {
    name: "RECALL",
    brief: "Watch the sequence, then repeat it back in order.",
  },
  lock: {
    name: "COMBINATION",
    brief: "Four digits. Every one of them is written somewhere in this room.",
  },
  search: {
    name: "SWEEP",
    brief: "Identify the named object among everything else lying around.",
  },
  sort: {
    name: "FILING",
    brief: "Put each loose document in the drawer it belongs to.",
  },
  rebuild: {
    name: "RECONSTRUCT",
    brief: "Put the request path back in the order it actually runs.",
  },
};
