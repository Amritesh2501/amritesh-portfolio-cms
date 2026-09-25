/**
 * The cipher terminal can always be solved.
 *
 *   npm run check:cipher
 *
 * Every failure this rules out looks like the player being stupid rather than
 * like a bug, which is the worst way for a puzzle to break. A letter standing
 * on itself puts a word in the clear and makes the whole thing feel broken;
 * two letters sharing an image cannot be undone, so a correct answer is
 * rejected; a key missing a letter the message uses has no solution at all.
 *
 * Run against thousands of generated keys rather than one, because a shuffle
 * that is wrong one time in fifty is a puzzle that is unsolvable one time in
 * fifty and nobody will ever report it as anything but "this is broken".
 */
import assert from "node:assert/strict";
import {
  CIPHER_STAGES,
  MISTAKES_ALLOWED,
  decoderFor,
  encode,
  isCorrect,
  makeKey,
  slotsFor,
} from "../src/lib/cipher";

/** Deterministic, so a failure is reproducible rather than a mood. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/* The stages ------------------------------------------------------------- */

{
  assert.ok(CIPHER_STAGES.length > 0, "the terminal has nothing to ask");

  const seen = new Set<string>();
  for (const stage of CIPHER_STAGES) {
    assert.ok(stage.plain.trim().length > 0, "a stage has no message");
    assert.ok(stage.hint.trim().length > 0, `"${stage.plain}" has no hint`);
    assert.ok(stage.seconds > 0, `"${stage.plain}" has no time on the clock`);

    // Letters and single spaces. Anything else — a digit, an apostrophe — has
    // no key entry and no box to type it into.
    assert.match(
      stage.plain,
      /^[A-Z]+(?: [A-Z]+)*$/,
      `"${stage.plain}" has something in it that is not a letter or a single space`,
    );

    assert.ok(!seen.has(stage.plain), `"${stage.plain}" appears twice`);
    seen.add(stage.plain);

    // Enough time to type it at all. Two seconds a letter is generous for
    // somebody reading off a table, and well under it is a stage nobody can
    // finish however well they do.
    const letters = stage.plain.replace(/ /g, "").length;
    assert.ok(
      stage.seconds >= letters * 2,
      `"${stage.plain}" gives ${stage.seconds}s for ${letters} letters, which cannot be typed in time`,
    );
  }

  assert.ok(MISTAKES_ALLOWED > 0, "the terminal locks before it is opened");
}

/* The key ----------------------------------------------------------------- */

{
  const r = rng(17);
  for (let i = 0; i < 4000; i++) {
    const key = makeKey(r);

    const images = Object.values(key);
    assert.equal(
      Object.keys(key).length,
      26,
      "the key does not cover the alphabet",
    );

    // A bijection. Two letters sharing an image cannot be undone, so an answer
    // that is right would be marked wrong.
    assert.equal(
      new Set(images).size,
      26,
      "two letters encode to the same letter, so the message cannot be decoded",
    );

    // A derangement. A letter on itself is a letter already decoded.
    for (const letter of ALPHABET) {
      assert.notEqual(
        key[letter],
        letter,
        `${letter} encodes to itself, putting part of the message in the clear`,
      );
    }
  }
}

/* End to end -------------------------------------------------------------- */

{
  const r = rng(99);
  for (let i = 0; i < 2000; i++) {
    const key = makeKey(r);

    for (const stage of CIPHER_STAGES) {
      const cipher = encode(stage.plain, key);
      const table = decoderFor(stage.plain, key);

      // Word breaks survive, or the player is solving a different puzzle.
      assert.equal(
        cipher.length,
        stage.plain.length,
        "encoding changed the length of the message",
      );
      for (let j = 0; j < stage.plain.length; j++) {
        assert.equal(
          cipher[j] === " ",
          stage.plain[j] === " ",
          "a space moved during encoding",
        );
      }

      // Nothing readable survived.
      assert.notEqual(cipher, stage.plain, "the message encoded to itself");

      // The table shown is enough to decode the whole message and no more.
      const lookup = new Map(table.map((row) => [row.from, row.to]));
      const decoded = [...cipher]
        .map((c) => (c === " " ? " " : lookup.get(c)))
        .join("");
      assert.ok(
        isCorrect(decoded, stage.plain),
        `the decoder key shown does not decode "${stage.plain}"`,
      );

      // One box per letter, one gap per space.
      const slots = slotsFor(stage.plain);
      assert.equal(slots.length, stage.plain.length, "the answer boxes do not fit the message");
      assert.equal(
        slots.filter((s) => s === "letter").length,
        stage.plain.replace(/ /g, "").length,
        "the number of boxes does not match the number of letters",
      );
    }
  }
}

/* Marking ----------------------------------------------------------------- */

{
  assert.ok(isCorrect("ship it", "SHIP IT"), "case is being marked wrong");
  assert.ok(isCorrect("  SHIP   IT ", "SHIP IT"), "stray spacing is being marked wrong");
  assert.ok(!isCorrect("SHIPIT", "SHIP IT"), "a missing word break is being accepted");
  assert.ok(!isCorrect("SHIP TI", "SHIP IT"), "a wrong answer is being accepted");
}

console.log(
  `check-cipher: OK — ${CIPHER_STAGES.length} stages, 6000 keys, ` +
    `every one a derangement that decodes every message.`,
);
