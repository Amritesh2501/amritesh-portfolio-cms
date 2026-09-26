/**
 * The cabinet lock, as rules.
 *
 * Two hands. The pin rides along the barrel and tells you, by tension alone,
 * how near a tumbler it is; the screwdriver turns the cam to one of eight
 * notches. A tumbler seats when the pin is on it AND the cam is at that
 * tumbler's notch, which is the reason it needs both hands: either one alone
 * is a puzzle with a single input and no puzzle at all.
 *
 * Different from the bedroom's lockpick on purpose. That one is a search along
 * one axis — find the point, press. This is a search along one axis and then a
 * choice on a second, and the second is on the keyboard, so the two never feel
 * like the same lock with different art.
 *
 * Four ways a generated lock is unfair, none of which would be reported as a
 * bug — only as "this one is impossible":
 *
 *   - two tumblers close enough on the barrel that one position seats either,
 *     so the order you set them in is luck;
 *   - a tumbler within a tolerance of the end of the barrel, which cannot be
 *     approached from both sides and so cannot be felt for;
 *   - two tumblers in a row on the same notch, which seats the second one the
 *     instant the first gives and reads as the lock skipping;
 *   - tension that does not rise monotonically toward the tumbler, which makes
 *     the one signal the player is given a liar.
 *
 * See scripts/check-screwlock.ts.
 */

/** How many have to be seated. Four is a cabinet; six is a safe and a chore. */
export const TUMBLERS = 4;

/** How far the pin travels, in its own units. */
export const TRACK = 100;

/** Where the cam can point. Eight is enough that guessing is slower than
 *  turning, few enough that turning to any of them is a flick of a key. */
export const NOTCHES = 8;

/** How close the pin has to be for a tumbler to take. */
export const TOLERANCE = 5;

/** The least distance between two tumblers on the barrel. Comfortably more
 *  than twice the tolerance, so their catching ranges cannot touch. */
export const MIN_GAP = 16;

/** How far out the pin still feels anything. Outside this, tension is zero and
 *  the barrel is dead — which is what makes sweeping it a search. */
export const FEEL = 22;

export type Tumbler = {
  /** Where it sits on the barrel, 0..TRACK. */
  depth: number;
  /** Which notch the cam has to be at, 0..NOTCHES-1. */
  notch: number;
};

/**
 * A lock that can be picked.
 *
 * Depths are drawn by walking the barrel in even slices and jittering inside
 * each one, rather than drawn at random and rejected — with four tumblers and
 * a 16 unit gap, rejection sampling works but spends most of its time throwing
 * locks away, and the slice version cannot fail.
 */
export function makeLock(rnd: () => number = Math.random): Tumbler[] {
  // Keep a tolerance clear of both ends so every tumbler can be approached
  // from either side.
  const lo = TOLERANCE + 4;
  const hi = TRACK - TOLERANCE - 4;
  const span = (hi - lo) / TUMBLERS;

  // How far a tumbler may wander inside its own slice. One slice apart minus
  // the wander is the closest two neighbours can ever end up, so this is what
  // has to be held down rather than a padding at each edge: padding the edges
  // leaves the wander at nearly a whole slice, and two tumblers either side of
  // a boundary then land a few units apart. Which is what they did.
  const wander = Math.max(0, span - MIN_GAP - 0.5);

  const out: Tumbler[] = [];
  for (let i = 0; i < TUMBLERS; i++) {
    const depth = lo + i * span + rnd() * wander;

    let notch = Math.floor(rnd() * NOTCHES);
    // Never the same notch twice running: a tumbler that seats without the cam
    // moving reads as the lock giving up rather than as a tumbler set.
    if (i > 0 && notch === out[i - 1].notch) notch = (notch + 1) % NOTCHES;

    out.push({ depth, notch });
  }

  return out;
}

/**
 * What the pin feels, 0 to 1.
 *
 * Strictly increasing as the pin closes on the tumbler and flat zero outside
 * `FEEL`. Strictly, because this is the only information the player gets and a
 * plateau near the top is indistinguishable from having arrived.
 */
export function tensionAt(pin: number, t: Tumbler): number {
  const d = Math.abs(pin - t.depth);
  if (d >= FEEL) return 0;
  return 1 - d / FEEL;
}

/** Both hands right: the pin on the tumbler and the cam at its notch. */
export function seated(pin: number, notch: number, t: Tumbler): boolean {
  return notch === t.notch && Math.abs(pin - t.depth) <= TOLERANCE;
}

/** Turning the cam. Wraps, because a cam that stops at the ends is a slider. */
export function turn(notch: number, by: number): number {
  return (notch + by + NOTCHES) % NOTCHES;
}
