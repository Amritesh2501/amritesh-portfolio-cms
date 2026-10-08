/**
 * The contribution calendar layout: whole weeks, Sunday on top, every day in
 * exactly one cell, month labels in order and never on top of each other.
 *
 *   npx tsx scripts/check-calendar.ts
 */
import assert from "node:assert/strict";
import { layout, level, parseContributions, type Day } from "../src/lib/calendar";

function year(from: string, n: number): Day[] {
  const out: Day[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  for (let i = 0; i < n; i++) {
    out.push({ date: d.toISOString().slice(0, 10), count: i % 5 });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

for (const [from, n] of [["2025-10-05", 366], ["2024-01-01", 366], ["2026-07-15", 91], ["2023-03-04", 1]] as const) {
  const days = year(from, n);
  const { weeks, months } = layout(days);

  assert(weeks.every((w) => w.length === 7), "every column is a whole week");
  const flat = weeks.flat().filter((d): d is Day => d !== null);
  assert.equal(flat.length, days.length, "every day appears once");
  assert.deepEqual(flat.map((d) => d.date), days.map((d) => d.date), "in order");

  // Each day sits in the row of its weekday (0 = Sunday).
  weeks.forEach((w) =>
    w.forEach((d, row) => d && assert.equal(new Date(`${d.date}T00:00:00Z`).getUTCDay(), row, d.date)),
  );

  for (let i = 1; i < months.length; i++) {
    assert(months[i].col - months[i - 1].col >= 3, "month labels do not collide");
  }
  assert(months.length <= 13);
}

assert.equal(layout(year("2025-10-05", 366)).weeks.length, 53);
assert.deepEqual(layout([]), { weeks: [], months: [] });

assert.equal(level(0, 10), 0);
assert.equal(level(1, 10), 1);
assert.equal(level(10, 10), 4);
assert.equal(level(3, 0), 4, "a zero peak does not divide by zero");

console.log("check-calendar: OK — whole weeks, weekday rows, labels apart.");

// The public contributions page, as GitHub renders it (trimmed to two days).
const html = `
  <h2 id="js-contribution-activity-description">
      1,203
      contributions
        in the last year
  </h2>
  <td tabindex="0" data-ix="0" aria-selected="false" data-date="2025-10-06" id="contribution-day-component-1-0" data-level="2" role="gridcell" class="ContributionCalendar-day"></td>
  <td tabindex="0" data-ix="0" data-date="2025-10-05" id="contribution-day-component-0-0" data-level="0" class="ContributionCalendar-day"></td>
  <tool-tip id="t1" for="contribution-day-component-1-0" popover="manual" class="sr-only">1,005 contributions on October 6th.</tool-tip>
  <tool-tip id="t2" for="contribution-day-component-0-0" popover="manual" class="sr-only">No contributions on October 5th.</tool-tip>
`;
const parsed = parseContributions(html)!;
assert.equal(parsed.total, 1203);
assert.deepEqual(parsed.days, [
  { date: "2025-10-05", count: 0 },
  { date: "2025-10-06", count: 1005 },
]);
assert.equal(parseContributions("<html>redesigned</html>"), null);
console.log("check-calendar: contributions page parsed.");
