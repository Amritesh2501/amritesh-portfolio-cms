/**
 * Every cabinet lock has to be pickable by the one signal the player is given.
 *
 * The player sees tension and nothing else. If tension is not honest, the lock
 * is not hard — it is broken, and it gets reported as "this one is impossible"
 * rather than as a bug, which is the worst kind of defect to own.
 *
 * So this picks thousands of locks the way a player would: sweep the barrel
 * following tension uphill, and when it peaks, try notches. If that strategy
 * ever fails to open a lock, the lock lied.
 */
import assert from "node:assert";
import {
  FEEL,
  MIN_GAP,
  NOTCHES,
  TOLERANCE,
  TRACK,
  TUMBLERS,
  makeLock,
  seated,
  tensionAt,
  turn,
} from "../src/lib/screwlock";

/** Deterministic, so a failure can be reproduced rather than re-rolled. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const LOCKS = 7000;
/** How finely the player can move the pin. A mouse over a few hundred pixels
 *  is finer than this; if it is pickable at this step it is pickable by hand. */
const STEP = 0.5;

let picked = 0;

for (let n = 0; n < LOCKS; n++) {
  const rnd = rng(n + 1);
  const lock = makeLock(rnd);

  assert.equal(lock.length, TUMBLERS, "a lock came out the wrong length");

  /* The shape of the lock ---------------------------------------------------*/

  const depths = lock.map((t) => t.depth).sort((a, b) => a - b);
  for (let i = 0; i < depths.length; i++) {
    assert.ok(
      depths[i] >= TOLERANCE && depths[i] <= TRACK - TOLERANCE,
      `tumbler at ${depths[i].toFixed(1)} is inside the tolerance of an end, so it ` +
        `cannot be approached from both sides`,
    );
    if (i > 0) {
      assert.ok(
        depths[i] - depths[i - 1] >= MIN_GAP,
        `two tumblers ${(depths[i] - depths[i - 1]).toFixed(1)} apart, closer than the ` +
          `${MIN_GAP} minimum, so one pin position can seat either`,
      );
    }
  }

  for (let i = 1; i < lock.length; i++) {
    assert.notEqual(
      lock[i].notch,
      lock[i - 1].notch,
      "two tumblers in a row on the same notch, so the second seats itself",
    );
  }

  /* Tension has to be honest -------------------------------------------------*/

  for (const t of lock) {
    // Rising all the way in from both sides, and dead outside the feel range.
    let last = -1;
    for (let d = FEEL; d >= 0; d -= STEP) {
      const v = tensionAt(t.depth - d, t);
      assert.ok(v > last, "tension did not rise approaching a tumbler from below");
      last = v;
    }
    assert.equal(tensionAt(t.depth - FEEL - 1, t), 0, "tension leaks outside the feel range");
    assert.equal(tensionAt(t.depth + FEEL + 1, t), 0, "tension leaks outside the feel range");
    assert.ok(tensionAt(t.depth, t) >= 1, "tension does not peak on the tumbler itself");
  }

  /* Now actually pick it -----------------------------------------------------*/

  let notch = 0;
  let set = 0;

  for (let i = 0; i < lock.length; i++) {
    const t = lock[i];

    // Sweep for the peak, which is all the player can do.
    let best = 0;
    let bestAt = 0;
    for (let p = 0; p <= TRACK; p += STEP) {
      const v = tensionAt(p, t);
      if (v > best) {
        best = v;
        bestAt = p;
      }
    }
    assert.ok(best > 0, "a tumbler could not be felt anywhere on the barrel");

    // Then try the cam. Turning one way at a time, as a key does.
    let opened = false;
    for (let k = 0; k < NOTCHES; k++) {
      if (seated(bestAt, notch, t)) {
        opened = true;
        break;
      }
      notch = turn(notch, 1);
    }
    assert.ok(opened, `tumbler ${i} would not seat at the peak of its own tension`);
    set++;
  }

  assert.equal(set, TUMBLERS, "the lock did not open");
  picked++;
}

assert.equal(picked, LOCKS, "not every lock was picked");

console.log(
  `check-screwlock: OK — ${TUMBLERS} tumblers, ${NOTCHES} notches, ${LOCKS} locks, ` +
    `every one pickable by following the tension.`,
);
