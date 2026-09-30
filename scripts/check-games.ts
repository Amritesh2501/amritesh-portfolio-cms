/**
 * The side games: daily numbers, the streak, the decoder, the timeline, the
 * witness, the evidence pairs and the achievements.
 *
 *   npx tsx scripts/check-games.ts
 */
import assert from "node:assert/strict";
import {
  ACHIEVEMENTS,
  LOCKS,
  bumpStreak,
  caesar,
  dailyRnd,
  dayKey,
  decoderPlain,
  decoderShift,
  earned,
  pairs,
  testimony,
  timeline,
} from "../src/lib/games";
import { SLOT, type Facts } from "../src/lib/casebook";
import { ARCHIVES } from "../src/lib/archives";
import { makeCombo } from "../src/lib/dial";

const facts: Facts = {
  profile: { name: "Ada", headline: "Engineer", location: "London", currentFocus: "Compilers." },
  experience: [
    { role: "Engineer", company: "Engines", currentlyWorking: true, startDate: "2022-01-01" },
    { role: "Intern", company: "Babbage", currentlyWorking: false, startDate: "2020-06-01" },
  ],
  education: [{ degree: "BSc", institution: "UCL", startDate: "2017-09-01" }],
  projects: [
    { title: "Note G", createdAt: "2025-01-01", shortDescription: "Bernoulli numbers." },
    { title: "Mill", createdAt: "2025-02-01", shortDescription: "An arithmetic unit." },
  ],
  certifications: [{ name: "Cert", issuer: "Issuer" }],
  skillGroups: [{ name: "Maths", skills: [{ name: "Algebra" }] }],
  evidence: [],
};

// Daily: stable within a day, different across days.
assert.deepEqual(makeCombo(dailyRnd("safe", "2026-09-30")), makeCombo(dailyRnd("safe", "2026-09-30")));
assert.notDeepEqual(makeCombo(dailyRnd("safe", "2026-09-30")), makeCombo(dailyRnd("safe", "2026-10-01")));
assert.notDeepEqual(makeCombo(dailyRnd("safe", "2026-09-30")), makeCombo(dailyRnd("locker", "2026-09-30")));
assert.match(dayKey(), /^\d{4}-\d{2}-\d{2}$/);

// Streak: same day holds, next day adds, a gap restarts, across a month end.
let s = bumpStreak(undefined, "2026-09-29");
assert.equal(s.streak, 1);
assert.equal(bumpStreak(s, "2026-09-29").streak, 1);
s = bumpStreak(s, "2026-09-30");
assert.equal(s.streak, 2);
s = bumpStreak(s, "2026-10-01");
assert.equal(s.streak, 3);
assert.equal(bumpStreak(s, "2026-10-05").streak, 1);

// Decoder: never shift 0, and the ring at the key reads the plain line.
for (let d = 1; d <= 28; d++) {
  const k = decoderShift(`2026-02-${String(d).padStart(2, "0")}`);
  assert(k >= 1 && k <= 25);
}
const plain = decoderPlain(facts);
assert.equal(plain, "COMPILERS.");
assert.notEqual(caesar(plain, 3), plain);
assert.equal(caesar(caesar(plain, 7), -7), plain);

// Timeline: earliest first, and nothing without a date sneaks in as NaN.
assert.deepEqual(timeline(facts).map((r) => r.label), ["BSc, UCL", "Intern, Babbage", "Engineer, Engines"]);
assert.equal(timeline({ ...facts, experience: [], education: [] }).length, 0);

// Witness: exactly one statement is not true, and it is the one marked.
for (let i = 0; i < 200; i++) {
  const t = testimony(facts)!;
  assert(t.statements.length >= 3);
  assert(t.lie >= 0 && t.lie < t.statements.length);
  assert(/Gotham|Atlantis|Initech|Globex|Clown|\d+ projects|\d+ skills|never passed/.test(t.statements[t.lie]));
}
assert.equal(testimony({ ...facts, profile: null, experience: [], projects: [], education: [], certifications: [], skillGroups: [] }), null);

// Pairs: only projects with a description.
assert.equal(pairs(facts).length, 2);
assert.equal(pairs({ ...facts, projects: [{ title: "X", createdAt: "2025-01-01" }] }).length, 0);

// Every lock in the archives is counted by "Picked every lock", and nothing else is.
const archiveLocks = ARCHIVES.flatMap((r) => r.props.filter((p) => p.locked).map((p) => `${r.id}/${p.id}`)).sort();
const counted = LOCKS.filter((l) => ["college", "vault", "training"].includes(l.room)).map((l) => `${l.room}/${l.id}`).sort();
assert.deepEqual(counted, archiveLocks);

// Achievements: distinct, none free, and a full save earns the lock one.
assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
assert.equal(earned({}).length, 0);
const full = {
  [SLOT.office]: ["record", "wiring", "patch", "backlog"],
  [SLOT.bedroom]: ["terminal", "drawer", "poster"],
  [SLOT.labRig]: true,
  [SLOT.archiveOpen("vault")]: ["cage", "boxes", "vault"],
  [SLOT.archiveOpen("training")]: ["lockers"],
  [SLOT.archiveOpen("college")]: ["fiche", "catalogue"],
};
assert(earned(full).some((a) => a.id === "locks"));

console.log(`check-games: OK — ${LOCKS.length} locks, ${ACHIEVEMENTS.length} achievements, daily numbers stable per day.`);
