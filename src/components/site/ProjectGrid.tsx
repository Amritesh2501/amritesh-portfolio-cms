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

  // A "Featured" chip on every row of a list that is entirely featured is
  // noise. Derived rather than passed, so both call sites stay honest without
  // having to remember which one they are.
  const allFeatured = projects.length > 0 && projects.every((p) => p.featured);

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
        <div className="grid gap-24 lg:gap-36">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map((project, index) => (
              <motion.article
                key={project.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                transition={{
                  duration: 0.6,
                  delay: reduce ? 0 : Math.min(index, 5) * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                  layout: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                }}
              >
                <ProjectCard
                  project={project}
                  index={index}
                  showFeatured={!allFeatured}
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
