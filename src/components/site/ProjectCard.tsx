import Link from "next/link";
import Image from "next/image";

export type CardProject = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  thumbnail: string | null;
  year: number | null;
  lifecycle: string;
  featured: boolean;
  categoryName: string | null;
  categorySlug: string | null;
  technologies: string[];
  metrics: { value: string; label: string }[];
};

const LIFECYCLE_LABEL: Record<string, string> = {
  LIVE: "Live",
  IN_DEVELOPMENT: "In development",
  ARCHIVED: "Archived",
  PRIVATE: "Private",
  COMING_SOON: "Coming soon",
};

export function ProjectCard({
  project,
  index,
  featured,
}: {
  project: CardProject;
  index: number;
  featured: boolean;
}) {
  const label = LIFECYCLE_LABEL[project.lifecycle] ?? project.lifecycle;

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group relative flex h-full flex-col bg-[var(--bg)] transition-colors duration-200 hover:bg-[var(--surface)]"
    >
      <div
        className={`relative overflow-hidden border-b border-[var(--line)] ${
          featured ? "aspect-[16/7]" : "aspect-[16/10]"
        }`}
      >
        {project.thumbnail ? (
          <Image
            src={project.thumbnail}
            alt=""
            fill
            sizes={featured ? "(max-width: 768px) 100vw, 100vw" : "(max-width: 768px) 100vw, 50vw"}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          /* No image uploaded yet. A typographic plate rather than a stock
             photo or a fake screenshot: it stays honest and stays on-brand.
             Upload a real thumbnail in Admin > Media to replace it. */
          <div className="absolute inset-0 flex items-end justify-between gap-4 bg-[var(--surface)] p-5">
            <span
              className="t-display leading-none text-[clamp(3.5rem,12vw,9rem)]"
              style={{ color: "color-mix(in srgb, var(--fg) 9%, transparent)" }}
              aria-hidden
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="t-meta text-right">
              {project.categoryName ?? "Project"}
            </span>
          </div>
        )}

        <span className="absolute left-0 top-0 flex items-center gap-2 border-b border-r border-[var(--line-strong)] bg-[var(--bg)] px-2.5 py-1.5">
          <span className="t-meta text-[var(--fg)]">{label}</span>
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-4">
          <h3
            className={`t-display text-[var(--fg)] ${
              featured
                ? "text-[clamp(1.5rem,3.5vw,2.5rem)]"
                : "text-[clamp(1.25rem,2.5vw,1.75rem)]"
            }`}
          >
            {project.title}
          </h3>
          {project.year ? (
            <span className="t-meta shrink-0 tabular-nums">{project.year}</span>
          ) : null}
        </div>

        <p
          className={`mt-3 text-[0.875rem] leading-relaxed text-[var(--muted)] ${
            featured ? "max-w-[70ch]" : "max-w-[52ch]"
          }`}
        >
          {project.shortDescription}
        </p>

        {featured && project.metrics.length > 0 ? (
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
            {project.metrics.slice(0, 4).map((metric) => (
              <div key={metric.label}>
                <dt className="t-meta text-[0.625rem]">{metric.label}</dt>
                <dd className="t-display mt-1 text-xl text-[var(--accent)]">
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-2 pt-6">
          {project.technologies.slice(0, featured ? 8 : 5).map((tech) => (
            <span
              key={tech}
              className="border border-[var(--line)] px-2 py-1 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-[var(--muted)]"
            >
              {tech}
            </span>
          ))}
          {project.technologies.length > (featured ? 8 : 5) ? (
            <span className="t-meta text-[0.625rem]">
              +{project.technologies.length - (featured ? 8 : 5)}
            </span>
          ) : null}
        </div>

        <span className="mt-6 flex items-center gap-2 border-t border-[var(--line)] pt-4 t-label text-[var(--fg)]">
          Read the case study
          <span
            aria-hidden
            className="text-[var(--accent)] transition-transform duration-200 group-hover:translate-x-1"
          >
            {">>"}
          </span>
        </span>
      </div>
    </Link>
  );
}
