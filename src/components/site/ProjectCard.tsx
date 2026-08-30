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
  const techLimit = featured ? 7 : 4;

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="mg-panel mg-panel-hover group flex h-full flex-col overflow-hidden"
    >
      <div
        className={`mg-tone relative overflow-hidden ${
          featured ? "aspect-[21/9]" : "aspect-[16/9]"
        }`}
      >
        {project.thumbnail ? (
          <Image
            src={project.thumbnail}
            alt=""
            fill
            sizes={
              featured
                ? "(max-width: 1400px) 100vw, 1400px"
                : "(max-width: 768px) 100vw, (max-width: 1400px) 50vw, 700px"
            }
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
          />
        ) : (
          /* No image uploaded yet. A typographic plate rather than a stock photo
             or a fake screenshot: honest, and on-brand. Upload a real thumbnail
             in Admin > Media to replace it. */
          <div className="absolute inset-0 flex items-end justify-between gap-4 bg-[var(--elevated)] p-6">
            <span
              className="t-display-lg leading-none text-[clamp(3rem,11vw,7rem)]"
              style={{ color: "color-mix(in srgb, var(--fg) 7%, transparent)" }}
              aria-hidden
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="t-meta text-right text-[0.5625rem]">
              {project.categoryName ?? "Project"}
            </span>
          </div>
        )}

        <span className="mg-caption absolute left-0 top-0">{label}</span>
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex items-baseline justify-between gap-4">
          <h3
            className={`t-display text-[var(--fg)] ${
              featured
                ? "text-[clamp(1.5rem,3.2vw,2.25rem)]"
                : "text-[clamp(1.25rem,2.2vw,1.5rem)]"
            }`}
          >
            {project.title}
          </h3>
          {project.year ? (
            <span className="t-meta shrink-0 tabular-nums text-[0.5625rem]">
              {project.year}
            </span>
          ) : null}
        </div>

        <p
          className={`mt-3.5 text-[0.9375rem] leading-relaxed tracking-[-0.012em] text-[var(--muted)] ${
            featured ? "max-w-[68ch]" : "max-w-[48ch]"
          }`}
        >
          {project.shortDescription}
        </p>

        {featured && project.metrics.length > 0 ? (
          <dl className="mt-7 flex flex-wrap gap-x-12 gap-y-5">
            {project.metrics.slice(0, 4).map((metric) => (
              <div key={metric.label}>
                <dd className="t-display text-[1.75rem] text-[var(--accent)]">
                  {metric.value}
                </dd>
                <dt className="t-meta mt-1.5 text-[0.5625rem]">{metric.label}</dt>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-7">
          {project.technologies.slice(0, techLimit).map((tech) => (
            <span
              key={tech}
              className="border-2 border-[var(--ink-soft)] px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-[var(--muted)] transition-colors group-hover:border-[var(--ink)]"
            >
              {tech}
            </span>
          ))}
          {project.technologies.length > techLimit ? (
            <span className="t-meta text-[0.5625rem]">
              +{project.technologies.length - techLimit}
            </span>
          ) : null}
        </div>

        <span className="mt-7 flex items-center gap-2 border-t-2 border-[var(--ink-soft)] pt-5 text-[0.875rem] font-medium tracking-[-0.01em] text-[var(--fg)]">
          Read the case study
          <span
            aria-hidden
            className="text-[var(--accent)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1"
          >
            &rarr;
          </span>
        </span>
      </div>
    </Link>
  );
}
