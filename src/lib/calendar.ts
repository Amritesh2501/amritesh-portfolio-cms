/**
 * Laying a list of days out as a contribution calendar: one column per week
 * (Sunday on top, like GitHub), month labels over the column a month starts
 * in, and five intensity bands. Pure; see scripts/check-calendar.ts.
 */

export type Day = { date: string; count: number };

export type Layout = {
  /** Columns of seven; null pads the first and last week. */
  weeks: (Day | null)[][];
  /** A label over the first column of each month that has room for one. */
  months: { col: number; label: string }[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Day of week from an ISO date, in UTC so the server and browser agree. */
const dow = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

export function layout(days: readonly Day[]): Layout {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const cells: (Day | null)[] = [
    ...Array.from({ length: sorted.length ? dow(sorted[0].date) : 0 }, () => null),
    ...sorted,
  ];
  while (cells.length % 7) cells.push(null);

  const weeks: (Day | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const months: { col: number; label: string }[] = [];
  let last = -1;
  weeks.forEach((week, col) => {
    const first = week.find((d): d is Day => d !== null);
    if (!first) return;
    const m = Number(first.date.slice(5, 7)) - 1;
    if (m === last) return;
    last = m;
    // Two labels in neighbouring columns would overlap; the later one wins.
    if (months.length && col - months[months.length - 1].col < 3) months.pop();
    months.push({ col, label: MONTHS[m] });
  });

  return { weeks, months };
}

/** Zero is its own band; the rest split the range up to this person's peak. */
export function level(count: number, peak: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  const share = count / Math.max(1, peak);
  if (share <= 0.25) return 1;
  if (share <= 0.5) return 2;
  if (share <= 0.75) return 3;
  return 4;
}

/**
 * The days and total out of GitHub's public contributions page
 * (github.com/users/:user/contributions): each day is a <td data-date> whose
 * id a <tool-tip> names with "N contributions on ...". Null when the markup
 * has none of that, which is what a GitHub redesign would look like.
 */
export function parseContributions(html: string): { total: number; days: Day[] } | null {
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/for="(contribution-day-component-[\d-]+)"[^>]*>\s*(No|[\d,]+) contributions?/g)) {
    counts.set(m[1], m[2] === "No" ? 0 : Number(m[2].replace(/,/g, "")));
  }
  const days: Day[] = [];
  for (const m of html.matchAll(/<td[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g)) {
    const id = /id="(contribution-day-component-[\d-]+)"/.exec(m[0])?.[1];
    days.push({ date: m[1], count: counts.get(id ?? "") ?? 0 });
  }
  if (!days.length) return null;
  days.sort((a, b) => a.date.localeCompare(b.date));
  const total = Number(/([\d,]+)\s+contributions?\s+in /.exec(html)?.[1]?.replace(/,/g, "") ?? NaN);
  return { days, total: Number.isFinite(total) ? total : days.reduce((n, d) => n + d.count, 0) };
}
