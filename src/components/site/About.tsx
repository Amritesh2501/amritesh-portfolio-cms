import type { HomeData } from "@/lib/content";
import { plainText } from "@/lib/utils";
import { Markdown } from "./Markdown";
import { Parallax } from "./Parallax";
import { Reveal, RevealGroup, RevealItem, ScrollLitText } from "./Reveal";

type Profile = NonNullable<HomeData["profile"]>;

/**
 * About as a two-column spread:
 *  - left, pinned while the right column scrolls past: a tall portrait with
 *    the name set over it, and the facts beneath;
 *  - right: the opening line of the bio as a statement whose words light up as
 *    you scroll, the rest of the bio, then the working notes as numbered rows.
 */
export function About({ profile }: { profile: Profile }) {
  const [opening = "", ...restParagraphs] = (profile.bio ?? "").split(/\n\s*\n/);
  const statement = plainText(opening, 600);
  const rest = restParagraphs.join("\n\n");

  const notes = [
    { label: "How I work", body: profile.philosophy },
    { label: "Technical interests", body: profile.technicalInterests },
    { label: "Current focus", body: profile.currentFocus },
  ].filter((note) => note.body?.trim());

  const facts = [
    profile.location ? { label: "Based in", value: profile.location } : null,
    profile.currentlyWorkingAt
      ? {
          label: "Now",
          value: `${profile.currentlyWorkingRole ?? "Engineer"} at ${profile.currentlyWorkingAt}`,
        }
      : null,
  ].filter((fact): fact is { label: string; value: string } => fact !== null);

  const initials = profile.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
      <aside className="lg:sticky lg:top-28 lg:col-span-5 lg:self-start">
        <Reveal>
          <figure className="about-portrait">
            {profile.profileImage ? (
              <Parallax speed={0.08} className="absolute inset-x-0 inset-y-[-10%]">
                {/* Plain img: the portrait URL can be any host set in the CMS. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.profileImage}
                  alt={profile.name}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </Parallax>
            ) : (
              <span aria-hidden className="t-serif about-initials">
                {initials}
              </span>
            )}
            <span aria-hidden className="about-tint" />
            <figcaption className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <p className="t-serif text-[clamp(2.25rem,4vw,3.25rem)] leading-[0.95] text-[#efe7ff]">
                {profile.name}
              </p>
              {profile.headline ? (
                <p className="mt-3 text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-[#cdb8f2]">
                  {profile.headline}
                </p>
              ) : null}
            </figcaption>
          </figure>
        </Reveal>

        {facts.length > 0 ? (
          <Reveal delay={0.06}>
            <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--line)]">
              {facts.map((fact) => (
                <div key={fact.label} className="bg-[var(--bg)] p-5 last:odd:col-span-2">
                  <dt className="t-meta text-[0.5625rem]">{fact.label}</dt>
                  <dd className="mt-2 text-[0.9375rem] leading-snug text-[var(--fg)]">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        ) : null}
      </aside>

      <div className="lg:col-span-7">
        {statement ? (
          <ScrollLitText
            text={statement}
            className="t-display text-[clamp(1.625rem,3vw,2.625rem)] leading-[1.2] tracking-[-0.03em] text-[var(--fg)]"
          />
        ) : null}

        {rest || profile.longBio ? (
          <Reveal className="mt-14 border-l border-[var(--accent)] pl-6 sm:pl-8">
            <Markdown content={rest} className="max-w-[62ch]" />
            {profile.longBio ? (
              <Markdown content={profile.longBio} className="mt-5 max-w-[62ch]" />
            ) : null}
          </Reveal>
        ) : null}

        {notes.length > 0 ? (
          <RevealGroup as="ol" className="mt-16 border-b border-[var(--line)]" stagger={0.08}>
            {notes.map((note, i) => (
              <RevealItem
                as="li"
                key={note.label}
                className="about-note grid gap-3 border-t border-[var(--line)] py-8 sm:grid-cols-[5rem_1fr] sm:gap-6"
              >
                <span aria-hidden className="about-note-num t-serif">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-[0.6875rem] font-medium uppercase tracking-[0.22em] text-[var(--fg)]">
                    {note.label}
                  </p>
                  <Markdown content={note.body} className="mt-3 text-[0.9375rem]" />
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        ) : null}
      </div>
    </div>
  );
}
