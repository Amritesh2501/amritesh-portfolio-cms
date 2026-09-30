/**
 * The casebook: leads, closing questions, rank and "since your last visit".
 * Each fails as a game that quietly cannot be finished.
 *
 *   npx tsx scripts/check-casebook.ts
 */
import assert from "node:assert/strict";
import {
  ENTRIES,
  SLOT,
  doneEntries,
  fresh,
  lead,
  questions,
  rank,
  readyToClose,
  type Facts,
} from "../src/lib/casebook";

const facts: Facts = {
  profile: { name: "Ada Lovelace", headline: "Engineer", location: "London", yearsOfExperience: 5 },
  experience: [
    { role: "Engineer", company: "Analytical Engines", currentlyWorking: true },
    { role: "Intern", company: "Babbage & Co", currentlyWorking: false },
  ],
  education: [{ degree: "BSc", institution: "Somewhere" }],
  projects: [
    { title: "Note G", createdAt: "2026-01-01" },
    { title: "Difference", createdAt: "2026-09-01" },
  ],
  certifications: [{ name: "Cert", issuer: "Issuer" }],
  skillGroups: [{ name: "Maths", skills: [{ name: "Bernoulli" }] }],
  evidence: [{ code: "EX-01", createdAt: "2026-09-02" }],
};
const empty: Facts = {
  profile: null, experience: [], education: [], projects: [], certifications: [], skillGroups: [], evidence: [],
};

// A save that has done everything, built from the same slots the rooms write.
const full = {
  [SLOT.read]: ["about"],
  [SLOT.bedroom]: ["terminal"],
  [SLOT.office]: ["record", "wiring", "patch", "backlog"],
  [SLOT.labRig]: true,
  [SLOT.archiveUnlocked("vault")]: true,
  [SLOT.archiveUsed("training")]: ["lockers"],
};

assert.equal(doneEntries({}).length, 0);
assert.equal(lead({}), ENTRIES[0].where);
assert.equal(doneEntries(full).length, ENTRIES.length, "every entry is reachable");
assert.equal(readyToClose(full), true);
assert.equal(lead(full), null);
assert.equal(new Set(ENTRIES.map((e) => e.id)).size, ENTRIES.length);

// Text never prints a hole, with or without rows.
for (const f of [facts, empty])
  for (const e of ENTRIES) assert(!/undefined|null|NaN/.test(e.text(f)), `${e.id}: ${e.text(f)}`);
assert(ENTRIES.find((e) => e.id === "post")!.text(facts).includes("Analytical Engines"));

// Questions: the answer is always one of three distinct options.
const qs = questions(facts);
assert.equal(qs.length, 3);
for (const q of qs) {
  assert(q.options.includes(q.answer), q.q);
  assert.equal(q.options.length, 3, q.q);
  assert.equal(new Set(q.options).size, 3, q.q);
}
assert.equal(questions(empty).length, 0, "no rows, nothing to ask");

// Rank: bounded, and skipping costs.
assert.equal(rank({ ms: 0, skips: 0, wrong: 0, hidden: 5 }).title, "Chief Inspector");
assert(rank({ ms: 0, skips: 9, wrong: 0, hidden: 0 }).score < rank({ ms: 0, skips: 0, wrong: 0, hidden: 0 }).score);
assert.equal(rank({ ms: 1e9, skips: 99, wrong: 99, hidden: 0 }).score, 0);

// Fresh: nothing on a first visit, and only what is newer after.
assert.deepEqual(fresh(facts, undefined), { projects: [], pins: [] });
const since = new Date("2026-06-01").getTime();
assert.deepEqual(fresh(facts, since), { projects: ["Difference"], pins: ["EX-01"] });

console.log("casebook: ok");
