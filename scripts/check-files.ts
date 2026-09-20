/**
 * The properties of THE AMRITESH FILES that are worth checking rather than
 * trusting.
 *
 * Every assertion here covers something that fails as a player being stuck,
 * confused or quietly cheated, rather than as an exception anyone would see.
 * A hotspot painted outside the room, a lock whose code is not written on any
 * wall, a shuffle that opens pre-solved: all silent, all fatal to the one
 * thing this page is trying to be.
 *
 *   npx tsx scripts/check-files.ts
 */
import assert from "node:assert/strict";
import {
  CASES,
  EVIDENCE,
  OFFICE,
  RESIDENCE,
  SCENES,
  caseById,
  caseTotal,
  evidenceById,
  evidenceFor,
  isAvailable,
  LAYER_DEPTHS,
  isCaseCompletable,
  type Scene,
} from "../src/lib/files/cases";
import {
  LOCK_CLUES,
  LOCK_CODE,
  MEMORY_LENGTH,
  PIPELINE,
  SEARCH_DECOYS,
  SEARCH_TARGET,
  SORT_BINS,
  SORT_DOCS,
  SYMBOLS,
  TIMING_ROUNDS,
  buildSequence,
  isOrdered,
  shuffleUnsolved,
  swapAt,
  timingHit,
  timingTarget,
  GAME_META,
} from "../src/lib/files/puzzles";
import {
  SAVE_VERSION,
  collect,
  emptyProgress,
  isComplete,
  parseProgress,
  percent,
  caseProgress,
} from "../src/lib/files/progress";

/** Deterministic RNG, so a failure here is reproducible rather than a mood. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/* Cases -------------------------------------------------------------------- */

{
  const ids = CASES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate case id");

  const indices = CASES.map((c) => c.index);
  assert.equal(new Set(indices).size, indices.length, "duplicate binder number");

  for (const c of CASES) {
    // Every dependency names a case that exists, or the shelf renders a binder
    // that can never come open and never explains why.
    if (c.needs) {
      assert.ok(caseById(c.needs), `${c.id} needs "${c.needs}", not a case`);
      assert.notEqual(c.needs, c.id, `${c.id} depends on itself`);
    }
    // A playable case with no evidence is a room you walk into and cannot
    // leave any mark on, and one whose scene does not exist is a click that
    // lands on a blank screen.
    if (c.playable) {
      assert.ok(caseTotal(c.id) > 0, `${c.id} is playable but has no evidence`);
      assert.ok(SCENES[c.scene], `${c.id} is playable but room "${c.scene}" is not built`);
    }
    // Every piece of evidence in a case sits in that case's own room.
    for (const e of evidenceFor(c.id)) {
      if (!e.seenFrom) continue;
      assert.ok(
        SCENES[c.scene]?.stations.some((s) => s.id === e.seenFrom),
        `${e.id} is gated to "${e.seenFrom}", not a station of ${c.scene}`,
      );
    }
  }

  // At least one case is open from the start, or the shelf is inert.
  assert.ok(
    CASES.some((c) => !c.needs && c.playable),
    "no case is both playable and unlocked at the start",
  );
}

/* Evidence ----------------------------------------------------------------- */

