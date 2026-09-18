/**
 * The one property that matters: every board this generates can be solved.
 *
 * The game claims a solution exists because the wiring was chosen against a
 * known-planar circular layout. That claim is worth checking rather than
 * trusting, because a board that cannot be untangled is not a hard puzzle, it
 * is a broken one, and it would only ever show up as a player giving up.
 *
 *   npx tsx scripts/check-untangle.ts
 */
import assert from "node:assert/strict";
import {
  LEVELS,
  buildBoard,
  countCrossings,
  crosses,
  type Node,
} from "../src/lib/untangle";

const at = (id: number, x: number, y: number): Node => ({ id, x, y });

// A clean X.
assert.equal(
  crosses(at(0, 0, 0), at(1, 10, 10), at(2, 0, 10), at(3, 10, 0)),
  true,
  "an X should cross",
);

// Parallel lines never meet.
assert.equal(
  crosses(at(0, 0, 0), at(1, 10, 0), at(2, 0, 5), at(3, 10, 5)),
  false,
  "parallel segments should not cross",
);

// Segments that share an endpoint meet there by design, not by tangling.
assert.equal(
  crosses(at(0, 0, 0), at(1, 10, 10), at(1, 10, 10), at(2, 20, 0)),
  false,
  "a shared endpoint is not a crossing",
);

// Crossing the infinite lines but not the segments themselves.
assert.equal(
  crosses(at(0, 0, 0), at(1, 1, 1), at(2, 5, 6), at(3, 6, 5)),
  false,
  "segments that stop short should not cross",
);

// The property under test, over every level and enough boards that a rare bad
// generation would show up.
let scattered = 0;
for (let level = 0; level < LEVELS.length; level++) {
  for (let i = 0; i < 300; i++) {
    const board = buildBoard(level);

    assert.equal(
      countCrossings(board.solved, board.edges),
      0,
      `level ${level} generated a board with no solution`,
    );

    assert.equal(
      board.edges.length,
      LEVELS[level].nodes + LEVELS[level].extra,
      `level ${level} did not reach its edge count`,
    );

    if (countCrossings(board.nodes, board.edges) > 0) scattered++;
  }
}

// A scatter that lands solved is not a bug, but if it happened often the game
// would keep opening on a finished board.
const rate = scattered / (LEVELS.length * 300);
assert.ok(rate > 0.9, `boards should start tangled; only ${(rate * 100).toFixed(1)}% did`);

console.log(`ok: ${LEVELS.length * 300} boards, all solvable, ${(rate * 100).toFixed(1)}% start tangled`);
