"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ProjectCard, type CardProject } from "./ProjectCard";
import { Empty } from "./Section";

/**
 * Filters are derived from project data, never a hardcoded list. Add a category
 * in admin, attach a published project, and the chip appears on next request.
 */
export function ProjectGrid({
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
          className="no-scrollbar -mx-6 mb-10 flex gap-2 overflow-x-auto px-6 sm:mx-0 sm:px-0"
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map((project, index) => (
              <motion.article
                key={project.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: 20, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                transition={{
                  duration: 0.5,
                  delay: reduce ? 0 : Math.min(index, 4) * 0.05,
                  ease: [0.16, 1, 0.3, 1],
                }}
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
      className="flex shrink-0 items-center gap-2 rounded-[var(--r-full)] border px-4 py-2 text-[0.875rem] font-medium tracking-[-0.01em] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
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
