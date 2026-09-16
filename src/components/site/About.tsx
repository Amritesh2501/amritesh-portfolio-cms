import type { HomeData } from "@/lib/content";
import { Markdown } from "./Markdown";
import { DrawLine, Reveal } from "./Reveal";

type Profile = NonNullable<HomeData["profile"]>;

const NUMERALS = ["i", "ii", "iii"];

/**
 * About, laid out like a page from a night journal: a moonlit portrait and the
 * facts that stay pinned while you read, the bio as a large lead, and the
 * three working notes as numbered entries that draw their rules in.
 */
export function About({ profile }: { profile: Profile }) {
  const notes = [
    { label: "How I work", body: profile.philosophy },
    { label: "Technical interests", body: profile.technicalInterests },
    { label: "Current focus", body: profile.currentFocus },
  ].filter((note) => note.body?.trim());

  const initials = profile.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  const facts = [
    profile.location ? { label: "Based in", value: profile.location } : null,
    profile.currentlyWorkingAt
      ? {
          label: "Now",
          value: `${profile.currentlyWorkingRole ?? "Engineer"} at ${profile.currentlyWorkingAt}`,
        }
      : null,
    profile.availabilityText ? { label: "Status", value: profile.availabilityText } : null,
  ].filter((fact): fact is { label: string; value: string } => fact !== null);

  return (
    <div className="grid gap-16 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-24">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <Reveal>
          <figure className="moon-portrait">
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
              <span className="t-serif moon-portrait-initials">{initials}</span>
            )}
            <span aria-hidden className="moon-portrait-tint" />
          </figure>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="t-serif mt-12 text-[clamp(2rem,3.4vw,2.75rem)] text-[var(--fg)]">
            {profile.name}
          </p>
          {profile.headline ? (
            <p className="mt-3 text-[0.6875rem] font-medium uppercase tracking-[0.22em] text-[var(--muted)]">
              {profile.headline}
            </p>
          ) : null}

          {facts.length > 0 ? (
            <dl className="mt-8 grid gap-4 border-t border-[var(--line)] pt-6">
              {facts.map((fact) => (
                <div key={fact.label} className="grid grid-cols-[5.5rem_1fr] items-baseline gap-4">
                  <dt className="t-meta text-[0.5625rem]">{fact.label}</dt>
                  <dd className="text-[0.9375rem] leading-snug text-[var(--fg)]">
                    {fact.label === "Status" ? (
                      <span
                        aria-hidden
                        className={`mr-2 inline-block h-1.5 w-1.5 -translate-y-0.5 rounded-full ${
                          profile.availabilityStatus === "OPEN"
                            ? "bg-[#30d158] shadow-[0_0_8px_#30d158]"
                            : "bg-[var(--muted)]"
                        }`}
                      />
                    ) : null}
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </Reveal>
      </div>

      <div>
        <Reveal>
          <Markdown content={profile.bio} className="about-lead" />
        </Reveal>

        {profile.longBio ? (
          <Reveal delay={0.08}>
            <Markdown content={profile.longBio} className="mt-8" />
          </Reveal>
        ) : null}

        {notes.length > 0 ? (
          <ol className="mt-16">
            {notes.map((note, i) => (
              <Reveal
                as="li"
                key={note.label}
                delay={i * 0.08}
                className="relative grid gap-3 py-9 sm:grid-cols-[5rem_1fr] sm:gap-6"
              >
                <DrawLine className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[var(--accent)] via-[var(--line-strong)] to-transparent" />
                <span className="t-serif text-[2.5rem] leading-none text-[var(--accent)] [text-shadow:0_0_24px_var(--glow)]">
                  {NUMERALS[i]}.
                </span>
                <div>
                  <p className="text-[0.6875rem] font-medium uppercase tracking-[0.22em] text-[var(--fg)]">
                    {note.label}
                  </p>
                  <Markdown content={note.body} className="mt-3 text-[0.9375rem]" />
                </div>
              </Reveal>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}