{
  const ids = EVIDENCE.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate evidence id");

  for (const e of EVIDENCE) {
    assert.ok(caseById(e.case), `${e.id} belongs to unknown case ${e.case}`);

    if (e.needs) {
      const dep = evidenceById(e.needs);
      assert.ok(dep, `${e.id} needs "${e.needs}", which is not evidence`);
      assert.equal(dep!.case, e.case, `${e.id} depends across cases`);
      assert.notEqual(e.needs, e.id, `${e.id} depends on itself`);
    }

    if (e.game) {
      assert.ok(GAME_META[e.game], `${e.id} names unknown game ${e.game}`);
    }
  }

  // Labels are unique within a case: the HUD rail lists them with nothing else
  // to tell two identical rows apart.
  for (const c of CASES) {
    const labels = evidenceFor(c.id).map((e) => e.label);
    assert.equal(
      new Set(labels).size,
      labels.length,
      `${c.id} has two pieces of evidence with the same HUD label`,
    );
  }

  // No case can deadlock on its own `needs` graph.
  for (const c of CASES) {
    if (!c.playable) continue;
    assert.ok(isCaseCompletable(c.id), `${c.id} can never reach 100%`);
  }

  // Not every piece may be gated behind a camera station, or the opening shot
  // offers the player nothing to click and the room reads as broken.
  for (const c of CASES) {
    if (!c.playable) continue;
    const open = evidenceFor(c.id).filter((e) => !e.seenFrom && !e.needs);
    assert.ok(open.length > 0, `${c.id} has nothing available on arrival`);
  }

  /**
   * A full playthrough, driven through the same predicate the room uses.
   *
   * isCaseCompletable only inspects the `needs` graph. This walks the case the
   * way a player does — stand at a station, take whatever is reachable from
   * it, move on — and asserts the case always finishes. It is the property
   * that a piece gated to a station it can never legally be seen from would
   * break, and the failure mode is a player re-searching a room that has
   * nothing left in it, which no exception would ever report.
   */
  for (const c of CASES) {
    if (!c.playable) continue;
    const scene = SCENES[c.scene];
    const pieces = evidenceFor(c.id);
    const collected: string[] = [];
    // Every station, plus the establishing shot, which is where you arrive.
    const shots: (string | null)[] = [null, ...scene.stations.map((s) => s.id)];

    for (let turn = 0; turn <= pieces.length; turn++) {
      const reachable = pieces.filter((e) =>
        shots.some((shot) => isAvailable(e, collected, shot)),
      );
      if (reachable.length === 0) break;
      // Take one at a time: taking the whole batch could mask an ordering
      // problem by collecting a piece's prerequisite in the same sweep.
      collected.push(reachable[0].id);
    }

    assert.equal(
      collected.length,
      pieces.length,
      `${c.id} strands the player: ${pieces.length - collected.length} piece(s) never become reachable`,
    );
  }
}

/* Scenes ------------------------------------------------------------------- */

function checkScene(scene: Scene) {
  const ids = scene.stations.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, `${scene.id}: duplicate station`);
  assert.ok(scene.stations.length > 0, `${scene.id} has no stations`);

  const inBox = (x: number, y: number) =>
    x >= 0 && x <= scene.world.w && y >= 0 && y <= scene.world.h;

  for (const s of scene.stations) {
    assert.ok(
      inBox(s.cam.x, s.cam.y),
      `${scene.id}/${s.id} parks the camera outside the room`,
    );
    assert.ok(s.cam.z > 0, `${scene.id}/${s.id} has non-positive zoom`);
  }

  assert.ok(
    inBox(scene.establish.x, scene.establish.y),
    `${scene.id} establishes outside the room`,
  );
}

checkScene(OFFICE);
checkScene(RESIDENCE);
assert.ok(SCENES.office && SCENES.residence, "scene registry is missing a room");

{
  // Every hotspot sits inside the room it belongs to, and every station an
  // evidence piece names actually exists in that room.
  const scene = RESIDENCE;
  for (const e of evidenceFor("about")) {
    const { x, y, w, h } = e.where;
    assert.ok(
      x - w / 2 >= -40 &&
        x + w / 2 <= scene.world.w + 40 &&
        y - h / 2 >= -40 &&
        y + h / 2 <= scene.world.h + 40,
      `${e.id} is painted outside the residence`,
    );
    // A hotspot has to stand on one of the planes the room is actually drawn
    // on. A depth of its own tracks correctly at the centre of the room and
    // slides off its object everywhere else, which nothing catches at runtime
    // and which a player only experiences as clicks that miss.
    assert.ok(
      LAYER_DEPTHS.includes(e.where.depth),
      `${e.id} has depth ${e.where.depth}, which is not one of ${LAYER_DEPTHS.join(", ")}`,
    );

    if (e.seenFrom) {
      assert.ok(
        scene.stations.some((s) => s.id === e.seenFrom),
        `${e.id} is only visible from "${e.seenFrom}", which is not a station`,
      );
    }
  }
}

