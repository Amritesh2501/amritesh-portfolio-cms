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
