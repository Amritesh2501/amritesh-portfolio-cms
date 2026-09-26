/**
 * The route into his machine, as rules.
 *
 * A path is traced across a nine by nine grid one cell at a time, and then it
 * is gone and you walk it yourself. Get a step wrong and it shows you again.
 *
 * The whole game is the path being walkable, which means three things that are
 * easy to get wrong and impossible to notice from one playthrough:
 *
 *   - every step orthogonally adjacent to the last, because a path that jumps
 *     is one the player watches, fails to repeat, and blames themselves for;
 *   - no cell twice, because a path that crosses itself cannot be read back —
 *     at the crossing there is nothing on screen to say which way it went;
 *   - the whole thing inside the grid, which a naive walk breaks at the edges
 *     by stepping off and wrapping.
 *
 * See scripts/check-path.ts.
 */

/** Nine by nine. Big enough that the path is a shape rather than a line, small
 *  enough to stay legible on a phone. */
export const GRID = 9;

/** How long the route is. Around a dozen steps is the point where you stop
 *  being able to hold it as a list and start holding it as a picture, which is
 *  the thing the game is actually about. */
export const STEPS = 12;

/** How many rounds. Each one is a fresh path; the machine opens after three. */
export const ROUNDS = 3;

export const cellAt = (c: number, r: number) => r * GRID + c;
export const colOf = (i: number) => i % GRID;
export const rowOf = (i: number) => Math.floor(i / GRID);

export const adjacent = (a: number, b: number) =>
  Math.abs(colOf(a) - colOf(b)) + Math.abs(rowOf(a) - rowOf(b)) === 1;

/**
 * A walk of `STEPS` cells, each one next to the last and none of them twice.
 *
 * A self-avoiding walk can paint itself into a corner, so it backtracks rather
 * than restarting: on a 9x9 with a dozen steps that is rare, and a retry loop
 * that can in principle spin forever is worse than a few lines of undo.
 */
export function makePath(rnd: () => number = Math.random): number[] {
  const shuffle = <T,>(items: T[]) => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  const neighbours = (i: number) => {
    const c = colOf(i);
    const r = rowOf(i);
    const out: number[] = [];
    if (c > 0) out.push(cellAt(c - 1, r));
    if (c < GRID - 1) out.push(cellAt(c + 1, r));
    if (r > 0) out.push(cellAt(c, r - 1));
    if (r < GRID - 1) out.push(cellAt(c, r + 1));
    return out;
  };

  // Started away from the very edge, so the first step has somewhere to go in
  // every direction and the shape does not hug a wall.
  const start = cellAt(
    1 + Math.floor(rnd() * (GRID - 2)),
    1 + Math.floor(rnd() * (GRID - 2)),
  );

  const walk = [start];
  const used = new Set([start]);
  // The options not yet tried at each depth, so a dead end can step back
  // instead of starting over.
  const untried: number[][] = [shuffle(neighbours(start)).filter((n) => !used.has(n))];

  while (walk.length < STEPS) {
    const options = untried[untried.length - 1];
    const next = options.pop();

    if (next === undefined) {
      // Nowhere left here. Undo the last step and try its other options.
      untried.pop();
      const back = walk.pop();
      if (back !== undefined) used.delete(back);
      // Only reachable if the very first cell ran out, which on this grid
      // cannot happen — but a path is better than a hang.
      if (walk.length === 0) return makePath(rnd);
      continue;
    }

    if (used.has(next)) continue;

    walk.push(next);
    used.add(next);
    untried.push(shuffle(neighbours(next)).filter((n) => !used.has(n)));
  }

  return walk;
}