{
  // Availability agrees with the dependency graph: a piece whose prerequisite
  // is held, viewed from its own station, must actually be clickable.
  const gated = EVIDENCE.find((e) => e.needs && e.seenFrom)!;
  assert.ok(gated, "expected at least one doubly-gated piece to check");
  assert.equal(
    isAvailable(gated, [], gated.seenFrom!),
    false,
    "gated evidence is available without its prerequisite",
  );
  assert.equal(
    isAvailable(gated, [gated.needs!], null),
    false,
    "station-gated evidence is available from the wrong shot",
  );
  assert.equal(
    isAvailable(gated, [gated.needs!], gated.seenFrom!),
    true,
    "gated evidence never becomes available",
  );
  assert.equal(
    isAvailable(gated, [gated.needs!, gated.id], gated.seenFrom!),
    false,
    "already-collected evidence is still offered",
  );
}

/* Puzzles ------------------------------------------------------------------ */

{
  // Timing: every round has a window a human can actually hit. At `speed` bars
  // per second a zone of `zone` is open for zone/speed seconds; below ~120ms
  // this stops being a reaction test and becomes a lottery.
  for (const [i, r] of TIMING_ROUNDS.entries()) {
    const openMs = (r.zone / r.speed) * 1000;
    assert.ok(openMs >= 120, `timing round ${i} is open for only ${openMs}ms`);
    assert.ok(r.zone > 0 && r.zone < 1, `timing round ${i} has a silly zone`);
  }
  // And they get harder, or the escalation the brief asks for is a fiction.
  for (let i = 1; i < TIMING_ROUNDS.length; i++) {
    const prev = TIMING_ROUNDS[i - 1].zone / TIMING_ROUNDS[i - 1].speed;
    const now = TIMING_ROUNDS[i].zone / TIMING_ROUNDS[i].speed;
    assert.ok(now < prev, `timing round ${i} is not harder than ${i - 1}`);
  }

  // The target always lands inside the bar, for any roll.
  const r = rng(7);
  for (const round of TIMING_ROUNDS) {
    for (let i = 0; i < 500; i++) {
      const t = timingTarget(round, r);
      assert.ok(t.start >= 0 && t.end <= 1, "timing target falls off the bar");
      assert.ok(timingHit((t.start + t.end) / 2, t), "centre of target misses");
      assert.ok(!timingHit(t.start - 0.01, t), "hit registers before the zone");
    }
  }
}

{
  // Memory: right length, known glyphs, and no immediate repeat.
  const r = rng(11);
  for (let i = 0; i < 400; i++) {
    const seq = buildSequence(MEMORY_LENGTH, r);
    assert.equal(seq.length, MEMORY_LENGTH);
    for (const s of seq) assert.ok(SYMBOLS.includes(s as never), `bad glyph ${s}`);
    for (let j = 1; j < seq.length; j++) {
      assert.notEqual(seq[j], seq[j - 1], "sequence repeats a glyph back to back");
    }
  }
}

{
  // The lock's code is exactly what the clues spell, in the order the HUD
  // lists them. This is the assertion that stops the room and the puzzle
  // drifting apart.
  assert.equal(
    LOCK_CODE,
    LOCK_CLUES.map((c) => c.digit).join(""),
    "the lock code is not what the clues say",
  );
  assert.equal(LOCK_CODE.length, LOCK_CLUES.length, "one clue per digit");
  for (const c of LOCK_CLUES) {
    assert.ok(
      Number.isInteger(c.digit) && c.digit >= 0 && c.digit <= 9,
      `clue "${c.source}" does not yield a single digit`,
    );
    assert.ok(c.reads.trim().length > 0, `clue "${c.source}" reads as nothing`);
  }
}

{
  // Hidden object: the answer is not hiding among duplicates of itself.
  assert.ok(!SEARCH_DECOYS.includes(SEARCH_TARGET), "a decoy IS the target");
  assert.equal(
    new Set(SEARCH_DECOYS).size,
    SEARCH_DECOYS.length,
    "duplicate decoys",
  );
  assert.ok(SEARCH_DECOYS.length >= 4, "not enough clutter to hide in");
}

