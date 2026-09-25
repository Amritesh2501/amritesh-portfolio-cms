/**
 * The backlog board, as rules.
 *
 * A match-three on a small grid: swap two neighbours, three or more of a kind
 * in a line clear, everything above falls into the gap, new tickets come in at
 * the top. Clear a target number and the board is done.
 *
 * It is a match-three because it is a backlog: the joke only works if it plays
 * like the thing it is named after, so the mechanics are the real ones rather
 * than a gesture at them.
 *
 * Everything that can make a match-three unplayable lives here, and every one
 * of them reads as the game being broken rather than as a bug:
 *
 *   - a starting board that already contains a match, which resolves itself
 *     the moment it appears and hands out points nobody earned;
 *   - a board with no legal move, which is a player staring at a grid that
 *     cannot be played and no way to know;
 *   - a swap that is accepted but makes no match, which undoes itself and
 *     looks like the click was dropped.
 *
 * See scripts/check-match3.ts.
 */

export const KINDS = 5;
export const COLS = 7;
export const ROWS = 7;

/** Tickets to clear. Enough to need a few cascades, few enough to be a break
 *  rather than a session. */
export const TARGET = 24;

/** A board is a flat array of kind indices; -1 is a hole mid-resolution. */
export type Board = number[];

export const at = (b: Board, c: number, r: number) => b[r * COLS + c];
const put = (b: Board, c: number, r: number, v: number) => {
  b[r * COLS + c] = v;
};

/**
 * A board with no match already on it and at least one move available.
 *
 * Built cell by cell, refusing any kind that would complete a line of three
 * with what is already placed — which is cheaper and more obviously correct
 * than filling at random and then rejecting whole boards. The move check at
 * the end is the part that cannot be done cell by cell, so it retries.
 */
export function makeBoard(rnd: () => number = Math.random): Board {
  for (let attempt = 0; attempt < 200; attempt++) {
    const b: Board = new Array(COLS * ROWS).fill(-1);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const banned = new Set<number>();
        // Two of a kind already to the left, or above.
        if (c >= 2 && at(b, c - 1, r) === at(b, c - 2, r)) banned.add(at(b, c - 1, r));
        if (r >= 2 && at(b, c, r - 1) === at(b, c, r - 2)) banned.add(at(b, c, r - 1));

        const choices = [];
        for (let k = 0; k < KINDS; k++) if (!banned.has(k)) choices.push(k);
        put(b, c, r, choices[Math.floor(rnd() * choices.length)]);
      }
    }

    if (findMatches(b).size === 0 && hasMove(b)) return b;
  }

  // Never reached with these numbers, and a board is better than a hang.
  return new Array(COLS * ROWS).fill(0).map((_, i) => i % KINDS);
}

/** Every cell that is part of a run of three or more. */
export function findMatches(b: Board): Set<number> {
  const hit = new Set<number>();

  for (let r = 0; r < ROWS; r++) {
    let run = 1;
    for (let c = 1; c <= COLS; c++) {
      const same = c < COLS && at(b, c, r) >= 0 && at(b, c, r) === at(b, c - 1, r);
      if (same) {
        run++;
        continue;
      }
      if (run >= 3) for (let k = 1; k <= run; k++) hit.add(r * COLS + (c - k));
      run = 1;
    }
  }

  for (let c = 0; c < COLS; c++) {
    let run = 1;
    for (let r = 1; r <= ROWS; r++) {
      const same = r < ROWS && at(b, c, r) >= 0 && at(b, c, r) === at(b, c, r - 1);
      if (same) {
        run++;
        continue;
      }
      if (run >= 3) for (let k = 1; k <= run; k++) hit.add((r - k) * COLS + c);
      run = 1;
    }
  }

  return hit;
}

/** Neighbours, and only neighbours. */
export function areNeighbours(a: number, b: number): boolean {
  const ac = a % COLS;
  const ar = Math.floor(a / COLS);
  const bc = b % COLS;
  const br = Math.floor(b / COLS);
  return Math.abs(ac - bc) + Math.abs(ar - br) === 1;
}

export function swapped(b: Board, i: number, j: number): Board {
  const out = [...b];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/** A swap is legal when it is between neighbours AND it makes a match. A swap
 *  that makes nothing has to be refused rather than undone: undoing it looks
 *  exactly like the click being dropped. */
export function isLegal(b: Board, i: number, j: number): boolean {
  if (!areNeighbours(i, j)) return false;
  return findMatches(swapped(b, i, j)).size > 0;
}

/** Is there anything at all left to do? */
export function hasMove(b: Board): boolean {
  for (let i = 0; i < b.length; i++) {
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    if (c + 1 < COLS && isLegal(b, i, i + 1)) return true;
    if (r + 1 < ROWS && isLegal(b, i, i + COLS)) return true;
  }
  return false;
}

/**
 * Clear the matches, drop what is above them, and fill the top.
 *
 * Returns the settled board and how many cells went. One pass: the caller
 * loops it until nothing more clears, which is what makes a cascade a cascade
 * rather than one resolution that has to know about all of them.
 */
export function settle(
  b: Board,
  rnd: () => number = Math.random,
): { board: Board; cleared: number } {
  const hit = findMatches(b);
  if (hit.size === 0) return { board: b, cleared: 0 };

  const out = [...b];
  for (const i of hit) out[i] = -1;

  // Gravity, column by column: take what is left in order, then pad the top.
  for (let c = 0; c < COLS; c++) {
    const keep: number[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      const v = out[r * COLS + c];
      if (v >= 0) keep.push(v);
    }
    for (let r = ROWS - 1; r >= 0; r--) {
      const k = ROWS - 1 - r;
      out[r * COLS + c] = k < keep.length ? keep[k] : Math.floor(rnd() * KINDS);
    }
  }

  return { board: out, cleared: hit.size };
}
