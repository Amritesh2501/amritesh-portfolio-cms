/**
 * The properties of the experiments room that are worth checking rather than
 * trusting, because each one fails as a player being stuck rather than as an
 * error anyone would see.
 *
 *   npx tsx scripts/check-world.ts
 */
import assert from "node:assert/strict";
import {
  ARRIVAL,
  ESTABLISH,
  FILES,
  PAGE_ORDER,
  PUZZLE_COUNT,
  RECALL_ROUNDS,
  SIGNALS,
  STATIONS,
  WORLD,
  allFilesReachable,
  buildSequence,
  fileById,
  isOrdered,
  isUnlocked,
  shuffleOrder,
  stationById,
  swapAt,
  type Shot,
} from "../src/lib/world";

/** Deterministic, so a failure here is reproducible rather than a mood. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/* Stations ---------------------------------------------------------------- */

{
  const ids = STATIONS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate station id");
  assert.ok(STATIONS.length > 0, "the room has nowhere to stand");

  for (const s of STATIONS) {
    assert.ok(stationById(s.id), `${s.id} cannot be looked up by its own id`);
    assert.ok(s.blurb.trim().length > 0, `${s.id} has nothing to say`);
  }

  // Every shot sits inside the room, or the camera opens onto blank stage.
  const inside = (shot: Shot, what: string) => {
    assert.ok(
      shot.x >= 0 && shot.x <= WORLD.w && shot.y >= 0 && shot.y <= WORLD.h,
      `${what} parks the camera outside the room`,
    );
    assert.ok(shot.z > 0, `${what} has a non-positive zoom`);
  };

  for (const s of STATIONS) inside(s.cam, s.id);
  inside(ESTABLISH, "the establishing shot");
  inside(ARRIVAL, "the arrival shot");

  // The opening is a pull-BACK. If arrival were no tighter than the
  // establishing shot the reveal would be a cut, not a move, and the one
  // deliberate camera gesture in the room would silently stop existing.
  assert.ok(
    ARRIVAL.z > ESTABLISH.z,
    "the camera does not pull back out of the black",
  );

  // The establishing shot has to cover the room on a normal screen, or the
  // room ends before the frame does and the drawing has visible edges.
  for (const [vw, vh] of [
    [1920, 1080],
    [1440, 900],
    [1280, 800],
  ]) {
    const fit = Math.max(Math.min(1, vw / 1400), 0.45);
    const z = Math.max(ESTABLISH.z * fit, vh / WORLD.h);
    assert.ok(
      vw / z <= WORLD.w + 1 && vh / z <= WORLD.h + 1,
      `the establishing shot frames past the room at ${vw}x${vh}`,
    );
  }
}

/* The shelf --------------------------------------------------------------- */

{
  const ids = FILES.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate file id");

  const indices = FILES.map((f) => f.index);
  assert.equal(new Set(indices).size, indices.length, "two files share a number");

  assert.ok(
    STATIONS.some((s) => s.id === "shelf"),
    "there is no shelf station, so the files can never be reached",
  );

  for (const f of FILES) {
    assert.ok(fileById(f.id), `${f.id} cannot be looked up by its own id`);
    assert.ok(f.name.trim().length > 0, `${f.id} has no name on its spine`);
    assert.ok(f.brief.trim().length > 0, `${f.id} has a blank cover`);
    assert.ok(f.reward.trim().length > 0, `${f.id} gives nothing back`);

    // Every dependency names a file that exists, and nothing waits on itself.
    for (const need of f.needs ?? []) {
      assert.ok(fileById(need), `${f.id} needs "${need}", which is not a file`);
      assert.notEqual(need, f.id, `${f.id} waits on itself`);
    }
  }

  // No cycle, and nothing stranded: every file comes open eventually.
  assert.ok(allFilesReachable(), "a file on the shelf can never be opened");

  // At least one file is open on arrival, or the shelf is inert and the room
  // has nothing to do in it.
  assert.ok(
    FILES.some((f) => isUnlocked(f, [])),
    "every file is sealed at the start",
  );

  // The gated file opens once its dependencies are in, and not before.
  const gated = FILES.find((f) => (f.needs ?? []).length > 0);
  if (gated) {
    assert.equal(isUnlocked(gated, []), false, "a gated file opens too early");
    assert.equal(
      isUnlocked(gated, gated.needs!),
      true,
      "a gated file never opens",
    );
  }

  assert.equal(
    PUZZLE_COUNT,
    FILES.filter((f) => f.game).length,
    "the HUD counts a different number of puzzles than the shelf holds",
  );
  assert.ok(PUZZLE_COUNT > 0, "no file carries a puzzle");
}

/* The spines, as drawn ---------------------------------------------------- */

