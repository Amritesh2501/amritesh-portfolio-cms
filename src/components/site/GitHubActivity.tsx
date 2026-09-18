import { Arrow } from "./Arrow";
import { Reveal } from "./Reveal";
import type { GitHubActivity as Activity } from "@/lib/github";

/** Rough age of an event, in the shortest form that is still true. */
function ago(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days}d ago` : `${Math.round(days / 30)}mo ago`;
}

/**
 * Ninety days of GitHub, as a grid of days and a short list of what happened.
 *
 * Five steps of intensity, not a continuous ramp: the eye reads bands, and a
 * smooth scale over a range that is mostly zeroes and ones just produces a
 * field of near-identical squares. The top band is relative to this person's
 * own busiest day rather than a fixed number, so the grid reads the same
 * whether they ship twice a week or twenty times a day.
 *
 * Every square carries its own count as a title and the whole grid is one
 * figure with a caption, so the information survives without the colour.
 */
export function GitHubActivity({ activity }: { activity: Activity }) {
  const { days, total, exact, recent, user } = activity;
  const peak = Math.max(1, ...days.map((d) => d.count));

  // Pad the front so the first column starts on a Sunday and every column is
  // a real week rather than a rolling seven days.
  const lead = new Date(days[0]?.date ?? Date.now()).getUTCDay();
  const cells: (typeof days[number] | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...days,
  ];

  return (
    <div className="mt-20 border-t border-[var(--line)] pt-14">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <h3 className="t-display text-[clamp(1.375rem,2.4vw,1.875rem)] text-[var(--fg)]">
            Still shipping
          </h3>
          <a
            href={`https://github.com/${user}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2.5 text-[0.9375rem] tracking-[-0.012em] text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
          >
            @{user}
            <Arrow direction="up-right" className="text-[var(--accent-ink)]" />
          </a>
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <figure className="mt-8">
          <div className="gh-grid" role="img" aria-label={captionOf(total, exact)}>
            {cells.map((day, i) =>
              day === null ? (
                <span key={`pad-${i}`} className="gh-cell is-pad" />
              ) : (
                <span
                  key={day.date}
                  className="gh-cell"
                  data-level={level(day.count, peak)}
                  title={`${day.count} on ${day.date}`}
                />
              ),
            )}
          </div>

          <figcaption className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <span className="text-[0.875rem] tracking-[-0.012em] text-[var(--muted)]">
              {captionOf(total, exact)}
            </span>
            <span className="flex items-center gap-2" aria-hidden>
              <span className="t-meta text-[0.625rem]">Less</span>
              {[0, 1, 2, 3, 4].map((l) => (
                <span key={l} className="gh-cell" data-level={l} />
              ))}
              <span className="t-meta text-[0.625rem]">More</span>
            </span>
          </figcaption>
        </figure>
      </Reveal>

      {recent.length > 0 ? (
        <Reveal delay={0.12}>
          <ul className="mt-12 grid gap-px overflow-hidden rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
            {recent.map((event) => (
              <li
                key={event.id}
                className="flex items-baseline justify-between gap-4 bg-[var(--bg)] px-5 py-4"
              >
                <span className="min-w-0 text-[0.9375rem] tracking-[-0.012em] text-[var(--fg)]">
                  <span className="text-[var(--muted)]">{event.kind} </span>
                  <span className="break-all">{event.repo.split("/").pop()}</span>
                </span>
                <span className="t-meta shrink-0 text-[0.625rem] tabular-nums">
                  {ago(event.at)}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      ) : null}
    </div>
  );
}

function captionOf(total: number, exact: boolean) {
  return exact
    ? `${total.toLocaleString()} contributions in the last 90 days`
    : `${total.toLocaleString()} public events in the last 90 days`;
}

/** Zero is its own band; the rest split the range up to this person's peak. */
function level(count: number, peak: number) {
  if (count <= 0) return 0;
  const share = count / peak;
  if (share <= 0.25) return 1;
  if (share <= 0.5) return 2;
  if (share <= 0.75) return 3;
  return 4;
}
