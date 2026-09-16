import type { HomeData } from "@/lib/content";
import { LevelPill, Reveal, RevealGroup, RevealItem } from "./Reveal";
import { Empty } from "./Section";

/**
 * Stack as an atlas: a slow marquee of every skill name as the section's
 * banner, then one row per area, each skill a pill that fills to its level.
 * Everything is visible at once; nothing is hidden behind tabs.
 */
export function Stack({
  skillGroups,
  certifications,
}: {
  skillGroups: HomeData["skillGroups"];
  certifications: HomeData["certifications"];
}) {
  const names = skillGroups.flatMap((group) => group.skills.map((skill) => skill.name));
  const half = Math.ceil(names.length / 2);

  return (
    <>
      {names.length > 0 ? (
        <div aria-hidden className="-mx-6 grid gap-3 sm:-mx-8 lg:-mx-12">
          <Marquee items={names.slice(0, half)} />
          <Marquee items={names.slice(half)} reverse />
        </div>
      ) : null}

      {skillGroups.length === 0 ? (
        <Empty>No published skills yet.</Empty>
      ) : (
        <ol className="mt-16">
          {skillGroups.map((group, i) => (
            <Reveal
              as="li"
              key={group.id}
              delay={Math.min(i, 4) * 0.03}
              className="grid gap-5 border-t border-[var(--line)] py-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12"
            >
              <div className="flex items-baseline gap-4">
                <span className="t-serif text-[1.75rem] leading-none text-[var(--accent)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="t-display text-[1.25rem] text-[var(--fg)]">{group.name}</h3>
                  <p className="t-meta mt-1.5 text-[0.5625rem]">
                    {group.skills.length} {group.skills.length === 1 ? "skill" : "skills"}
                  </p>
                </div>
              </div>
              <ul className="flex flex-wrap content-start gap-2.5">
                {group.skills.map((skill) => (
                  <li key={skill.id}>
                    <LevelPill name={skill.name} value={skill.proficiency} />
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </ol>
      )}

      {certifications.length > 0 ? (
        <div className="mt-16">
          <Reveal>
            <p className="text-[0.6875rem] font-medium uppercase tracking-[0.22em] text-[var(--fg)]">
              Certifications
            </p>
          </Reveal>
          <RevealGroup
            as="ul"
            className="mt-6 grid border-t border-[var(--line)] sm:grid-cols-2 sm:gap-x-12"
            stagger={0.05}
          >
            {certifications.map((cert) => {
              const body = (
                <>
                  <span className="min-w-0">
                    <span className="block text-[0.9375rem] font-medium leading-snug tracking-[-0.012em] text-[var(--fg)] transition-colors duration-300 group-hover:text-[var(--accent)]">
                      {cert.name}
                    </span>
                    <span className="t-meta mt-1.5 block text-[0.5625rem]">{cert.issuer}</span>
                  </span>
                  {cert.credentialUrl ? (
                    <span
                      aria-hidden
                      className="text-[var(--accent)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    >
                      &#8599;
                    </span>
                  ) : null}
                </>
              );
              const row =
                "group flex items-center justify-between gap-6 border-b border-[var(--line)] py-5 transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]";
              return (
                <RevealItem as="li" key={cert.id}>
                  {cert.credentialUrl ? (
                    <a
                      href={cert.credentialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${row} hover:pl-2`}
                    >
                      {body}
                    </a>
                  ) : (
                    <div className={row}>{body}</div>
                  )}
                </RevealItem>
              );
            })}
          </RevealGroup>
        </div>
      ) : null}
    </>
  );
}

function Marquee({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
  if (items.length === 0) return null;
  // Two copies side by side; the track slides by exactly one copy, so it loops
  // without a seam.
  const copy = (key: string) => (
    <span key={key} className="marquee-copy">
      {items.map((item, i) => (
        <span key={i} className="marquee-item">
          {item}
          <span className="marquee-star">&#10022;</span>
        </span>
      ))}
    </span>
  );
  return (
    <div className={`marquee ${reverse ? "marquee-reverse" : ""}`}>
      <div className="marquee-track">{[copy("a"), copy("b")]}</div>
    </div>
  );
}
