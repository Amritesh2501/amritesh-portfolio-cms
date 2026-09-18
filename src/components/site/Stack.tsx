import type { HomeData } from "@/lib/content";
import type { GitHubActivity as Activity } from "@/lib/github";
import { Certifications } from "./Certifications";
import { GitHubActivity } from "./GitHubActivity";
import { ScrollDrift } from "./Parallax";
import { RevealGroup, RevealItem, SkillMeter } from "./Reveal";
import { Empty } from "./Section";

/**
 * Stack: one marquee of every skill name (drifting with the scroll), then one
 * card per area with a meter for each skill, then the certifications.
 *
 * One row, not two counter-running ones. The second row read as filler: the
 * same device twice adds no information and halves the impact of the first.
 */
export function Stack({
  skillGroups,
  certifications,
  github,
}: {
  skillGroups: HomeData["skillGroups"];
  certifications: HomeData["certifications"];
  /** Null when there is no handle set, or GitHub could not be reached. */
  github: Activity | null;
}) {
  const names = skillGroups.flatMap((group) => group.skills.map((skill) => skill.name));

  return (
    <>
      {names.length > 0 ? (
        <div aria-hidden className="-mx-6 overflow-hidden sm:-mx-8 lg:-mx-12">
          <ScrollDrift distance={220} className="-mx-32">
            <Marquee items={names} />
          </ScrollDrift>
        </div>
      ) : null}

      {skillGroups.length === 0 ? (
        <Empty>No published skills yet.</Empty>
      ) : (
        <RevealGroup as="ul" className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-3" stagger={0.07}>
          {skillGroups.map((group, i) => (
            <RevealItem as="li" key={group.id} className="card stack-card p-7 sm:p-8">
              <span aria-hidden className="stack-card-num t-serif">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="relative flex items-start justify-between gap-4">
                <h3 className="t-display text-[1.375rem] text-[var(--fg)]">{group.name}</h3>
                <span className="chip shrink-0">
                  {group.skills.length} {group.skills.length === 1 ? "skill" : "skills"}
                </span>
              </div>
              <ul className="relative mt-8 grid gap-5">
                {group.skills.map((skill) => (
                  <li key={skill.id}>
                    <SkillMeter name={skill.name} value={skill.proficiency} />
                  </li>
                ))}
              </ul>
            </RevealItem>
          ))}
        </RevealGroup>
      )}

      {certifications.length > 0 ? <Certifications certifications={certifications} /> : null}

      {/* Under Stack rather than in a section of its own: what someone builds
          with and how often they are building are the same question. */}
      {github ? <GitHubActivity activity={github} /> : null}
    </>
  );
}

function Marquee({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  // Two copies side by side; the track slides by exactly one copy, so it loops
  // without a seam. keep-motion: the marquee was asked to move, so it runs even
  // under the reduced-motion loop freeze (see globals.css).
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
    <div className="marquee keep-motion">
      <div className="marquee-track">{[copy("a"), copy("b")]}</div>
    </div>
  );
}
