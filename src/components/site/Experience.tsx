import type { HomeData } from "@/lib/content";
import { dateRange } from "@/lib/utils";
import { Markdown } from "./Markdown";
import { Reveal, RevealGroup, RevealItem, TimelineRail } from "./Reveal";
import { Empty } from "./Section";

type Role = HomeData["experience"][number];
type School = HomeData["education"][number];

function yearSpan(start: Date | null, end: Date | null, current: boolean) {
  const from = start ? new Date(start).getFullYear() : null;
  const to = current ? "Now" : end ? new Date(end).getFullYear() : null;
  if (!from) return to ? String(to) : "";
  return !to || to === from ? String(from) : `${from}-${to}`;
}

/**
 * Experience as a river running down the page: a rail that fills with light
 * as you scroll through it, a node for each role (the current one rippling),
 * and the year set large beside each stop.
 */
export function Experience({
  experience,
  education,
}: {
  experience: Role[];
  education: School[];
}) {
  return (
    <>
      {experience.length === 0 ? (
        <Empty>No published roles yet.</Empty>
      ) : (
        <div className="relative">
          <TimelineRail />
          <ol className="grid gap-12">
            {experience.map((role, i) => (
              <li
                key={role.id}
                className="relative grid gap-4 pl-10 md:grid-cols-[11rem_1fr] md:gap-0 md:pl-0"
              >
                <span
                  aria-hidden
                  className={`timeline-node ${role.currentlyWorking ? "is-current" : ""}`}
                />

                <Reveal delay={i * 0.04} className="md:pr-10 md:pt-5 md:text-right">
                  <p className="t-serif text-[1.625rem] text-[var(--fg)]">
                    {yearSpan(role.startDate, role.endDate, role.currentlyWorking)}
                  </p>
                  <p className="t-meta mt-2 tabular-nums text-[0.6875rem]">
                    {dateRange(role.startDate, role.endDate, role.currentlyWorking)}
                  </p>
                </Reveal>

                <Reveal delay={0.08 + i * 0.04} className="md:pl-10">
                  <article className="card p-6 sm:p-8">
                    <div className="flex flex-wrap items-center gap-2">
                      {role.currentlyWorking ? <span className="chip">Current</span> : null}
                      {role.employmentType ? (
                        <span className="tag">{role.employmentType}</span>
                      ) : null}
                      {role.location ? <span className="tag">{role.location}</span> : null}
                    </div>

                    <h3 className="t-display mt-4 text-[clamp(1.25rem,2.2vw,1.625rem)] text-[var(--fg)]">
                      {role.role}
                    </h3>
                    <p className="t-serif mt-1.5 text-[1.25rem] text-[var(--accent)]">
                      {role.companyUrl ? (
                        <a
                          href={role.companyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="u-link"
                        >
                          {role.company}
                        </a>
                      ) : (
                        role.company
                      )}
                    </p>

                    <Markdown content={role.description} className="mt-5 text-[0.9375rem]" />

                    {role.achievements.length > 0 ? (
                      <ul className="mt-6 grid gap-3">
                        {role.achievements.map((item) => (
                          <li
                            key={item}
                            className="relative pl-6 text-[0.9375rem] leading-relaxed tracking-[-0.012em] text-[var(--muted)]"
                          >
                            <span
                              aria-hidden
                              className="absolute left-0 top-[0.62em] h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
                            />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {role.technologies.length > 0 ? (
                      <div className="mt-6 flex flex-wrap gap-1.5 border-t border-[var(--line)] pt-5">
                        {role.technologies.map((tech) => (
                          <span key={tech.id} className="tag">
                            {tech.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      )}

      {education.length > 0 ? (
        <div className="mt-20">
          <Reveal>
            <p className="t-display text-[1.375rem] text-[var(--fg)]">
              Education
            </p>
          </Reveal>
          <RevealGroup as="ul" className="mt-6 grid gap-4">
            {education.map((entry) => (
              <RevealItem
                as="li"
                key={entry.id}
                className="card grid gap-2 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8 sm:p-7"
              >
                <div>
                  <p className="t-serif text-[1.5rem] leading-tight text-[var(--fg)]">
                    {entry.degree}
                  </p>
                  <p className="mt-1.5 text-[0.9375rem] text-[var(--muted)]">
                    {[entry.field, entry.institution].filter(Boolean).join(", ")}
                  </p>
                </div>
                <p className="t-meta tabular-nums text-[0.6875rem] sm:text-right">
                  {dateRange(entry.startDate, entry.endDate, false)}
                  {entry.location ? (
                    <>
                      <br className="hidden sm:block" />
                      <span className="sm:hidden"> / </span>
                      {entry.location}
                    </>
                  ) : null}
                </p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      ) : null}
    </>
  );
}
