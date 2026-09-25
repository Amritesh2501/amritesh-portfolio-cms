/**
 * No question on the poster is unfair.
 *
 *   npm run check:sums
 *
 * All four kinds are generated, so the failures here are generated too — and
 * none of them would ever be reported as a bug, only as "this one is wrong".
 * A subtraction that goes negative is a meaner question than the poster
 * advertises; a division that does not come out whole cannot be answered in a
 * box that takes integers; an answer that equals its own first operand reads
 * as a trick when it is an accident.
 */
import assert from "node:assert/strict";
import {
  SUMS_SECONDS,
  SUMS_TO_PASS,
  asText,
  makeRun,
  makeSum,
  type Op,
} from "../src/lib/sums";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

{
  assert.ok(SUMS_TO_PASS > 1, "one sum is not a run");
  assert.ok(
    SUMS_SECONDS >= SUMS_TO_PASS * 5,
    "the clock does not allow five seconds a sum, which nobody can type in",
  );
}

/* Every question ---------------------------------------------------------- */

{
  const r = rng(31);
  const seen = new Set<Op>();

  for (let i = 0; i < 40000; i++) {
    const sum = makeSum(i % 24, r);
    seen.add(sum.op);

    // The arithmetic is right.
    const expected =
      sum.op === "+"
        ? sum.a + sum.b
        : sum.op === "-"
          ? sum.a - sum.b
          : sum.op === "×"
            ? sum.a * sum.b
            : sum.a / sum.b;
    assert.equal(sum.answer, expected, `${asText(sum)} does not equal ${sum.answer}`);

    // Whole, positive, and typeable.
    assert.ok(Number.isInteger(sum.answer), `${asText(sum)} does not come out whole`);
    assert.ok(sum.answer > 0, `${asText(sum)} comes out at ${sum.answer}`);
    assert.ok(Number.isInteger(sum.a) && Number.isInteger(sum.b), "an operand is not whole");
    assert.ok(sum.b !== 0, "a divisor of zero got through");

    // Not a giveaway, and not a trick.
    assert.notEqual(sum.answer, sum.a, `${asText(sum)} answers to its own first number`);
    assert.ok(sum.a > 0 && sum.b > 0, `${asText(sum)} has a non-positive operand`);
  }

  assert.equal(seen.size, 4, "not every kind of sum is being generated");
}

/* A run ------------------------------------------------------------------- */

{
  const r = rng(53);
  for (let i = 0; i < 4000; i++) {
    const run = makeRun(SUMS_TO_PASS, r);
    assert.equal(run.length, SUMS_TO_PASS, "the run came out the wrong length");

    // Kinds alternate: a run of six that is four additions in a row is a
    // different and duller puzzle than the one advertised.
    for (let j = 1; j < Math.min(run.length, 4); j++) {
      assert.notEqual(
        run[j].op,
        run[j - 1].op,
        "two of the same kind of sum in a row",
      );
    }
  }
}

console.log(
  `check-sums: OK — 44000 sums, all four kinds, every one whole and positive.`,
);
