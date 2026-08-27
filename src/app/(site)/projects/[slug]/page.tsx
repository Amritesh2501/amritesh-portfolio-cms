import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getProjectBySlug, getProjects, getSettings } from "@/lib/content";
import { plainText } from "@/lib/utils";
import { Markdown } from "@/components/site/Markdown";
import { Reveal } from "@/components/site/Reveal";

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
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <nav aria-label="Breadcrumb" className="border-b border-[var(--line)] py-4">
          <Link href="/projects" className="t-meta transition-colors hover:text-[var(--fg)]">
            <span aria-hidden className="text-[var(--accent)]">{"<< "}</span>
            All projects
          </Link>
        </nav>

        <header className="grid gap-10 py-14 lg:grid-cols-[1.4fr_1fr] lg:gap-16 lg:py-20">
          <div>
            <p className="t-meta">
              {project.category?.name ?? "Project"}
              <span className="text-[var(--accent)]"> / </span>
              {LIFECYCLE_LABEL[project.lifecycle] ?? project.lifecycle}
            </p>
            <h1 className="t-display mt-5 text-[clamp(2.5rem,8vw,6rem)]">
              {project.title}
            </h1>
            <p className="mt-6 max-w-[58ch] text-[clamp(0.9375rem,1.6vw,1.125rem)] leading-relaxed text-[var(--muted)]">
              {project.shortDescription}
            </p>

            {(project.liveUrl || project.githubUrl || project.caseStudyUrl) && (
              <div className="mt-8 flex flex-wrap gap-3">
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
            )}
          </div>

          {facts.length > 0 ? (
            <dl className="grid-hairline h-fit grid-cols-2">
              {facts.map((fact) => (
                <div key={fact.label} className="px-4 py-4">
                  <dt className="t-meta text-[0.625rem]">{fact.label}</dt>
                  <dd className="mt-1.5 text-[0.8125rem] leading-snug text-[var(--fg)]">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </header>
      </div>

      {project.heroImage ? (
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10">
          <div className="relative aspect-[16/8] w-full border border-[var(--line-strong)]">
            <Image
              src={project.heroImage}
              alt={`${project.title} interface`}
              fill
              priority
              sizes="(max-width: 1400px) 100vw, 1400px"
              className="object-cover"
            />
          </div>
        </div>
      ) : null}

      {project.metrics.length > 0 ? (
        <div className="mx-auto mt-14 w-full max-w-[1400px] px-4 sm:px-6 lg:px-10">
          <dl className="grid-hairline grid-cols-2 lg:grid-cols-4">
            {project.metrics.map((metric) => (
              <div key={metric.id} className="px-5 py-7">
                <dd className="t-display text-[clamp(1.75rem,4vw,3rem)] text-[var(--accent)]">
                  {metric.value}
                </dd>
                <dt className="t-meta mt-2.5 text-[0.625rem] leading-relaxed">
                  {metric.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_260px] lg:gap-16">
          <div>
            {project.fullDescription ? (
              <Reveal>
                <Markdown content={project.fullDescription} />
              </Reveal>
            ) : null}

            {caseStudy.map((block, i) => (
              <Reveal key={block.label} delay={i * 0.03}>
                <section className="mt-14 border-t border-[var(--line)] pt-8">
                  <h2 className="t-meta text-[var(--fg)]">
                    <span className="text-[var(--accent)]">
                      {String(i + 1).padStart(2, "0")}{" "}
                    </span>
                    {block.label}
                  </h2>
                  <Markdown content={block.body} className="mt-6" />
                </section>
              </Reveal>
            ))}
          </div>

          {project.technologies.length > 0 ? (
            <aside className="h-fit lg:sticky lg:top-24">
              <p className="t-meta border-b border-[var(--line)] pb-2">Built with</p>
              <ul className="mt-4 grid gap-2">
                {project.technologies.map((tech) => (
                  <li
                    key={tech.id}
                    className="border border-[var(--line)] px-2.5 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--muted)]"
                  >
                    {tech.name}
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}
        </div>

        {project.gallery.length > 0 ? (
          <section className="mt-20 border-t border-[var(--line)] pt-10">
            <h2 className="t-meta">Gallery</h2>
            <div className="mt-8 grid gap-px bg-[var(--line)] sm:grid-cols-2">
              {project.gallery.map((image) => (
                <figure key={image.id} className="bg-[var(--bg)]">
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
                    <figcaption className="t-meta px-4 py-3">
                      {image.caption}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {next && next.id !== project.id ? (
        <nav
          aria-label="Next project"
          className="border-t border-[var(--line)]"
        >
          <Link
            href={`/projects/${next.slug}`}
            className="group mx-auto flex w-full max-w-[1400px] items-baseline justify-between gap-6 px-4 py-12 transition-colors hover:bg-[var(--surface)] sm:px-6 lg:px-10 lg:py-16"
          >
            <span>
              <span className="t-meta">Next</span>
              <span className="t-display mt-3 block text-[clamp(1.75rem,5vw,3.5rem)]">
                {next.title}
              </span>
            </span>
            <span
              aria-hidden
              className="t-display shrink-0 text-2xl text-[var(--accent)] transition-transform duration-200 group-hover:translate-x-2"
            >
              {">>"}
            </span>
          </Link>
        </nav>
      ) : null}
    </article>
  );
}
