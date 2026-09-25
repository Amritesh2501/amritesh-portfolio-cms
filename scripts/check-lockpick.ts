/**
 * The lock is honest and can always be picked.
 *
 *   npm run check:lockpick
 *
 * The tension number IS the feedback — it is the only thing the player gets —
 * so anything wrong with it is a lock that lies. A plateau is a region where
 * moving the pick tells you nothing; a dip sends somebody following it
 * correctly away from the answer. Neither would ever be reported as a bug,
 * only as "this one is impossible".
 */
import assert from "node:assert/strict";
import {
  FEEL,
  MIN_GAP,
  PINS,
  TOLERANCE,
  TRACK,
  isSet,
  makePins,
  tensionAt,
} from "../src/lib/lockpick";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/* The numbers themselves ------------------------------------------------- */

{
  assert.ok(PINS > 1, "a lock with one pin is a button");
  assert.ok(TOLERANCE > 0, "no pin can ever be set");
  assert.ok(FEEL > TOLERANCE, "tension is felt only once the pin is already set");
  assert.ok(MIN_GAP > TOLERANCE * 2, "two pins can be set by the same press");

  // Enough room on the track for the pins with their gaps and a tolerance of
  // clearance at each end, or makePins would spin and fall back every time.
  const needed = (PINS - 1) * MIN_GAP + TOLERANCE * 2;
  assert.ok(
    needed <= TRACK,
    `${PINS} pins need ${needed} units of track and there are only ${TRACK}`,
  );
}

/* The locks --------------------------------------------------------------- */

{
  const r = rng(23);
  for (let i = 0; i < 5000; i++) {
    const pins = makePins(PINS, r);

    assert.equal(pins.length, PINS, "the lock came out with the wrong number of pins");

    for (const spot of pins) {
      // A pin set by driving the pick to the stop is not a pin, it is a
      // corner. Keeping a full tolerance clear of each end is what stops that.
      assert.ok(
        spot >= TOLERANCE && spot <= TRACK - TOLERANCE,
        `a pin at ${spot} can be set by pushing the pick to the end of the track`,
      );
    }

    for (let j = 1; j < pins.length; j++) {
      assert.ok(
        pins[j] - pins[j - 1] >= MIN_GAP - 1,
        `two pins are ${pins[j] - pins[j - 1]} apart, close enough for one press to set either`,
      );
    }

    // Sorted, because the UI works down them in order and a lock whose pins
    // are out of order would jump the pick about the track.
    for (let j = 1; j < pins.length; j++) {
      assert.ok(pins[j] > pins[j - 1], "the pins are not in order along the track");
    }
  }
}

/* The feel ---------------------------------------------------------------- */

{
  const spot = 50;

  // Dead on is full tension; a long way off is none.
  assert.equal(tensionAt(spot, spot), 1, "the pin gives nothing at its own point");
  assert.equal(tensionAt(0, spot), 0, "tension is felt from across the track");
  assert.equal(tensionAt(spot + FEEL, spot), 0, "tension does not fall to nothing at the edge of feel");

  // Strictly increasing on the way in, from both sides. This is the property
  // the whole puzzle rests on: follow the number up and you arrive.
  for (const dir of [-1, 1]) {
    let last = -1;
    for (let away = FEEL; away >= 0; away -= 0.5) {
      const t = tensionAt(spot + dir * away, spot);
      assert.ok(
        t > last,
        `tension does not rise between ${away + 0.5} and ${away} units out`,
      );
      last = t;
    }
  }

  // And what is set is what is close, in both directions.
  assert.ok(isSet(spot, spot));
  assert.ok(isSet(spot + TOLERANCE, spot));
  assert.ok(isSet(spot - TOLERANCE, spot));
  assert.ok(!isSet(spot + TOLERANCE + 0.5, spot));
  assert.ok(!isSet(spot - TOLERANCE - 0.5, spot));
}

/* Solvable ---------------------------------------------------------------- */

{
  // Walk the track a unit at a time and set every pin the way a player would:
  // follow the tension up, press at the top. If any lock cannot be picked this
  // way it cannot be picked.
  const r = rng(77);
  for (let i = 0; i < 2000; i++) {
    const pins = makePins(PINS, r);
    for (const spot of pins) {
      let best = 0;
      let bestAt = 0;
      for (let pick = 0; pick <= TRACK; pick += 1) {
        const t = tensionAt(pick, spot);
        if (t > best) {
          best = t;
          bestAt = pick;
        }
      }
      assert.ok(best > 0, `a pin at ${spot} gives no tension anywhere on the track`);
      assert.ok(
        isSet(bestAt, spot),
        `following the tension to its peak at ${bestAt} does not set the pin at ${spot}`,
      );
    }
  }
}

console.log(
  `check-lockpick: OK — ${PINS} pins, 7000 locks, every one pickable by following the tension.`,
);
