import Link from "next/link";
import { Arrow } from "./Arrow";
import { Reveal, RevealGroup, RevealItem } from "./Reveal";
import type { LogEntry } from "@/lib/github";

/** A dev-log entry from either side: GitHub, or a case study published in the CMS. */
export type DevLogEntry = LogEntry | (Omit<LogEntry, "kind"> & { kind: "case-study" });

const KIND: Record<DevLogEntry["kind"], string> = {
  "new-repo": "New project",
  commits: "Commits",
  "case-study": "Case study",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/**
 * The blog that writes itself: new repositories, pushes, and case studies,
 * newest first. Server-rendered from data that is already cached (GitHub for
 * fifteen minutes, the CMS per request), so it ships no JavaScript and is
 * current within a quarter of an hour of a push.
 */
export function DevLog({ entries, user }: { entries: DevLogEntry[]; user: string }) {
  return (
    <div>
      <RevealGroup as="ol" className="dl-list">
        {entries.map((e) => {
          const internal = e.kind === "case-study";
          const title = (
            <>
              {e.title}
              <Arrow direction={internal ? "right" : "up-right"} className="dl-arrow" />
            </>
          );
          return (
            <RevealItem key={e.id} as="li" className="dl-item">
              <time className="dl-when t-meta" dateTime={e.at}>
                {fmt(e.at)}
              </time>
              <div className="dl-body">
                <p className="dl-kind">
                  <span className={`dl-tag is-${e.kind}`}>{KIND[e.kind]}</span>
                  {e.language ? <span className="dl-lang">{e.language}</span> : null}
                </p>
                {internal ? (
                  <Link href={e.url} className="dl-title">
                    {title}
                  </Link>
                ) : (
                  <a href={e.url} className="dl-title" target="_blank" rel="noopener noreferrer">
                    {title}
                  </a>
                )}
                {e.lines.length ? (
                  <ul className="dl-lines">
                    {e.lines.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </RevealItem>
          );
        })}
      </RevealGroup>
      {user ? (
        <Reveal className="mt-10">
          <a
            href={`https://github.com/${user}?tab=repositories`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 text-[0.9375rem] text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
          >
            Everything on GitHub
            <Arrow direction="up-right" className="text-[var(--accent-ink)]" />
          </a>
        </Reveal>
      ) : null}
    </div>
  );
}
