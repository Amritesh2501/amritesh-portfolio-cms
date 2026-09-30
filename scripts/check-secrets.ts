/**
 * The case room's intake and easter eggs: each fails as nobody noticing.
 *
 *   npx tsx scripts/check-secrets.ts
 */
import assert from "node:assert/strict";
import {
  CONSOLE_WORD,
  HIDDEN,
  KONAMI,
  caseNo,
  endsWith,
  intakeLines,
  interrogate,
  uvNotes,
} from "../src/lib/secrets";
import { WORLD } from "../src/lib/world";

const counts = { projects: 3, roles: 2, certifications: 1, skills: 9, evidence: 4 };
const p = {
  name: "Ada Lovelace",
  headline: "Engineer",
  location: "London",
  email: "ada@example.com",
  yearsOfExperience: 5,
  philosophy: "Ship it.",
  hobbies: ["chess"],
};

// The intake never prints a hole where a CMS field was.
for (const who of [p, null, {}]) {
  const text = intakeLines(who, counts).join("\n");
  assert(!/undefined|null|NaN/.test(text), text);
}
assert(intakeLines(p, counts).join("\n").includes("ADA LOVELACE"));
assert(intakeLines(p, counts).join("\n").includes("3 projects"));
assert.equal(caseNo("Ada Lovelace"), caseNo("Ada Lovelace"));

// Commands answer, and answer from the profile.
assert.equal(interrogate("clear", p), null);
assert(interrogate("cat motive", p)?.includes("Ship it."));
assert(interrogate("HIRE", p)?.includes("ada@example.com"));
assert(interrogate("ada", p)?.includes("Go on in"));
assert(interrogate("gibberish", null)?.includes("help"));
for (const c of ["help", "whoami", "ls", "alibi", "sudo rm", "contact"])
  assert(interrogate(c, null), c);

// The key sequences fire on their tail, whatever came before, and not early.
assert(endsWith(["x", "y", ...KONAMI], KONAMI));
assert(!endsWith(KONAMI.slice(0, -1), KONAMI));
assert(endsWith(["Shift", ..."FINGERPRINT"], [...CONSOLE_WORD]));
// The console word has to be typeable without tripping the room's own keys.
assert(/^[a-z]+$/.test(CONSOLE_WORD));

// Every hiding spot is inside the room and none overlap.
for (const h of HIDDEN) {
  assert(h.at.x - h.at.r >= 0 && h.at.x + h.at.r <= WORLD.w, h.id);
  assert(h.at.y - h.at.r >= 0 && h.at.y + h.at.r <= WORLD.h, h.id);
  assert(!/undefined|null/.test(h.text(null) + h.text(p)), h.id);
  for (const o of HIDDEN)
    if (o !== h) assert(Math.hypot(h.at.x - o.at.x, h.at.y - o.at.y) > h.at.r + o.at.r, `${h.id}/${o.id}`);
}
assert.equal(new Set(HIDDEN.map((h) => h.id)).size, HIDDEN.length);

assert.deepEqual(uvNotes(p), ["Ship it."]);
assert.deepEqual(uvNotes(null), []);

console.log("secrets: ok");
