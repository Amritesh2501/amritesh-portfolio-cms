/**
 * The properties of the experiments world that are worth checking rather than
 * trusting, because each one fails as a player being stuck rather than as an
 * error anyone would see.
 *
 *   npx tsx scripts/check-world.ts
 */
import assert from "node:assert/strict";
import {
  ESTABLISH,
  PAGE_ORDER,
  STATIONS,
  WORLD,
  buildSequence,
  isOrdered,
  isReachable,
  shuffleOrder,
  stationById,
  swapAt,
} from "../src/lib/world";

/* Stations ---------------------------------------------------------------- */

// Every dependency names a station that exists, or the world has a door to
// nowhere and the HUD would render a button that can never light up.
for (const station of STATIONS) {
  if (!station.needs) continue;
  assert.ok(
    stationById(station.needs),
    `${station.id} needs "${station.needs}", which is not a station`,
  );
}

// Every station is eventually reachable by solving puzzles in list order. This
// is what rules out a cycle: two stations each waiting on the other would
// simply never come open, with nothing on screen to say why.
{
  const solved: string[] = [];
  for (const station of STATIONS) {
    assert.ok(
      isReachable(station, solved),
      `${station.id} cannot be reached in list order`,
    );
    if (station.game) solved.push(station.id);
  }
  assert.equal(
    solved.length,
    STATIONS.filter((s) => s.game).length,
    "every puzzle station should be solvable in one pass",
  );
}

// Nothing is parked off the edge of the drawn scene.
for (const { id, cam } of [...STATIONS.map((s) => ({ id: s.id, cam: s.cam })), { id: "establish", cam: ESTABLISH }]) {
  assert.ok(cam.x >= 0 && cam.x <= WORLD.w, `${id} is off the scene horizontally`);
  assert.ok(cam.y >= 0 && cam.y <= WORLD.h, `${id} is off the scene vertically`);
  assert.ok(cam.z > 0, `${id} has a zoom of ${cam.z}`);
}

// Station ids are what progress is keyed on, so a duplicate would silently
// unlock two places at once.
assert.equal(
  new Set(STATIONS.map((s) => s.id)).size,
  STATIONS.length,
  "station ids must be unique",
);

/* Order ------------------------------------------------------------------- */

// A shuffle that comes out already solved reads as broken rather than lucky.
// The worst case is checked directly: an rnd that always picks the last index
// leaves Fisher-Yates with the identity permutation.
assert.ok(
  !isOrdered(shuffleOrder(PAGE_ORDER, () => 0.999999), PAGE_ORDER),
  "an identity shuffle must be rotated off the answer",
);

for (let seed = 0; seed < 2000; seed++) {
  const board = shuffleOrder(PAGE_ORDER, lcg(seed));
  assert.ok(!isOrdered(board, PAGE_ORDER), `shuffle ${seed} opened solved`);
  assert.deepEqual(
    [...board].sort(),
    [...PAGE_ORDER].sort(),
    `shuffle ${seed} lost or duplicated a section`,
  );
}

// Swapping is how the puzzle is played, so it has to be able to reach the
// answer from any board and never invent an item.
{
  let board = shuffleOrder(PAGE_ORDER, lcg(7));
  for (let i = 0; i < PAGE_ORDER.length; i++) {
    const want = PAGE_ORDER[i];
    for (let j = board.indexOf(want); j > i; j--) board = swapAt(board, j, j - 1);
  }
  assert.ok(isOrdered(board, PAGE_ORDER), "neighbour swaps must reach the answer");
}

// Out of range is the arrow key at the top of the list, not a bug.
assert.deepEqual(swapAt([1, 2, 3], 0, -1), [1, 2, 3]);
assert.deepEqual(swapAt([1, 2, 3], 2, 3), [1, 2, 3]);

/* Recall ------------------------------------------------------------------ */

for (let seed = 0; seed < 500; seed++) {
  const seq = buildSequence(8, lcg(seed));
  assert.equal(seq.length, 8, `sequence ${seed} is the wrong length`);
  for (let i = 2; i < seq.length; i++) {
    assert.ok(
      !(seq[i] === seq[i - 1] && seq[i] === seq[i - 2]),
      `sequence ${seed} has three of the same pad running`,
    );
  }
}

// One pad cannot satisfy the no-triples rule, and the generator must return
// rather than spin looking for a way to.
assert.deepEqual(buildSequence(4, Math.random, 1), [0, 0, 0, 0]);

/** A tiny deterministic generator, so a failure here is reproducible. */
function lcg(seed: number) {
  let s = (seed * 1103515245 + 12345) >>> 0;
  return () => {
    s = (s * 1103515245 + 12345) >>> 0;
    return s / 4294967296;
  };
}

console.log("check-world: ok");
