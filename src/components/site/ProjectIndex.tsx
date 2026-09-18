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
 * Deliberately not the home page's layout. There, four projects get a whole
 * viewport each and the point is to look at them. Here the point is to find
 * one, so it is a list read down its left edge: title, one line, category and
 * year, with a thumbnail that opens out only on the row under the pointer.
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
        <ul className="index-list">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map((project, i) => (
              <motion.li
                key={project.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0 }}
                transition={{
                  duration: 0.45,
                  delay: reduce ? 0 : Math.min(i, 8) * 0.04,
                  ease: [0.22, 1, 0.36, 1],
                  layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
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

/**
 * One entry in the index.
 *
 * A row, not a tile. The two-column plate grid this replaces gave every
 * project a big picture and a paragraph, which is the home page's job; an
 * index is read down its left edge, and a column of titles you can run your
 * eye along beats a mosaic you have to scan in two dimensions. The thumbnail
 * is still here, but it earns its place by opening out on hover rather than
 * sitting at full size on all of them at once.
 */
function IndexCard({ project, tone }: { project: CardProject; tone: string }) {
  const meta = [project.categoryName, project.year].filter(Boolean).join(" · ");

  return (
    <Link href={`/projects/${project.slug}`} className="index-row group">
      <span className={`index-thumb plate-${tone}`} aria-hidden>
        {project.preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.preview} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="t-serif index-thumb-letter">
            {project.title.trim().charAt(0)}
          </span>
        )}
      </span>

      <span className="index-row-body">
        <h2 className="t-display text-[clamp(1.375rem,2.6vw,2rem)] text-[var(--fg)] transition-colors duration-500 group-hover:text-[var(--accent-ink)]">
          {project.title}
        </h2>
        <span className="mt-2 block max-w-[52ch] text-[0.9375rem] leading-relaxed tracking-[-0.012em] text-[var(--muted)]">
          {project.shortDescription}
        </span>
      </span>

      <span className="index-row-meta">
        {meta ? <span className="t-meta tabular-nums">{meta}</span> : null}
      </span>

      {/* The index arrow is bare: no ring. A ring on every row of a long list
          is forty circles down the page, and the rule under the row is already
          the frame. It travels the width of that rule on hover instead. */}
      <span className="index-row-go" aria-hidden>
        <Arrow />
      </span>
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
