"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ProjectCard, type CardProject } from "./ProjectCard";
import { Empty } from "./Section";

/**
 * Filters are derived from the project data, never from a hardcoded list.
 * Add a category in admin, attach a published project to it, and the chip
 * appears here on the next request.
 */
export function ProjectGrid({
  projects,
  categories,
}: {
  projects: CardProject[];
  categories: { slug: string; name: string }[];
}) {
  const [active, setActive] = useState<string>("all");
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
      active === "all"
        ? projects
        : projects.filter((p) => p.categorySlug === active),
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
          className="no-scrollbar -mx-4 mb-8 flex gap-px overflow-x-auto px-4 sm:mx-0 sm:px-0"
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
        <div className="grid-hairline grid-cols-1 md:grid-cols-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map((project, index) => (
              <motion.article
                key={project.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={project.featured ? "md:col-span-2" : ""}
              >
                <ProjectCard
                  project={project}
                  index={index}
                  featured={project.featured}
                />
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
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
      className="flex shrink-0 items-center gap-2 border px-3 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.1em] transition-colors"
      style={{
        borderColor: active ? "var(--accent)" : "var(--line-strong)",
        background: active ? "var(--accent)" : "transparent",
        color: active ? "#fff" : "var(--muted)",
      }}
    >
      {children}
      <span className="tabular-nums opacity-60">{count}</span>
    </button>
  );
}
