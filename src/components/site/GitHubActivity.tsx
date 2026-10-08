"use client";

import { useMemo, useState } from "react";
import { Arrow } from "./Arrow";
import { Reveal } from "./Reveal";
import { layout, level } from "@/lib/calendar";
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
 * The contribution calendar, laid out like the one on a GitHub profile: a year
 * of weeks, month labels across the top, Mon / Wed / Fri down the side, a
 * Less-More legend, and the years down the right to switch between.
 *
 * Coloured from the site's own accent rather than GitHub's green, so it belongs
 * to the page. Every square carries its count as a title, and the whole grid is
 * one figure with a caption, so the information survives without the colour.
 */
export function GitHubActivity({ activity }: { activity: Activity }) {
  const { years, exact, recent, user } = activity;
  const [pick, setPick] = useState(0);
  const year = years[pick] ?? years[0];
  const { weeks, months } = useMemo(() => layout(year.days), [year]);
  const peak = Math.max(1, ...year.days.map((d) => d.count));

  const caption = exact
    ? `${year.total.toLocaleString()} contributions ${year.label === "Last year" ? "in the last year" : `in ${year.label}`}`
    : `${year.total.toLocaleString()} public events in the last 90 days`;

  return (
    <div className="mt-20 border-t border-[var(--line)] pt-14">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <h3 className="t-display text-[clamp(1.375rem,2.4vw,1.875rem)] text-[var(--fg)]">{caption}</h3>
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
        <div className="gh-wrap mt-8">
          <figure className="gh-card">
            <div className="gh-scroll">
              <div className="gh-cal" style={{ ["--weeks" as string]: weeks.length }}>
                <span aria-hidden className="gh-corner" />
                <div aria-hidden className="gh-months">
                  {months.map((m) => (
                    <span key={`${m.label}-${m.col}`} style={{ gridColumn: m.col + 1 }}>
                      {m.label}
                    </span>
                  ))}
                </div>
                <div aria-hidden className="gh-days">
                  <span />
                  <span>Mon</span>
                  <span />
                  <span>Wed</span>
                  <span />
                  <span>Fri</span>
                  <span />
                </div>
                <div className="gh-grid" role="img" aria-label={caption}>
                  {weeks.flat().map((day, i) =>
                    day === null ? (
                      <span key={`pad-${i}`} className="gh-cell is-pad" />
                    ) : (
                      <span
                        key={day.date}
                        className="gh-cell"
                        data-level={level(day.count, peak)}
                        title={`${day.count} contribution${day.count === 1 ? "" : "s"} on ${day.date}`}
                      />
                    ),
                  )}
                </div>
              </div>
            </div>

            <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <span className="text-[0.8125rem] tracking-[-0.012em] text-[var(--muted)]">
                {exact ? "From the GitHub contribution calendar" : "From public GitHub events"}
              </span>
              <span className="flex items-center gap-1.5" aria-hidden>
                <span className="t-meta mr-1 text-[0.625rem]">Less</span>
                {[0, 1, 2, 3, 4].map((l) => (
                  <span key={l} className="gh-cell" data-level={l} />
                ))}
                <span className="t-meta ml-1 text-[0.625rem]">More</span>
              </span>
            </figcaption>
          </figure>

          {years.length > 1 ? (
            <div className="gh-years" role="tablist" aria-label="Year">
              {years.map((y, i) => (
                <button
                  key={y.label}
                  type="button"
                  role="tab"
                  aria-selected={i === pick}
                  className={`gh-year ${i === pick ? "is-on" : ""}`}
                  onClick={() => setPick(i)}
                >
                  {y.label === "Last year" ? new Date().getFullYear() : y.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </Reveal>

      {recent.length > 0 ? (
        <Reveal delay={0.12}>
          <ul className="mt-12 grid gap-px overflow-hidden rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
            {recent.map((event) => (
              <li key={event.id} className="flex items-baseline justify-between gap-4 bg-[var(--bg)] px-5 py-4">
                <span className="min-w-0 text-[0.9375rem] tracking-[-0.012em] text-[var(--fg)]">
                  <span className="text-[var(--muted)]">{event.kind} </span>
                  <span className="break-all">{event.repo.split("/").pop()}</span>
                </span>
                {/* Relative to now, so it can differ by a minute between server and browser. */}
                <span className="t-meta shrink-0 text-[0.625rem] tabular-nums" suppressHydrationWarning>
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
