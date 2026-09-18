"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Arrow } from "./Arrow";
import { Empty } from "./Section";
import type { CardProject } from "./ProjectCard";

/**
 * The full index.
 *
 * Deliberately not the home page's layout. There, four projects get a
 * full-width browser window each and the point is to look at them. Here the
 * point is to find one, so it is a two-column plate grid: the image still
 * leads, but a screen holds four of them instead of one, and the metadata sits
 * where it can be scanned down a column rather than read.
 *
 * The category filters live here rather than on the home page, because this is
 * the only view with enough in it to be worth narrowing.
 */
export function ProjectIndex({
  projects,
  categories,
}: {
  projects: CardProject[];
  categories: { slug: string; name: string }[];
}) {
  const [active, setActive] = useState("all");
  const reduce = useReducedMotion();

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const project of projects) {
      if (!project.categorySlug) continue;
      map.set(project.categorySlug, (map.get(project.categorySlug) ?? 0) + 1);
    }
    return map;
  }, [projects]);

  const filtered = useMemo(
    () =>
      active === "all" ? projects : projects.filter((p) => p.categorySlug === active),
    [projects, active],
  );

  if (projects.length === 0) {
    return <Empty>No published projects yet. Publish one from the CMS.</Empty>;
  }

  return (
    <div>
      {categories.length > 1 ? (
        <div
          role="group"
          aria-label="Filter projects by category"
          className="no-scrollbar -mx-6 mb-14 flex gap-2 overflow-x-auto px-6 sm:mx-0 sm:px-0"
        >
          <FilterChip
            active={active === "all"}
            onClick={() => setActive("all")}
            count={projects.length}
          >
            All
          </FilterChip>
          {categories.map((category) => (
            <FilterChip
              key={category.slug}
              active={active === category.slug}
              onClick={() => setActive(category.slug)}
              count={counts.get(category.slug) ?? 0}
            >
              {category.name}
            </FilterChip>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <Empty>Nothing published in this category yet.</Empty>
      ) : (
        <ul className="grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:gap-x-16 lg:gap-y-24">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map((project, i) => (
              <motion.li
                key={project.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                transition={{
                  duration: 0.5,
                  delay: reduce ? 0 : Math.min(i, 6) * 0.05,
                  ease: [0.22, 1, 0.36, 1],
                  layout: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                }}
              >
                <IndexCard project={project} tone={["a", "b", "c"][i % 3]} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

function IndexCard({ project, tone }: { project: CardProject; tone: string }) {
  const meta = [project.categoryName, project.year].filter(Boolean).join(" · ");

  return (
    <Link href={`/projects/${project.slug}`} className="group block">
      <div className={`plate plate-${tone}`}>
        {project.preview ? (
          // Plain img: thumbnails can be any CMS URL, and next/image refuses
          // hosts that are not allow-listed in next.config.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.preview}
            alt=""
            loading="lazy"
            decoding="async"
            className="plate-img"
          />
        ) : (
          <span className="t-serif plate-letter" aria-hidden>
            {project.title.trim().charAt(0)}
          </span>
        )}
      </div>

      <div className="mt-6 flex items-start justify-between gap-6">
        <div className="min-w-0">
          {meta ? <p className="t-meta tabular-nums">{meta}</p> : null}
          <h2 className="t-display mt-2.5 text-[clamp(1.375rem,2.2vw,1.875rem)] text-[var(--fg)] transition-colors duration-500 group-hover:text-[var(--accent-ink)]">
            {project.title}
          </h2>
          <p className="mt-3 max-w-[46ch] text-[0.9375rem] leading-relaxed tracking-[-0.012em] text-[var(--muted)]">
            {project.shortDescription}
          </p>
          {project.technologies.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {project.technologies.slice(0, 4).map((tech) => (
                <span key={tech} className="tag">
                  {tech}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <span aria-hidden className="arrow-ring mt-1 h-10 w-10 text-[1rem]">
          <Arrow direction="up-right" />
        </span>
      </div>
    </Link>
  );
}

function FilterChip({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="lift flex shrink-0 items-center gap-2 rounded-[var(--r-full)] border px-4 py-2 text-[0.875rem] font-medium tracking-[-0.01em]"
      style={{
        borderColor: active ? "transparent" : "var(--line-strong)",
        background: active ? "var(--fg)" : "transparent",
        color: active ? "var(--bg)" : "var(--muted)",
      }}
    >
      {children}
      <span className="tabular-nums text-[0.75rem] opacity-55">{count}</span>
    </button>
  );
}
