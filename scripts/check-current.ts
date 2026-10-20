/**
 * "Currently working on": progress, stages and dates.
 *
 *   npx tsx scripts/check-current.ts
 */
import assert from "node:assert/strict";
import { STAGES, daysBetween, effectiveProgress, healthFor, leftLabel, stageIndex, timeline } from "../src/lib/current";

// Stages: in order, unknown falls back to Building.
assert.equal(stageIndex("IDEA"), 0);
assert.equal(stageIndex("LAUNCHING"), STAGES.length - 1);
assert.equal(stageIndex("nonsense"), 3);

// Progress: explicit wins and is capped; zero falls back to milestones.
assert.equal(effectiveProgress(40, [{ done: false }]), 40);
assert.equal(effectiveProgress(140, []), 100);
assert.equal(effectiveProgress(0, []), 0);
assert.equal(effectiveProgress(0, [{ done: true }, { done: false }, { done: true }, { done: false }]), 50);

// Dates: whole UTC days, regardless of the hour.
const d = (s: string) => new Date(s);
assert.equal(daysBetween(d("2026-10-01T23:00:00Z"), d("2026-10-02T01:00:00Z")), 1);
const now = d("2026-10-20T12:00:00Z");
assert.deepEqual(timeline(d("2026-10-10"), d("2026-10-30"), now), { daysIn: 10, daysLeft: 10, elapsed: 50 });
assert.deepEqual(timeline(null, null, now), { daysIn: null, daysLeft: null, elapsed: null });
assert.equal(timeline(d("2026-11-01"), null, now).daysIn, 0, "a future start is day 0, not negative");
assert.equal(timeline(d("2026-10-01"), d("2026-10-10"), now).elapsed, 100, "capped once past the target");

assert.equal(leftLabel(0), "Due today");
assert.equal(leftLabel(1), "1 day left");
assert.equal(leftLabel(-3), "3 days over");

// Health: overdue and unfinished cannot read as on track.
assert.equal(healthFor("ON_TRACK", 60, -2).label, "At risk");
assert.equal(healthFor("ON_TRACK", 100, -2).label, "On track");
assert.equal(healthFor("BLOCKED", 60, -2).label, "Blocked");
assert.equal(healthFor("whatever", 10, 5).label, "On track");

console.log("check-current: OK — stages, progress from milestones, dates in whole days.");
