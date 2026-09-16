import type { HomeData } from "@/lib/content";
import { plainText } from "@/lib/utils";
import { Markdown } from "./Markdown";
import { Reveal, RevealGroup, RevealItem, ScrollLitText } from "./Reveal";

type Profile = NonNullable<HomeData["profile"]>;

/**
 * About in three beats:
 *  1. the opening line of the bio as a large statement whose words light up
 *     as you scroll through it;
 *  2. a bento row: a portrait card with the facts, beside the rest of the bio;
 *  3. the three working notes as cards with a large serif numeral.
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
    <>
      {statement ? (
        <ScrollLitText
          text={statement}
          className="t-display max-w-[34ch] text-[clamp(1.625rem,3.4vw,2.875rem)] leading-[1.2] tracking-[-0.03em] text-[var(--fg)]"
        />
      ) : null}

      <div className="mt-20 grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Reveal>
          <figure className="card portrait-card h-full overflow-hidden p-3">
            <div className="portrait-frame">
              {profile.profileImage ? (
                // Plain img: the portrait URL can be any host set in the CMS.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.profileImage}
                  alt={profile.name}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="t-serif portrait-initials">{initials}</span>
              )}
              <span aria-hidden className="portrait-tint" />
              {profile.availabilityText ? (
                <span className="chip absolute bottom-4 left-4">
                  <span
                    aria-hidden
                    className={`status-dot ${profile.availabilityStatus === "OPEN" ? "is-open" : ""}`}
                  />
                  {profile.availabilityStatus === "OPEN" ? "Available" : "Engaged"}
                </span>
              ) : null}
            </div>

            <figcaption className="px-4 pb-4 pt-6">
              <p className="t-serif text-[2rem] leading-none text-[var(--fg)]">{profile.name}</p>
              {profile.headline ? (
                <p className="mt-2.5 text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
                  {profile.headline}
                </p>
              ) : null}
              {facts.length > 0 ? (
                <dl className="mt-6 grid gap-3 border-t border-[var(--line)] pt-5">
                  {facts.map((fact) => (
                    <div key={fact.label} className="grid grid-cols-[5rem_1fr] items-baseline gap-3">
                      <dt className="t-meta text-[0.5625rem]">{fact.label}</dt>
                      <dd className="text-[0.9375rem] leading-snug text-[var(--fg)]">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </figcaption>
          </figure>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="card h-full p-7 sm:p-10">
            <p className="text-[0.6875rem] font-medium uppercase tracking-[0.22em] text-[var(--accent)]">
              The longer version
            </p>
            <Markdown content={rest} className="mt-6 max-w-none" />
            {profile.longBio ? (
              <Markdown content={profile.longBio} className="mt-5 max-w-none" />
            ) : null}
          </div>
        </Reveal>
      </div>

      {notes.length > 0 ? (
        <RevealGroup as="ol" className="mt-5 grid gap-5 md:grid-cols-3" stagger={0.08}>
          {notes.map((note, i) => (
            <RevealItem as="li" key={note.label} className="card note-card p-7 sm:p-8">
              <span aria-hidden className="note-numeral t-serif">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="relative text-[0.6875rem] font-medium uppercase tracking-[0.22em] text-[var(--fg)]">
                {note.label}
              </p>
              <Markdown content={note.body} className="relative mt-4 text-[0.9375rem]" />
            </RevealItem>
          ))}
        </RevealGroup>
      ) : null}
    </>
  );
}
