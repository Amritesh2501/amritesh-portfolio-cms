import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getProjectBySlug, getProjects, getSettings } from "@/lib/content";
import { plainText } from "@/lib/utils";
import { Markdown } from "@/components/site/Markdown";
import { Reveal, RevealGroup, RevealItem } from "@/components/site/Reveal";
import { Parallax } from "@/components/site/Parallax";

export const dynamic = "force-dynamic";

const LIFECYCLE_LABEL: Record<string, string> = {
  LIVE: "Live",
  IN_DEVELOPMENT: "In development",
  ARCHIVED: "Archived",
  PRIVATE: "Private",
  COMING_SOON: "Coming soon",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [project, settings] = await Promise.all([
    getProjectBySlug(slug),
    getSettings(),
  ]);

  if (!project) notFound();

  const description = plainText(project.shortDescription, 160);
  const image = project.heroImage ?? project.thumbnail ?? settings.get("seo.ogImage");

  return {
    title: project.title,
    description,
    openGraph: {
      type: "article",
      title: project.title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const all = await getProjects();
  const index = all.findIndex((p) => p.id === project.id);
  const next = all[(index + 1) % all.length];

  const caseStudy = [
    { label: "Challenge", body: project.challenges },
    { label: "Solution", body: project.solution },
    { label: "Results", body: project.results },
    { label: "Architecture", body: project.architecture },
    { label: "Lessons learned", body: project.lessonsLearned },
  ].filter((s) => s.body?.trim());

  const facts = [
    { label: "Role", value: project.role },
    { label: "Duration", value: project.duration },
    { label: "Category", value: project.category?.name ?? null },
    { label: "Status", value: LIFECYCLE_LABEL[project.lifecycle] ?? project.lifecycle },
    { label: "Year", value: project.year ? String(project.year) : null },
  ].filter((f) => f.value);

  return (
    <article>
      <div className="relative isolate overflow-hidden">
        <div className="hero-wash" aria-hidden />

        <div className="relative mx-auto w-full max-w-[1400px] px-6 sm:px-8 lg:px-12">
          <nav aria-label="Breadcrumb" className="py-6">
            <Link
              href="/projects"
              className="group inline-flex items-center gap-2 text-[0.875rem] font-medium tracking-[-0.01em] text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
            >
              <span
                aria-hidden
                className="transition-transform duration-300 group-hover:-translate-x-1"
              >
                &larr;
              </span>
              All projects
            </Link>
          </nav>

          <header className="grid gap-12 pb-16 pt-8 lg:grid-cols-[1.4fr_0.6fr] lg:gap-20 lg:pb-24 lg:pt-14">
            <div>
              <Reveal y={16} blur={false}>
                <span className="inline-flex items-center gap-2.5 rounded-[var(--r-full)] border border-[var(--line-strong)] px-3.5 py-1.5">
                  <span className="t-meta text-[0.5625rem] text-[var(--fg)]">
                    {project.category?.name ?? "Project"}
                  </span>
                  <span
                    aria-hidden
                    className="h-1 w-1 rounded-[var(--r-full)] bg-[var(--accent)]"
                  />
                  <span className="t-meta text-[0.5625rem]">
                    {LIFECYCLE_LABEL[project.lifecycle] ?? project.lifecycle}
                  </span>
                </span>
              </Reveal>

              <Reveal delay={0.06}>
                <h1 className="t-display-lg mt-7 text-[clamp(2.5rem,7vw,5rem)]">
                  {project.title}
                </h1>
              </Reveal>

              <Reveal delay={0.12}>
                <p className="t-lead mt-7 max-w-[56ch]">{project.shortDescription}</p>
              </Reveal>

              {(project.liveUrl || project.githubUrl || project.caseStudyUrl) && (
                <Reveal delay={0.18} blur={false}>
                  <div className="mt-9 flex flex-wrap gap-3">
                    {project.liveUrl ? (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-accent"
                      >
                        Visit live site
                      </a>
                    ) : null}
                    {project.githubUrl ? (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn"
                      >
                        Source
                      </a>
                    ) : null}
                    {project.caseStudyUrl ? (
                      <a
                        href={project.caseStudyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn"
                      >
                        External write-up
                      </a>
                    ) : null}
                  </div>
                </Reveal>
              )}
            </div>

            {facts.length > 0 ? (
              <Reveal delay={0.1}>
                <dl className="card h-fit divide-y divide-[var(--line)] overflow-hidden">
                  {facts.map((fact) => (
                    <div key={fact.label} className="px-6 py-4">
                      <dt className="t-meta text-[0.5625rem]">{fact.label}</dt>
                      <dd className="mt-2 text-[0.9375rem] leading-snug tracking-[-0.012em] text-[var(--fg)]">
                        {fact.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            ) : null}
          </header>
        </div>
      </div>

      {project.heroImage ? (
        <div className="mx-auto w-full max-w-[1400px] px-6 sm:px-8 lg:px-12">
          <Parallax speed={0.05}>
            <div className="relative aspect-[16/8] w-full overflow-hidden rounded-[var(--r-xl)] border border-[var(--line)] shadow-[var(--shadow-lg)]">
              <Image
                src={project.heroImage}
                alt={`${project.title} interface`}
                fill
                priority
                sizes="(max-width: 1400px) 100vw, 1400px"
                className="object-cover"
              />
            </div>
          </Parallax>
        </div>
      ) : null}

      {project.metrics.length > 0 ? (
        <div className="mx-auto mt-16 w-full max-w-[1400px] px-6 sm:px-8 lg:px-12">
          <RevealGroup
            as="dl"
            className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--line)] lg:grid-cols-4"
          >
            {project.metrics.map((metric) => (
              <RevealItem key={metric.id} className="bg-[var(--surface)] px-6 py-8">
                <dd className="t-display text-[clamp(1.75rem,4vw,2.75rem)] text-[var(--accent)]">
                  {metric.value}
                </dd>
                <dt className="t-meta mt-3 text-[0.5625rem] leading-relaxed">
                  {metric.label}
                </dt>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[1400px] px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="grid gap-14 lg:grid-cols-[1fr_280px] lg:gap-20">
          <div>
            {project.fullDescription ? (
              <Reveal>
                <Markdown content={project.fullDescription} />
              </Reveal>
            ) : null}

            {caseStudy.map((block, i) => (
              <Reveal key={block.label} delay={0.04}>
                <section className="mt-16 border-t border-[var(--line)] pt-10">
                  <h2 className="t-meta text-[var(--fg)]">
                    <span className="text-[var(--accent)]">
                      {String(i + 1).padStart(2, "0")}{" "}
                    </span>
                    {block.label}
                  </h2>
                  <Markdown content={block.body} className="mt-7" />
                </section>
              </Reveal>
            ))}
          </div>

          {project.technologies.length > 0 ? (
            <aside className="h-fit lg:sticky lg:top-24">
              <Reveal>
                <div className="card p-6">
                  <p className="t-meta text-[0.5625rem]">Built with</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {project.technologies.map((tech) => (
                      <li
                        key={tech.id}
                        className="rounded-[var(--r-full)] border border-[var(--line)] px-3 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-[var(--muted)]"
                      >
                        {tech.name}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </aside>
          ) : null}
        </div>

        {project.gallery.length > 0 ? (
          <section className="mt-24 border-t border-[var(--line)] pt-12">
            <Reveal>
              <h2 className="t-meta">Gallery</h2>
            </Reveal>
            <RevealGroup className="mt-8 grid gap-5 sm:grid-cols-2" stagger={0.06}>
              {project.gallery.map((image) => (
                <RevealItem key={image.id}>
                  <figure className="card overflow-hidden">
                    <div className="relative aspect-[16/10] w-full">
                      <Image
                        src={image.url}
                        alt={image.alt ?? ""}
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                    {image.caption ? (
                      <figcaption className="t-meta border-t border-[var(--line)] px-5 py-3.5 text-[0.5625rem]">
                        {image.caption}
                      </figcaption>
                    ) : null}
                  </figure>
                </RevealItem>
              ))}
            </RevealGroup>
          </section>
        ) : null}
      </div>

      {next && next.id !== project.id ? (
        <nav aria-label="Next project" className="border-t border-[var(--line)]">
          <Link
            href={`/projects/${next.slug}`}
            className="group mx-auto flex w-full max-w-[1400px] items-baseline justify-between gap-6 px-6 py-16 transition-colors hover:bg-[var(--surface)] sm:px-8 lg:px-12 lg:py-20"
          >
            <span>
              <span className="t-meta text-[0.5625rem]">Next</span>
              <span className="t-display mt-4 block text-[clamp(1.75rem,5vw,3.25rem)]">
                {next.title}
              </span>
            </span>
            <span
              aria-hidden
              className="shrink-0 text-[1.75rem] text-[var(--accent)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2"
            >
              &rarr;
            </span>
          </Link>
        </nav>
      ) : null}
    </article>
  );
}