{
  // Filing: every document goes somewhere real, and every drawer is used —
  // an empty drawer is a hint that the player has mis-sorted something.
  for (const d of SORT_DOCS) {
    assert.ok(SORT_BINS.includes(d.bin), `${d.id} files into unknown ${d.bin}`);
  }
  for (const bin of SORT_BINS) {
    assert.ok(
      SORT_DOCS.some((d) => d.bin === bin),
      `nothing is ever filed under ${bin}`,
    );
  }
  assert.equal(
    new Set(SORT_DOCS.map((d) => d.id)).size,
    SORT_DOCS.length,
    "duplicate document id",
  );
}

{
  // Reconstruct: swap is a real swap, order check is exact, and the opening
  // board is never already correct.
  assert.deepEqual(swapAt(["a", "b", "c"], 0, 2), ["c", "b", "a"]);
  assert.deepEqual(swapAt(["a", "b"], 0, 9), ["a", "b"], "out-of-range swap mutated");
  assert.ok(isOrdered(PIPELINE.slice(), PIPELINE));
  assert.ok(!isOrdered(["API", "CLIENT", "SERVER", "DATABASE"], PIPELINE));

  const r = rng(23);
  for (let i = 0; i < 1000; i++) {
    assert.ok(
      !isOrdered(shuffleUnsolved(PIPELINE, r), PIPELINE),
      "reconstruct opened already solved",
    );
  }
  // Degenerate inputs do not hang or throw.
  assert.deepEqual(shuffleUnsolved([], r), []);
  assert.deepEqual(shuffleUnsolved(["only"], r), ["only"]);
}

/* Progress ----------------------------------------------------------------- */

{
  let s = emptyProgress(0);
  assert.equal(percent(s), 0);
  assert.equal(isComplete(s), false);

  // Unknown ids are refused rather than silently inflating the counter.
  assert.equal(collect(s, "not-a-real-piece", 1).collected.length, 0);

  // Collecting twice is a no-op, so a double-fire cannot show "9 / 8".
  s = collect(s, EVIDENCE[0].id, 1);
  s = collect(s, EVIDENCE[0].id, 2);
  assert.equal(s.collected.length, 1, "collect is not idempotent");

  for (const e of EVIDENCE) s = collect(s, e.id, 3);
  assert.equal(percent(s), 100, "collecting everything is not 100%");
  assert.ok(isComplete(s));

  const about = caseProgress(s, "about");
  assert.equal(about.found, about.total);
  assert.ok(about.solved && !about.sealed);

  // A case with no environment yet reads as sealed, not as zero of zero.
  const sealed = caseProgress(emptyProgress(0), "certificates");
  assert.ok(sealed.sealed && !sealed.solved);
}

{
  // Save parsing survives everything a real browser can hand back.
  assert.equal(parseProgress("not json"), null);
  assert.equal(parseProgress("null"), null);
  assert.equal(parseProgress('{"v":0,"collected":[]}'), null, "old save accepted");

  const good = JSON.stringify({
    v: SAVE_VERSION,
    collected: [EVIDENCE[0].id, EVIDENCE[0].id, "ghost-id"],
    flags: ["seen-intro", "seen-intro"],
    startedAt: 1,
    updatedAt: 2,
  });
  const parsed = parseProgress(good)!;
  assert.ok(parsed, "a valid save was rejected");
  assert.deepEqual(parsed.collected, [EVIDENCE[0].id], "ghost id survived load");
  assert.deepEqual(parsed.flags, ["seen-intro"], "flags not deduped");
  assert.ok(percent(parsed) > 0 && percent(parsed) < 100);
}

console.log(
  `check-files: OK — ${CASES.length} cases, ${EVIDENCE.length} pieces of evidence, ` +
    `${Object.keys(GAME_META).length} games, ${Object.keys(SCENES).length} rooms.`,
);
