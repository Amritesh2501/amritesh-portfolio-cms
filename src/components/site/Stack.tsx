import type { HomeData } from "@/lib/content";
import { RevealGroup, RevealItem, Reveal } from "./Reveal";
import { Empty } from "./Section";
import { StackTabs } from "./StackTabs";

export function Stack({
  skillGroups,
  certifications,
}: {
  skillGroups: HomeData["skillGroups"];
  certifications: HomeData["certifications"];
}) {
  return (
    <>
      {skillGroups.length === 0 ? (
        <Empty>No published skills yet.</Empty>
      ) : (
        <Reveal>
          <StackTabs
            groups={skillGroups.map((group) => ({
              id: group.id,
              name: group.name,
              skills: group.skills.map((skill) => ({
                id: skill.id,
                name: skill.name,
                proficiency: skill.proficiency,
              })),
            }))}
          />
        </Reveal>
      )}

      {certifications.length > 0 ? (
        <div className="mt-20">
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