{
  // The files stand on the upper shelf board. These are the numbers that keep
  // the drawing and the hit targets in register, and a file drawn outside the
  // carcass reads as floating in the room.
  const BOARD = { x: 1150, y: 418, w: 800, h: 258 };

  const sorted = [...FILES].sort((a, b) => a.spine.x - b.spine.x);
  assert.deepEqual(
    sorted.map((f) => f.id),
    FILES.map((f) => f.id),
    "the files are not listed left to right, so the shelf reads out of order",
  );

  for (const [i, f] of FILES.entries()) {
    const s = f.spine;
    assert.ok(s.w > 0 && s.h > 0, `${f.id} has a spine with no area`);
    assert.ok(
      s.x >= BOARD.x && s.x + s.w <= BOARD.x + BOARD.w,
      `${f.id} stands off the end of the shelf board`,
    );
    assert.ok(
      s.y >= BOARD.y && s.y + s.h <= BOARD.y + BOARD.h + 6,
      `${f.id} does not fit between the shelf boards`,
    );
    // A lean, not a collapse.
    assert.ok(Math.abs(s.tilt) <= 6, `${f.id} is tilted ${s.tilt}deg and has fallen over`);
    assert.notEqual(s.tilt, 0, `${f.id} stands perfectly upright`);

    // Spines must not overlap, or two files share a click.
    if (i > 0) {
      const prev = FILES[i - 1].spine;
      assert.ok(
        s.x >= prev.x + prev.w,
        `${FILES[i - 1].id} and ${f.id} overlap on the shelf`,
      );
    }
  }

  // And the shelf station has to actually be looking at them.
  const shelf = stationById("shelf")!;
  const first = FILES[0].spine;
  const last = FILES[FILES.length - 1].spine;
  const midX = (first.x + last.x + last.w) / 2;
  assert.ok(
    Math.abs(shelf.cam.x - midX) < 220,
    "the shelf station is not pointed at the files",
  );

  // Framing the shelf should show the shelf and not much else — that is the
  // one camera move the brief is explicit about.
  const fit = Math.max(Math.min(1, 1920 / 1400), 0.45);
  const z = Math.max(shelf.cam.z * fit, 1080 / WORLD.h);
  const frameW = 1920 / z;
  assert.ok(
    frameW < BOARD.w * 1.5,
    `the shelf shot is ${Math.round(frameW)} wide against an ${BOARD.w} shelf — too much room in frame`,
  );
}

/* Order ------------------------------------------------------------------- */

{
  assert.ok(PAGE_ORDER.length >= 3, "too few sections to be worth ordering");
  assert.equal(
    new Set(PAGE_ORDER).size,
    PAGE_ORDER.length,
    "two sections share a name and cannot be told apart",
  );

  assert.ok(isOrdered([...PAGE_ORDER], PAGE_ORDER));
  assert.ok(!isOrdered(["Hero"], PAGE_ORDER));

  assert.deepEqual(swapAt(["a", "b", "c"], 0, 2), ["c", "b", "a"]);
  assert.deepEqual(swapAt(["a", "b"], 0, 9), ["a", "b"], "out-of-range swap mutated");
  assert.deepEqual(swapAt(["a", "b"], -1, 0), ["a", "b"], "negative swap mutated");

  // A board that opens already solved hands over the reward and denies the
  // player the thing they came for. Never, not rarely.
  const r = rng(5);
  for (let i = 0; i < 4000; i++) {
    const board = shuffleOrder(PAGE_ORDER, r);
    assert.equal(board.length, PAGE_ORDER.length, "shuffle lost a section");
    assert.equal(
      new Set(board).size,
      board.length,
      "shuffle duplicated a section",
    );
    assert.ok(!isOrdered(board, PAGE_ORDER), "the order puzzle opened solved");
  }

  // Degenerate inputs do not throw or hang.
  assert.deepEqual(shuffleOrder([], r), []);
  assert.deepEqual(shuffleOrder(["only"], r), ["only"]);
}

/* Recall ------------------------------------------------------------------ */

{
  assert.ok(SIGNALS.length >= 2, "a sequence needs at least two pads");
  assert.ok(RECALL_ROUNDS > 0, "the beacon never plays");

  const r = rng(9);
  for (let n = 1; n <= RECALL_ROUNDS + 2; n++) {
    for (let i = 0; i < 400; i++) {
      const seq = buildSequence(n, r);
      assert.equal(seq.length, n, "sequence came back the wrong length");
      for (const pad of seq) {
        assert.ok(
          Number.isInteger(pad) && pad >= 0 && pad < SIGNALS.length,
          `sequence used pad ${pad}, which does not exist`,
        );
      }
      // No pad three times running: a triple flash is ambiguous to watch, so
      // it is the animation's failure rather than the player's.
      for (let j = 2; j < seq.length; j++) {
        assert.ok(
          !(seq[j] === seq[j - 1] && seq[j] === seq[j - 2]),
          "the beacon flashed the same pad three times running",
        );
      }
    }
  }

  // One pad cannot satisfy the no-triples rule, so the generator must bail
  // rather than spin. Not a case the game reaches; it is here so the function
  // cannot hang whatever it is handed.
  assert.deepEqual(buildSequence(4, r, 1), [0, 0, 0, 0]);
}

console.log(
  `check-world: OK — ${STATIONS.length} places to stand, ${FILES.length} files ` +
    `(${PUZZLE_COUNT} with a puzzle), room ${WORLD.w}x${WORLD.h}.`,
);
