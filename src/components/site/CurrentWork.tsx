import { Arrow } from "./Arrow";
import { RevealGroup, RevealItem } from "./Reveal";
import { WorkGallery } from "./WorkGallery";
import { STAGES, effectiveProgress, healthFor, leftLabel, stageIndex, timeline } from "@/lib/current";
import type { RepoPulse } from "@/lib/github";

export type WorkInProgress = {
  id: string;
  title: string;
  tagline: string | null;
  summary: string;
  cover: string | null;
  stage: string;
  health: string;
  progress: number;
  startedAt: Date | null;
  targetDate: Date | null;
  latestUpdate: string | null;
  nextUp: string | null;
  repoUrl: string | null;
  previewUrl: string | null;
  technologies: string[];
  updatedAt: Date;
  images: { url: string; caption: string | null }[];
  milestones: { id: string; label: string; done: boolean; dueDate: Date | null }[];
};

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function ago(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days} day${days === 1 ? "" : "s"} ago` : `${Math.round(days / 30)} mo ago`;
}

/**
 * Currently working on: each project in progress as one card. Pictures on one
 * side; on the other, what it is, where it is on the road from idea to launch,
 * how far along, how the dates are holding, the milestones, the latest update
 * and what comes next, and (for a GitHub repo) when it last moved.
 *
 * Server-rendered; the gallery is the only part that runs in the browser.
 */
export function CurrentWork({ items, pulses }: { items: WorkInProgress[]; pulses: Record<string, RepoPulse | null> }) {
  return (
    <RevealGroup className="cw">
      {items.map((w) => (
        <RevealItem key={w.id}>
          <Card work={w} pulse={pulses[w.id] ?? null} />
        </RevealItem>
      ))}
    </RevealGroup>
  );
}

function Card({ work: w, pulse }: { work: WorkInProgress; pulse: RepoPulse | null }) {
  const progress = effectiveProgress(w.progress, w.milestones);
  const t = timeline(w.startedAt, w.targetDate);
  const health = healthFor(w.health, progress, t.daysLeft);
  const step = stageIndex(w.stage);
  const done = w.milestones.filter((m) => m.done).length;
  const images = [...(w.cover ? [{ url: w.cover, caption: null }] : []), ...w.images];

  return (
    <article className="cw-card">
      <WorkGallery images={images} title={w.title} />

      <div className="cw-body">
        <p className="cw-top">
          <span className={`cw-health is-${health.tone}`}>{health.label}</span>
          <span className="cw-stage-pill">{STAGES[step].label}</span>
          {t.daysIn !== null ? <span className="t-meta">Day {t.daysIn + 1}</span> : null}
        </p>

        <h3 className="cw-title t-display">{w.title}</h3>
        {w.tagline ? <p className="cw-tagline">{w.tagline}</p> : null}
        <p className="cw-summary">{w.summary}</p>

        {/* Progress, and beside it how much of the planned time is gone, so the
            two can be read against each other. */}
        <div className="cw-progress">
          <div className="cw-progress-head">
            <span>Progress</span>
            <span className="cw-pct t-serif">{progress}%</span>
          </div>
          <div
            className="cw-bar"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${w.title} progress`}
          >
            <span className="cw-fill" style={{ width: `${progress}%` }} />
          </div>
          {t.elapsed !== null ? (
            <p className="cw-time">
              <span className="cw-time-bar" aria-hidden>
                <span style={{ width: `${t.elapsed}%` }} />
              </span>
              {t.elapsed}% of the planned time used
            </p>
          ) : null}
        </div>

        <ol className="cw-road" aria-label={`Stage: ${STAGES[step].label}`}>
          {STAGES.map((s, i) => (
            <li key={s.id} className={i < step ? "is-done" : i === step ? "is-now" : ""}>
              <span className="cw-road-dot" aria-hidden />
              <span className="cw-road-label">{s.label}</span>
            </li>
          ))}
        </ol>

        <dl className="cw-facts">
          {w.startedAt ? (
            <div>
              <dt>Started</dt>
              <dd>{fmt(w.startedAt)}</dd>
            </div>
          ) : null}
          {w.targetDate ? (
            <div>
              <dt>Target</dt>
              <dd>
                {fmt(w.targetDate)}
                {t.daysLeft !== null && progress < 100 ? (
                  <span className={`cw-left ${t.daysLeft < 0 ? "is-over" : ""}`}>{leftLabel(t.daysLeft)}</span>
                ) : null}
              </dd>
            </div>
          ) : null}
          {w.milestones.length ? (
            <div>
              <dt>Milestones</dt>
              <dd>
                {done} of {w.milestones.length}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Updated</dt>
            <dd>{fmt(w.updatedAt)}</dd>
          </div>
        </dl>

        {w.milestones.length ? (
          <ul className="cw-milestones">
            {w.milestones.map((m) => (
              <li key={m.id} className={m.done ? "is-done" : ""}>
                <span className="cw-check" aria-hidden>
                  {m.done ? "✓" : ""}
                </span>
                <span>{m.label}</span>
                <span className="sr-only">{m.done ? "(done)" : "(to do)"}</span>
                {m.dueDate && !m.done ? <span className="cw-due t-meta">{fmt(m.dueDate)}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}

        {w.latestUpdate || w.nextUp ? (
          <div className="cw-notes">
            {w.latestUpdate ? (
              <p>
                <span className="cw-note-k">Latest</span>
                {w.latestUpdate}
              </p>
            ) : null}
            {w.nextUp ? (
              <p>
                <span className="cw-note-k">Next up</span>
                {w.nextUp}
              </p>
            ) : null}
          </div>
        ) : null}

        {pulse ? (
          <p className="cw-pulse">
            <span className="cw-pulse-dot" aria-hidden />
            Last commit{" "}
            <time dateTime={pulse.at} suppressHydrationWarning>
              {ago(pulse.at)}
            </time>
            :{" "}
            <a href={pulse.url} target="_blank" rel="noopener noreferrer">
              {pulse.message}
            </a>
            {pulse.week ? (
              <span className="cw-week">
                {" "}
                · {pulse.week}
                {pulse.week >= 100 ? "+" : ""} commit{pulse.week === 1 ? "" : "s"} this week
              </span>
            ) : null}
          </p>
        ) : null}

        {w.technologies.length ? (
          <ul className="fw-tech" aria-label="Built with">
            {w.technologies.map((tech) => (
              <li key={tech}>{tech}</li>
            ))}
          </ul>
        ) : null}

        {w.repoUrl || w.previewUrl ? (
          <p className="cw-links">
            {w.previewUrl ? (
              <a href={w.previewUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-sm">
                See the preview <Arrow direction="up-right" />
              </a>
            ) : null}
            {w.repoUrl ? (
              <a href={w.repoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
                Follow the code <Arrow direction="up-right" />
              </a>
            ) : null}
          </p>
        ) : null}
      </div>
    </article>
  );
}
