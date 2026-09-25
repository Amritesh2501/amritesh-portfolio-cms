/**
 * The poster over the bed, as rules.
 *
 * Mental arithmetic against a clock: addition, subtraction, multiplication and
 * division, one of each kind before it repeats, and a photograph behind it.
 *
 * All four kinds are generated rather than listed, so what this file has to
 * guarantee is that no generated question is unfair. Three ways that happens
 * and none of them would be reported as a bug:
 *
 *   - a subtraction that goes negative, which is not wrong but is a different
 *     and meaner question than the one the poster advertises;
 *   - a division that does not come out whole, which cannot be answered in a
 *     box that takes integers;
 *   - a question whose answer is also its own first operand, which reads as a
 *     trick when it is an accident.
 *
 * See scripts/check-sums.ts, which generates tens of thousands of them.
 */

export type Op = "+" | "-" | "×" | "÷";

export type Sum = {
  op: Op;
  a: number;
  b: number;
  answer: number;
};

/** How many to get right. Six is long enough to be a run and short enough
 *  that one slip does not feel like starting over. */
export const SUMS_TO_PASS = 6;

/** Seconds for the whole run, not per question: the pressure should be on
 *  keeping going, not on any single sum. */
export const SUMS_SECONDS = 75;

/** The order the kinds come in, so a run is never all of one thing. */
const ORDER: Op[] = ["+", "×", "-", "÷"];

/**
 * One question, of the kind this position in the run calls for.
 *
 * Subtraction is built from its own answer — pick the result and the smaller
 * operand, then add — which is what keeps it off negatives without rejecting
 * anything. Division is built from its answer the same way: pick the divisor
 * and the quotient, multiply for the dividend, and it is whole by
 * construction rather than by checking.
 */
export function makeSum(index: number, rnd: () => number = Math.random): Sum {
  const op = ORDER[index % ORDER.length];
  const pick = (min: number, max: number) =>
    min + Math.floor(rnd() * (max - min + 1));

  // Harder as the run goes on, but only a little: this is a poster, not an
  // exam.
  const step = Math.floor(index / ORDER.length);

  if (op === "+") {
    const a = pick(12 + step * 10, 49 + step * 20);
    const b = pick(12 + step * 10, 49 + step * 20);
    return { op, a, b, answer: a + b };
  }

  if (op === "×") {
    const a = pick(3, 9 + step * 3);
    const b = pick(3, 9 + step * 2);
    return { op, a, b, answer: a * b };
  }

  if (op === "-") {
    // From the answer up, so it never goes negative.
    const answer = pick(6, 40 + step * 20);
    const b = pick(4, 30 + step * 10);
    return { op, a: answer + b, b, answer };
  }

  // From the answer up as well, so it always divides.
  const answer = pick(2, 9 + step * 3);
  const b = pick(2, 9 + step);
  return { op, a: answer * b, b, answer };
}

/** A whole run, generated up front so the length is known and the kinds
 *  alternate rather than being drawn one at a time. */
export function makeRun(
  count: number = SUMS_TO_PASS,
  rnd: () => number = Math.random,
): Sum[] {
  return Array.from({ length: count }, (_, i) => makeSum(i, rnd));
}

export const asText = (sum: Sum) => `${sum.a} ${sum.op} ${sum.b}`;
