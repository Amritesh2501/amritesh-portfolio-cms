import Link from "next/link";
import { Arrow } from "@/components/site/Arrow";
import { getHomeData } from "@/lib/content";
import { Hero } from "@/components/site/Hero";
import { Section } from "@/components/site/Section";
import { Reveal, RevealGroup, RevealItem } from "@/components/site/Reveal";
import { ProjectGrid } from "@/components/site/ProjectGrid";
import { About } from "@/components/site/About";
import { Experience } from "@/components/site/Experience";
import { Stack } from "@/components/site/Stack";
import { Contact } from "@/components/site/Contact";
import type { CardProject } from "@/components/site/ProjectCard";
import { JsonLd } from "@/components/site/JsonLd";
import { getSiteUrl } from "@/lib/site-url";
import { plainText } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const {
    profile,
    settings,
    projects,
    experience,
    education,
    skillGroups,
    certifications,
    achievements,
    socials,
  } = await getHomeData();

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-32">
        <p className="t-display text-3xl">No profile published</p>
        <p className="mt-4 text-[var(--muted)]">
          Run <code className="md-code">npm run db:seed</code>, or sign in to the
          CMS and publish a profile.
        </p>
        <Link href="/admin" className="btn btn-accent mt-8">
          Open CMS
        </Link>
      </div>
    );
  }

  const base = await getSiteUrl();

  const cards: CardProject[] = projects.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    shortDescription: p.shortDescription,
    thumbnail: p.thumbnail,
    preview: p.thumbnail ?? p.heroImage ?? p.gallery[0]?.url ?? null,
    liveUrl: p.liveUrl,
    year: p.year,
    lifecycle: p.lifecycle,
    featured: p.featured,
    categoryName: p.category?.name ?? null,
    categorySlug: p.category?.slug ?? null,
    technologies: p.technologies.map((t) => t.name),
    metrics: p.metrics.map((m) => ({ value: m.value, label: m.label })),
  }));

  const skillCount = skillGroups.reduce((n, g) => n + g.skills.length, 0);

  // "Selected work" means selected. The home page carries the projects flagged
  // featured in the CMS and nothing else; everything published lives one click
  // away on /projects, which already has the category filters.
  //
  // Capped, because a home page that lists twenty things has selected nothing.
  // If no project is flagged, the top of the display order stands in, so the
  // section is never empty just because someone has not ticked a box yet.
  const featured = cards.filter((p) => p.featured);
  const shown = (featured.length ? featured : cards).slice(0, 4);
  const rest = cards.length - shown.length;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: profile.name,
          url: base,
          ...(profile.headline ? { jobTitle: profile.headline } : {}),
          ...(profile.bio ? { description: plainText(profile.bio, 300) } : {}),
          ...(profile.location ? { address: profile.location } : {}),
          ...(profile.email ? { email: profile.email } : {}),
          ...(profile.profileImage ? { image: profile.profileImage } : {}),
          ...(socials.length ? { sameAs: socials.map((s) => s.url) } : {}),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: settings.get("site.title", profile.name),
          url: base,
        }}
      />
      <Hero
        name={profile.name}
        headline={profile.headline}
        tagline={profile.heroTagline ?? ""}
        resumeUrl={profile.resumeUrl ?? ""}
        hasProjects={projects.length > 0}
      />

      {achievements.length > 0 ? (
        // Numbers set in the open, on one hairline, instead of six boxed tiles.
        // Six equal cards read as a dashboard widget; this reads as a figure.
        <div className="mx-auto w-full max-w-[1400px] px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
          <RevealGroup
            as="dl"
            className="grid grid-cols-2 gap-x-8 gap-y-10 border-t border-[var(--line)] pt-10 sm:grid-cols-3 lg:grid-cols-6"
          >
            {achievements.map((item) => (
              <RevealItem key={item.id}>
                <dd className="t-serif text-[clamp(2.25rem,4vw,3.25rem)] text-[var(--accent-ink)]">
                  {item.value}
                </dd>
                <dt className="mt-2 text-[0.8125rem] leading-snug tracking-[-0.01em] text-[var(--muted)]">
                  {item.label}
                </dt>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      ) : null}

      <Section id="work" label="Selected work">
        {/* No category chips here: with a handful of curated rows there is
            nothing to filter. They live on /projects, over the full set. */}
        <ProjectGrid projects={shown} categories={[]} />
        {cards.length > 0 ? <AllProjectsRow rest={rest} /> : null}
      </Section>

      <Section id="about" label="About" intro={profile.heroDescription ?? undefined}>
        <About profile={profile} />
      </Section>

      <Section id="experience" label="Experience">
        <Experience experience={experience} education={education} />
      </Section>

      <Section id="stack" label="Stack" aside={`${skillCount} entries`}>
        <Stack skillGroups={skillGroups} certifications={certifications} />
      </Section>

      <Section id="contact" label="Contact">
        <Contact
          heading={settings.get("site.contactHeading", "Let's work together")}
          blurb={settings.get("site.contactBlurb")}
          email={settings.get("site.contactEmail")}
          socials={socials}
          location={profile.location}
          availability={
            profile.availabilityText
              ? { status: profile.availabilityStatus ?? "CLOSED", text: profile.availabilityText }
              : null
          }
        />
      </Section>
    </>
  );
}

/**
 * The way out of the curated selection and into the full index.
 *
 * Built at the scale of a section heading rather than as a button, because it
 * is the end of the work section and the only route to the rest of it. The
 * hairline above it continues the rhythm of the project rows, so it reads as
 * the last entry in the list rather than a control bolted underneath.
 */
function AllProjectsRow({ rest }: { rest: number }) {
  return (
    <Reveal className="mt-24 lg:mt-36">
      <Link
        href="/projects"
        className="group flex items-center justify-between gap-8 border-t border-[var(--line)] pt-10 transition-colors duration-500 hover:border-[var(--line-strong)]"
      >
        <div>
          <p className="t-display text-[clamp(1.75rem,4vw,3rem)] text-[var(--fg)] transition-colors duration-500 group-hover:text-[var(--accent-ink)]">
            All projects
          </p>
          <p className="mt-3 text-[0.9375rem] tracking-[-0.012em] text-[var(--muted)]">
            {rest > 0
              ? `${rest} more, filterable by category`
              : "The full index, filterable by category"}
          </p>
        </div>
        <span aria-hidden className="arrow-ring h-14 w-14 text-[1.5rem]">
          <Arrow />
        </span>
      </Link>
    </Reveal>
  );
}
