/**
 * The terminal on his desk, as rules.
 *
 * A substitution cipher with the key ON SCREEN. That sounds like giving the
 * answer away and it is not: the work is doing twelve lookups accurately while
 * a clock runs, which is a different thing from cryptanalysis and a much
 * better thing to put in front of somebody who came here to look at a
 * portfolio. Nobody is going to frequency-analyse a stranger's bedroom.
 *
 * Everything that can make the puzzle unsolvable lives here rather than in the
 * component, because every one of those failures looks like a player being
 * stupid rather than like a bug:
 *
 *   - a letter that maps to itself is a letter already decoded, and the one
 *     thing that makes a cipher feel broken is finding a word in the clear;
 *   - two letters mapping to the same letter cannot be undone, so the answer
 *     the player is holding would be rejected;
 *   - a key missing a letter the message uses is a puzzle with no solution.
 *
 * See scripts/check-cipher.ts, which runs all three against several thousand
 * generated keys rather than trusting the shuffle.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Three strikes. The spec's number, and it is the right one: two is stingy on
 *  a typing puzzle and four is not a threat. */
export const MISTAKES_ALLOWED = 3;

export type CipherStage = {
  /** What the player has to arrive at. Letters and single spaces only. */
  plain: string;
  /** Shown under the message. Not a clue to the cipher — a clue to the word. */
  hint: string;
  /** How long this one gets. Longer messages get more, but not proportionally:
   *  the later stages are supposed to be tight. */
  seconds: number;
};

/**
 * Four stages, and every one of them is something out of his own work.
 *
 * Short to long, and the hint carries the theme so that a stage is readable as
 * "this is about the portfolio" rather than as a random word.
 */
export const CIPHER_STAGES: CipherStage[] = [
  { plain: "SHIP IT", hint: "What the sticker on the laptop says.", seconds: 60 },
  { plain: "FLEET ZENO", hint: "The platform the drivers actually use.", seconds: 70 },
  { plain: "THE SCHEMA IS THE CONTRACT", hint: "His first rule.", seconds: 110 },
  { plain: "BORING WHERE IT COUNTS", hint: "And sharp where it shows.", seconds: 100 },
];

export type Key = Record<string, string>;

/**
 * A substitution key with no letter left standing.
 *
 * A derangement, in other words: a permutation with no fixed point. Built by
 * shuffling and then repairing rather than by rejecting and retrying, because
 * rejection sampling on 26 letters throws away about two thirds of its work
 * and this runs on a click.
 *
 * The repair is the standard one: any letter sitting on itself is swapped with
 * its neighbour, and the last one wraps to the first. A swap can only create a
 * fixed point if the two letters were already each other's image, which a
 * permutation rules out, so one pass is enough.
 */
export function makeKey(rnd: () => number = Math.random): Key {
  const to = [...ALPHABET];
  for (let i = to.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [to[i], to[j]] = [to[j], to[i]];
  }

  for (let i = 0; i < to.length; i++) {
    if (to[i] !== ALPHABET[i]) continue;
    const j = i === to.length - 1 ? 0 : i + 1;
    [to[i], to[j]] = [to[j], to[i]];
  }

  const key: Key = {};
  ALPHABET.forEach((letter, i) => {
    key[letter] = to[i];
  });
  return key;
}

/** Plain to cipher. Spaces survive, because a message with its word breaks
 *  hidden is a different and much worse puzzle. */
export function encode(plain: string, key: Key): string {
  return [...plain.toUpperCase()]
    .map((c) => (c === " " ? " " : (key[c] ?? c)))
    .join("");
}

/**
 * The lookup table the player is actually given.
 *
 * Only the letters this message uses, sorted by the CIPHER letter — because
 * that is the order somebody reads the message in, and a table sorted by the
 * answer makes them scan the whole thing for every character.
 */
export function decoderFor(plain: string, key: Key): { from: string; to: string }[] {
  const used = new Set([...plain.toUpperCase()].filter((c) => c !== " "));
  return [...used]
    .map((letter) => ({ from: key[letter], to: letter }))
    .sort((a, b) => a.from.localeCompare(b.from));
}

/** Where the answer boxes go: one per letter, and a gap for each space. */
export function slotsFor(plain: string): ("letter" | "gap")[] {
  return [...plain.toUpperCase()].map((c) => (c === " " ? "gap" : "letter"));
}

/** Case and stray spacing are not the puzzle. */
export function isCorrect(guess: string, plain: string): boolean {
  const tidy = (s: string) => s.toUpperCase().replace(/\s+/g, " ").trim();
  return tidy(guess) === tidy(plain);
}
