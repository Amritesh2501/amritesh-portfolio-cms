import Link from "next/link";
import { getHomeData } from "@/lib/content";
import { dateRange } from "@/lib/utils";
import { Hero } from "@/components/site/Hero";
import { Section, Empty } from "@/components/site/Section";
import { Reveal, RevealGroup, RevealItem } from "@/components/site/Reveal";
import { Parallax } from "@/components/site/Parallax";
import { Markdown } from "@/components/site/Markdown";
import { ProjectGrid } from "@/components/site/ProjectGrid";
import { ContactForm } from "@/components/site/ContactForm";
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
    year: p.year,
    lifecycle: p.lifecycle,
    featured: p.featured,
    categoryName: p.category?.name ?? null,
    categorySlug: p.category?.slug ?? null,
    technologies: p.technologies.map((t) => t.name),
    metrics: p.metrics.map((m) => ({ value: m.value, label: m.label })),
  }));

  const skillCount = skillGroups.reduce((n, g) => n + g.skills.length, 0);

  // Real values only. Every readout is a count of published rows or a profile
  // field, so nothing here is invented precision.
  const readouts = [
    { key: "projects", value: String(projects.length) },
    { key: "stack items", value: String(skillCount) },
    { key: "roles", value: String(experience.length) },
    {
      key: "status",
      value:
        profile.availabilityStatus === "OPEN"
          ? "available"
          : profile.availabilityStatus === "SELECTIVE"
            ? "selective"
            : "engaged",
    },
  ];

  const bootLines = [
    `identity ${profile.name.toLowerCase().replace(/\s+/g, "_")}`,
    profile.currentlyWorkingAt
      ? `engaged ${profile.currentlyWorkingRole ?? "engineer"} @ ${profile.currentlyWorkingAt}`
      : "engaged independent",
    `stack ${skillGroups
      .slice(0, 3)
      .map((g) => g.name.toLowerCase().split(" ")[0])
      .join(" ")}`,
    `content ${projects.length} projects served from postgres`,
  ];

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
        readouts={readouts}
        bootLines={bootLines}
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
              <RevealItem key={item.id} className="bg-[var(--surface)] px-5 py-7">
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
        <div className="grid gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <Reveal>
            <Markdown content={profile.bio} />
            {profile.longBio ? (
              <div className="mt-12 border-t border-[var(--line)] pt-12">
                <Markdown content={profile.longBio} />
              </div>
            ) : null}
          </Reveal>

          {/* Slight counter-drift so the two columns do not scroll as one slab. */}
          <Parallax speed={0.035} className="grid content-start gap-5">
            {[
              { label: "How I work", body: profile.philosophy },
              { label: "Technical interests", body: profile.technicalInterests },
              { label: "Current focus", body: profile.currentFocus },
            ]
              .filter((block) => block.body?.trim())
              .map((block, i) => (
                <Reveal key={block.label} delay={i * 0.06}>
                  <div className="card p-6 sm:p-7">
                    <p className="t-meta text-[0.5625rem]">{block.label}</p>
                    <Markdown
                      content={block.body}
                      className="mt-4 text-[0.9375rem]"
                    />
                  </div>
                </Reveal>
              ))}
          </Parallax>
        </div>
      </Section>

      <Section id="experience" label="Experience" index="03">
        {experience.length === 0 ? (
          <Empty>No published roles yet.</Empty>
        ) : (
          <ol className="grid gap-px overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--line)]">
            {experience.map((role, i) => (
              <Reveal as="li" key={role.id} delay={i * 0.05}>
                <article className="grid gap-6 bg-[var(--surface)] p-7 sm:p-9 md:grid-cols-[200px_1fr] md:gap-12">
                  <div>
                    <p className="t-meta tabular-nums text-[0.5625rem]">
                      {dateRange(role.startDate, role.endDate, role.currentlyWorking)}
                    </p>
                    {role.location || role.employmentType ? (
                      <p className="t-meta mt-2 text-[0.5625rem] normal-case tracking-normal">
                        {[role.employmentType, role.location]
                          .filter(Boolean)
                          .join(" / ")}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <h3 className="t-display text-[clamp(1.25rem,2.4vw,1.75rem)]">
                      {role.role}
                    </h3>
                    <p className="mt-2 text-[0.9375rem] font-medium text-[var(--accent)]">
                      {role.companyUrl ? (
                        <a
                          href={role.companyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {role.company}
                        </a>
                      ) : (
                        role.company
                      )}
                    </p>

                    <Markdown
                      content={role.description}
                      className="mt-5 text-[0.9375rem]"
                    />

                    {role.achievements.length > 0 ? (
                      <ul className="mt-6 grid gap-2.5">
                        {role.achievements.map((item) => (
                          <li
                            key={item}
                            className="relative pl-6 text-[0.9375rem] leading-relaxed tracking-[-0.012em] text-[var(--muted)]"
                          >
                            <span
                              aria-hidden
                              className="absolute left-1 top-[0.65em] h-1 w-1 rounded-[var(--r-full)] bg-[var(--accent)]"
                            />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {role.technologies.length > 0 ? (
                      <div className="mt-6 flex flex-wrap gap-2">
                        {role.technologies.map((tech) => (
                          <span
                            key={tech.id}
                            className="rounded-[var(--r-full)] border border-[var(--line)] px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-[var(--muted)]"
                          >
                            {tech.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              </Reveal>
            ))}
          </ol>
        )}

        {education.length > 0 ? (
          <div className="mt-16">
            <Reveal>
              <p className="t-meta">Education</p>
            </Reveal>
            <RevealGroup as="ul" className="mt-6 grid gap-5 sm:grid-cols-2">
              {education.map((entry) => (
                <RevealItem as="li" key={entry.id} className="card p-6 sm:p-7">
                  <p className="t-display text-[1.25rem]">{entry.degree}</p>
                  <p className="mt-2 text-[0.9375rem] text-[var(--muted)]">
                    {[entry.field, entry.institution].filter(Boolean).join(", ")}
                  </p>
                  <p className="t-meta mt-3 tabular-nums text-[0.5625rem]">
                    {dateRange(entry.startDate, entry.endDate, false)}
                    {entry.location ? ` / ${entry.location}` : ""}
                  </p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        ) : null}
      </Section>

      <Section id="stack" label="Stack" index="04" aside={`${skillCount} entries`}>
        {skillGroups.length === 0 ? (
          <Empty>No published skills yet.</Empty>
        ) : (
          <RevealGroup
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            stagger={0.05}
          >
            {skillGroups.map((group) => (
              <RevealItem key={group.id} className="card p-6 sm:p-7">
                <p className="t-meta text-[0.5625rem] text-[var(--fg)]">
                  {group.name}
                </p>
                <ul className="mt-5 grid gap-3.5">
                  {group.skills.map((skill) => (
                    <li key={skill.id} className="grid gap-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[0.9375rem] tracking-[-0.012em] text-[var(--fg)]">
                          {skill.name}
                        </span>
                        {skill.proficiency != null ? (
                          <span className="t-meta text-[0.5625rem] tabular-nums">
                            {skill.proficiency}
                          </span>
                        ) : null}
                      </div>
                      {skill.proficiency != null ? (
                        <span
                          aria-hidden
                          className="block h-[3px] w-full overflow-hidden rounded-[var(--r-full)] bg-[var(--line)]"
                        >
                          <span
                            className="block h-full rounded-[var(--r-full)] bg-[var(--accent)]"
                            style={{ width: `${skill.proficiency}%` }}
                          />
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </RevealItem>
            ))}
          </RevealGroup>
        )}

        {certifications.length > 0 ? (
          <div className="mt-16">
            <Reveal>
              <p className="t-meta">Certifications</p>
            </Reveal>
            <RevealGroup
              as="ul"
              className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              stagger={0.04}
            >
              {certifications.map((cert) => (
                <RevealItem as="li" key={cert.id} className="card p-6">
                  <p className="text-[0.9375rem] font-medium leading-snug tracking-[-0.012em] text-[var(--fg)]">
                    {cert.credentialUrl ? (
                      <a
                        href={cert.credentialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[var(--accent)]"
                      >
                        {cert.name}
                      </a>
                    ) : (
                      cert.name
                    )}
                  </p>
                  <p className="t-meta mt-3 text-[0.5625rem]">{cert.issuer}</p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        ) : null}
      </Section>

      <Section
        id="contact"
        label="Contact"
        index="05"
        title={settings.get("site.contactHeading", "Let's work together")}
        intro={settings.get("site.contactBlurb")}
      >
        <div className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <Reveal>
            <ContactForm />
          </Reveal>

          <Parallax speed={0.03} className="grid content-start gap-5">
            {settings.get("site.contactEmail") ? (
              <Reveal>
                <div className="card p-6 sm:p-7">
                  <p className="t-meta text-[0.5625rem]">Direct</p>
                  <a
                    href={`mailto:${settings.get("site.contactEmail")}`}
                    className="t-display mt-3 block break-all text-[clamp(1.125rem,2.2vw,1.5rem)] text-[var(--fg)] transition-colors hover:text-[var(--accent)]"
                  >
                    {settings.get("site.contactEmail")}
                  </a>
                </div>
              </Reveal>
            ) : null}

            {socials.length > 0 ? (
              <Reveal delay={0.06}>
                <div className="card p-6 sm:p-7">
                  <p className="t-meta text-[0.5625rem]">Elsewhere</p>
                  <ul className="mt-4 grid gap-1">
                    {socials.map((social) => (
                      <li key={social.id}>
                        <a
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center justify-between gap-4 rounded-[var(--r-xs)] py-2.5 text-[0.9375rem] tracking-[-0.012em] transition-colors hover:text-[var(--accent)]"
                        >
                          <span>{social.label}</span>
                          <span
                            aria-hidden
                            className="text-[var(--muted)] transition-transform duration-300 group-hover:translate-x-1"
                          >
                            &rarr;
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ) : null}

            {profile.location ? (
              <Reveal delay={0.12}>
                <div className="card p-6 sm:p-7">
                  <p className="t-meta text-[0.5625rem]">Based in</p>
                  <p className="mt-3 text-[0.9375rem] text-[var(--fg)]">
                    {profile.location}
                  </p>
                </div>
              </Reveal>
            ) : null}
          </Parallax>
        </div>
      </Section>
    </>
  );
}
