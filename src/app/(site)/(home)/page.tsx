import Link from "next/link";
import { getHomeData } from "@/lib/content";
import { dateRange } from "@/lib/utils";
import { Hero } from "@/components/site/Hero";
import { Section, Empty } from "@/components/site/Section";
import { Reveal } from "@/components/site/Reveal";
import { Markdown } from "@/components/site/Markdown";
import { ProjectGrid } from "@/components/site/ProjectGrid";
import { ContactForm } from "@/components/site/ContactForm";
import type { CardProject } from "@/components/site/ProjectCard";

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
        <p className="mt-4 text-sm text-[var(--muted)]">
          Run <code className="md-code">npm run db:seed</code>, or sign in to the
          CMS and publish a profile.
        </p>
        <Link href="/admin" className="btn mt-8">
          Open CMS
        </Link>
      </div>
    );
  }

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

  // Real values only. Every readout below is a count of published rows or a
  // field on the profile, so nothing here is invented precision.
  const readouts = [
    { key: "projects_shipped", value: String(projects.length) },
    { key: "stack_items", value: String(skillCount) },
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
      <Hero
        name={profile.name}
        headline={profile.headline}
        tagline={profile.heroTagline ?? ""}
        description={profile.heroDescription ?? ""}
        resumeUrl={profile.resumeUrl ?? ""}
        readouts={readouts}
        bootLines={bootLines}
        hasProjects={projects.length > 0}
      />

      {achievements.length > 0 ? (
        <div className="mx-auto mt-16 w-full max-w-[1400px] px-4 sm:px-6 lg:mt-24 lg:px-10">
          <dl className="grid-hairline grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {achievements.map((item) => (
              <div key={item.id} className="px-4 py-6">
                <dd className="t-display text-[clamp(1.5rem,3vw,2.25rem)] text-[var(--accent)]">
                  {item.value}
                </dd>
                <dt className="t-meta mt-2 text-[0.625rem] leading-relaxed">
                  {item.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <div className="mt-20 lg:mt-28" />

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
          <div className="mt-8">
            <Link href="/projects" className="btn">
              Browse the full index
            </Link>
          </div>
        ) : null}
      </Section>

      <Section id="about" label="About" index="02">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div>
            <Markdown content={profile.bio} />
            {profile.longBio ? (
              <div className="mt-10 border-t border-[var(--line)] pt-10">
                <Markdown content={profile.longBio} />
              </div>
            ) : null}
          </div>

          <div className="grid gap-10">
            {profile.philosophy ? (
              <Reveal>
                <p className="t-meta border-b border-[var(--line)] pb-2">
                  How I work
                </p>
                <Markdown content={profile.philosophy} className="mt-5 text-sm" />
              </Reveal>
            ) : null}

            {profile.technicalInterests ? (
              <Reveal>
                <p className="t-meta border-b border-[var(--line)] pb-2">
                  Technical interests
                </p>
                <Markdown
                  content={profile.technicalInterests}
                  className="mt-5 text-sm"
                />
              </Reveal>
            ) : null}

            {profile.currentFocus ? (
              <Reveal>
                <p className="t-meta border-b border-[var(--line)] pb-2">
                  Current focus
                </p>
                <Markdown content={profile.currentFocus} className="mt-5 text-sm" />
              </Reveal>
            ) : null}
          </div>
        </div>
      </Section>

      <Section id="experience" label="Experience" index="03">
        {experience.length === 0 ? (
          <Empty>No published roles yet.</Empty>
        ) : (
          <ol className="grid gap-px bg-[var(--line)]">
            {experience.map((role, i) => (
              <Reveal as="li" key={role.id} delay={i * 0.04}>
                <article className="grid gap-6 bg-[var(--bg)] py-8 md:grid-cols-[180px_1fr] md:gap-10">
                  <div>
                    <p className="t-meta tabular-nums">
                      {dateRange(role.startDate, role.endDate, role.currentlyWorking)}
                    </p>
                    {role.location || role.employmentType ? (
                      <p className="t-meta mt-2 text-[0.625rem]">
                        {[role.employmentType, role.location]
                          .filter(Boolean)
                          .join(" / ")}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <h3 className="t-display text-[clamp(1.25rem,2.5vw,1.875rem)]">
                      {role.role}
                    </h3>
                    <p className="mt-1.5 text-sm text-[var(--accent)]">
                      {role.companyUrl ? (
                        <a
                          href={role.companyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-4"
                        >
                          {role.company}
                        </a>
                      ) : (
                        role.company
                      )}
                    </p>

                    <Markdown content={role.description} className="mt-4 text-sm" />

                    {role.achievements.length > 0 ? (
                      <ul className="mt-5 grid gap-2">
                        {role.achievements.map((item) => (
                          <li
                            key={item}
                            className="relative pl-5 text-[0.8125rem] leading-relaxed text-[var(--muted)]"
                          >
                            <span
                              aria-hidden
                              className="absolute left-0 top-[0.65em] h-px w-2.5 bg-[var(--accent)]"
                            />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {role.technologies.length > 0 ? (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {role.technologies.map((tech) => (
                          <span
                            key={tech.id}
                            className="border border-[var(--line)] px-2 py-1 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-[var(--muted)]"
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
          <div className="mt-14 border-t border-[var(--line)] pt-10">
            <p className="t-meta">Education</p>
            <ul className="mt-6 grid gap-px bg-[var(--line)] sm:grid-cols-2">
              {education.map((entry) => (
                <li key={entry.id} className="bg-[var(--bg)] py-5 sm:px-5 sm:first:pl-0">
                  <p className="t-display text-lg">{entry.degree}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {[entry.field, entry.institution].filter(Boolean).join(", ")}
                  </p>
                  <p className="t-meta mt-2 tabular-nums">
                    {dateRange(entry.startDate, entry.endDate, false)}
                    {entry.location ? ` / ${entry.location}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <Section id="stack" label="Stack" index="04" aside={`${skillCount} entries`}>
        {skillGroups.length === 0 ? (
          <Empty>No published skills yet.</Empty>
        ) : (
          <div className="grid-hairline grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {skillGroups.map((group) => (
              <div key={group.id} className="p-5 sm:p-6">
                <p className="t-meta border-b border-[var(--line)] pb-2 text-[var(--fg)]">
                  {group.name}
                </p>
                <ul className="mt-4 grid gap-2.5">
                  {group.skills.map((skill) => (
                    <li key={skill.id} className="grid gap-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-mono text-[0.8125rem] text-[var(--fg)]">
                          {skill.name}
                        </span>
                        {skill.proficiency != null ? (
                          <span className="t-meta text-[0.625rem] tabular-nums">
                            {skill.proficiency}
                          </span>
                        ) : null}
                      </div>
                      {skill.proficiency != null ? (
                        <span
                          aria-hidden
                          className="block h-px w-full"
                          style={{
                            background: `linear-gradient(to right, var(--accent) ${skill.proficiency}%, var(--line) ${skill.proficiency}%)`,
                          }}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {certifications.length > 0 ? (
          <div className="mt-14 border-t border-[var(--line)] pt-10">
            <p className="t-meta">Certifications</p>
            <ul className="mt-6 grid gap-px bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
              {certifications.map((cert) => (
                <li key={cert.id} className="bg-[var(--bg)] p-5">
                  <p className="text-sm font-semibold leading-snug text-[var(--fg)]">
                    {cert.credentialUrl ? (
                      <a
                        href={cert.credentialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4 hover:text-[var(--accent)]"
                      >
                        {cert.name}
                      </a>
                    ) : (
                      cert.name
                    )}
                  </p>
                  <p className="t-meta mt-2">{cert.issuer}</p>
                </li>
              ))}
            </ul>
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
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <ContactForm />

          <div className="grid content-start gap-8">
            {settings.get("site.contactEmail") ? (
              <div>
                <p className="t-meta border-b border-[var(--line)] pb-2">Direct</p>
                <a
                  href={`mailto:${settings.get("site.contactEmail")}`}
                  className="t-display mt-4 block break-all text-[clamp(1.125rem,2.5vw,1.75rem)] text-[var(--fg)] transition-colors hover:text-[var(--accent)]"
                >
                  {settings.get("site.contactEmail")}
                </a>
              </div>
            ) : null}

            {socials.length > 0 ? (
              <div>
                <p className="t-meta border-b border-[var(--line)] pb-2">Elsewhere</p>
                <ul className="mt-4 grid gap-px bg-[var(--line)]">
                  {socials.map((social) => (
                    <li key={social.id} className="bg-[var(--bg)]">
                      <a
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-4 py-3 transition-colors hover:text-[var(--accent)]"
                      >
                        <span className="t-label">{social.label}</span>
                        <span aria-hidden className="t-meta">
                          {">>"}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {profile.location ? (
              <div>
                <p className="t-meta border-b border-[var(--line)] pb-2">Based in</p>
                <p className="mt-4 text-sm text-[var(--fg)]">{profile.location}</p>
              </div>
            ) : null}
          </div>
        </div>
      </Section>
    </>
  );
}
