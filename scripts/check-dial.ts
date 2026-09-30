/**
 * The locker dial: every combination opens by following the ticks, nothing
 * else ticks, and a wrong press never counts. Plus every archive prop has a
 * sound that exists.
 *
 *   npx tsx scripts/check-dial.ts
 */
import assert from "node:assert/strict";
import { DIAL_LENGTH, DIAL_SIZE, dirFor, isOpen, makeCombo, newDial, press, ticks, turn, type Dial } from "../src/lib/dial";
import { ARCHIVES } from "../src/lib/archives";
import { PROP_SOUNDS } from "../src/lib/sound";

let ticked = 0;
for (let game = 0; game < 2000; game++) {
  const combo = makeCombo();
  assert.equal(combo.length, DIAL_LENGTH);
  let d: Dial = newDial(combo);
  assert(!ticks(d), "never ticks before the first turn");

  for (let stage = 0; stage < DIAL_LENGTH; stage++) {
    const dir = dirFor(stage);
    // Turn the required way until it ticks; it must within one revolution.
    let steps = 0;
    do {
      d = turn(d, dir);
      steps++;
      if (ticks(d)) break;
      assert(steps <= DIAL_SIZE, `no tick within a revolution: ${combo}`);
    } while (true);
    assert.equal(d.pos, combo[stage]);
    ticked++;

    // The same number approached the wrong way does not tick.
    const back = turn(turn(d, dir), (-dir) as 1 | -1);
    assert.equal(back.pos, d.pos);
    assert(!ticks(back), "wrong direction must not tick");

    d = press(d);
    assert.equal(d.stage, stage + 1);
  }
  assert(isOpen(d));
}

// A press off the tick slips back to the start and counts.
let d = newDial([10, 20, 30]);
for (let i = 0; i < 10; i++) d = turn(d, 1);
d = press(d);
assert.equal(d.stage, 1);
d = turn(d, -1);
d = press(d);
assert.equal(d.stage, 0);
assert.equal(d.slips, 1);

// Wrapping round: 39 → 0 is one step.
d = newDial([5, 10, 15]);
d = turn(d, -1);
assert.equal(d.pos, DIAL_SIZE - 1);

// Every archive prop plays a sound that exists; the lockers are on the dial.
for (const room of ARCHIVES)
  for (const p of room.props) assert(p.sfx in PROP_SOUNDS, `${room.id}/${p.id}: ${p.sfx}`);
const lockers = ARCHIVES.find((r) => r.id === "training")!.props.find((p) => p.id === "lockers")!;
assert.equal(lockers.lock, "dial");
assert(lockers.locked);
assert(ARCHIVES.find((r) => r.id === "vault")!.props.some((p) => p.opens === "cctv"));

console.log(`check-dial: OK — 2000 dials opened by ear (${ticked} ticks), no tick the wrong way.`);
