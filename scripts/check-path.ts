/**
 * Every generated route has to be one a person could actually walk back.
 *
 * A path that jumps, crosses itself or steps off the grid is not a hard round.
 * It is a round the player cannot win and has no way to know that, so they
 * conclude they misremembered it. Which is why this runs ten thousand of them.
 */
import assert from "node:assert";
import { GRID, STEPS, adjacent, colOf, makePath, rowOf } from "../src/lib/path";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const PATHS = 10000;
/** How much of the grid the paths between them reach. A generator that always
 *  produced the same corner would pass every other assertion here. */
const touched = new Set<number>();

for (let n = 0; n < PATHS; n++) {
  const path = makePath(rng(n + 1));

  assert.equal(path.length, STEPS, `a path came out ${path.length} long, not ${STEPS}`);

  const seen = new Set<number>();
  for (let i = 0; i < path.length; i++) {
    const cell = path[i];

    assert.ok(
      cell >= 0 && cell < GRID * GRID,
      `step ${i} is cell ${cell}, which is off a ${GRID}x${GRID} grid`,
    );
    assert.ok(
      colOf(cell) >= 0 && colOf(cell) < GRID && rowOf(cell) >= 0 && rowOf(cell) < GRID,
      `step ${i} is outside the grid`,
    );
    assert.ok(!seen.has(cell), `step ${i} revisits a cell, so the path crosses itself`);
    seen.add(cell);
    touched.add(cell);

    if (i > 0) {
      assert.ok(
        adjacent(path[i - 1], cell),
        `step ${i} is not next to step ${i - 1}, so the path jumps`,
      );
    }
  }
}

// Not every cell is reachable as a START (the generator keeps off the outer
// ring on purpose) but the walk itself should get almost everywhere.
assert.ok(
  touched.size > GRID * GRID * 0.9,
  `paths only ever touched ${touched.size} of ${GRID * GRID} cells, so the generator ` +
    `is stuck in one part of the grid`,
);

console.log(
  `check-path: OK — ${PATHS} routes, ${STEPS} steps each, every one adjacent, ` +
    `inside the grid and never crossing itself; ${touched.size}/${GRID * GRID} cells reached.`,
);
