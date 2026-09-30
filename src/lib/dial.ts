/**
 * The combination dial on the lockers.
 *
 * Turn with A and D. Each number clicks as it goes past; the right number
 * TICKS instead, but only when you arrive at it turning the right way (right,
 * then left, then right, like a real padlock). Press Space on the tick to set
 * that number. Space anywhere else slips the dial back to the first number.
 *
 * Pure, so scripts/check-dial.ts can prove every combination can be opened by
 * following the ticks, and that nothing else ticks.
 */

export const DIAL_SIZE = 40;
export const DIAL_LENGTH = 3;

/** +1 is D (clockwise, numbers going up), -1 is A. */
export type Dir = 1 | -1;

export type Dial = {
  pos: number;
  combo: number[];
  /** How many numbers are set. */
  stage: number;
  last: Dir | 0;
  slips: number;
};

/** Which way each number has to be approached. */
export const dirFor = (stage: number): Dir => (stage % 2 === 0 ? 1 : -1);

/**
 * Three numbers, each far enough from the one before (and from 0, where the
 * dial starts) that nobody lands on one by accident in the first few clicks.
 */
export function makeCombo(rnd: () => number = Math.random): number[] {
  const out: number[] = [];
  let prev = 0;
  while (out.length < DIAL_LENGTH) {
    const n = Math.floor(rnd() * DIAL_SIZE);
    const gap = Math.min(Math.abs(n - prev), DIAL_SIZE - Math.abs(n - prev));
    if (gap >= 6) {
      out.push(n);
      prev = n;
    }
  }
  return out;
}

export const newDial = (combo = makeCombo()): Dial => ({ pos: 0, combo, stage: 0, last: 0, slips: 0 });

export const turn = (d: Dial, dir: Dir): Dial => ({
  ...d,
  pos: (d.pos + dir + DIAL_SIZE) % DIAL_SIZE,
  last: dir,
});

export const isOpen = (d: Dial) => d.stage >= d.combo.length;

/** Does the dial tick where it is now? */
export function ticks(d: Dial): boolean {
  if (isOpen(d)) return false;
  return d.pos === d.combo[d.stage] && d.last === dirFor(d.stage);
}

/** Space: set the number on a tick, otherwise slip back to the start. */
export function press(d: Dial): Dial {
  if (isOpen(d)) return d;
  if (ticks(d)) return { ...d, stage: d.stage + 1 };
  return { ...d, stage: 0, slips: d.slips + 1 };
}
