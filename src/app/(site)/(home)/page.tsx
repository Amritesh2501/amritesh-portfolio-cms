import Link from "next/link";
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
    categories,
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
        description={profile.heroDescription ?? ""}
        resumeUrl={profile.resumeUrl ?? ""}
        hasProjects={projects.length > 0}
        availability={
          profile.availabilityText
            ? {
                status: profile.availabilityStatus ?? "CLOSED",
                text: profile.availabilityText,
              }
            : null
        }
      />

      {achievements.length > 0 ? (
        <div className="mx-auto w-full max-w-[1400px] px-6 pb-8 sm:px-8 lg:px-12">
          <RevealGroup
            as="dl"
            className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3 lg:grid-cols-6"
          >
            {achievements.map((item) => (
              <RevealItem key={item.id} className="spot bg-[var(--surface)] px-5 py-7">
                <dd className="t-display text-[clamp(1.5rem,3vw,2.25rem)] text-[var(--accent)]">
                  {item.value}
                </dd>
                <dt className="t-meta mt-2.5 text-[0.5625rem] leading-relaxed">
                  {item.label}
                </dt>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      ) : null}

      <Section
        id="work"
        label="Selected work"
        index="01"
        aside={`${projects.length} published`}
      >
        <ProjectGrid
          projects={cards}
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        />
        {projects.length > 4 ? (
          <Reveal className="mt-10">
            <Link href="/projects" className="btn">
              Browse the full index
            </Link>
          </Reveal>
        ) : null}
      </Section>

      <Section id="about" label="About" index="02">
        <About profile={profile} />
      </Section>

      <Section id="experience" label="Experience" index="03">
        <Experience experience={experience} education={education} />
      </Section>

      <Section id="stack" label="Stack" index="04" aside={`${skillCount} entries`}>
        <Stack skillGroups={skillGroups} certifications={certifications} />
      </Section>

      <Section id="contact" label="Contact" index="05">
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
