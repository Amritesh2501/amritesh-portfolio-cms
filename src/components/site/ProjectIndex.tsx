"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Arrow } from "./Arrow";
import { Empty } from "./Section";
import type { CardProject } from "./ProjectCard";

/**
 * The full index.
 *
 * Deliberately not the home page's layout. There, four projects get a whole
 * viewport each and the point is to look at them. Here the point is to find
 * one, so it is a numbered ledger: index, plate, title, one line, year.
 *
 * Two things this is built to avoid, both of which were felt as the page
 * stuttering rather than seen as a design problem:
 *
 *  - The thumbnail track is a FIXED width and the plate is always there. It
 *    used to be a zero-width grid column that transitioned open on hover, and
 *    animating a grid track is a full layout of the list on every frame of a
 *    600ms transition. Running the pointer down forty rows while scrolling
 *    queued forty of those, on the same main thread that the smooth scroller
 *    sets the scroll position from, so the page appeared to give up scrolling.
 *    Hover now only moves transforms and colours, which never leave the
 *    compositor.
 *
 *  - Filtering is a CSS enter animation keyed on the active filter, not a
 *    per-row layout animation. motion's `layout` measures every row it is on
 *    whenever anything reflows, which is the same cost arriving from the other
 *    direction. Nothing here reorders in place, it swaps sets, so a stagger
 *    says the same thing for none of it.
 */
export function ProjectIndex({
  projects,
  categories,
}: {
  projects: CardProject[];
  categories: { slug: string; name: string }[];
}) {
  const [active, setActive] = useState("all");

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
        // Keyed on the filter, so switching category remounts the list and
        // every row plays its enter animation again. One line instead of an
        // AnimatePresence.
        <ul key={active} className="index-list">
          {filtered.map((project, i) => (
            <li
              key={project.id}
              className="index-item"
              // Capped: past the eighth row the stagger is only delaying
              // content that is below the fold anyway.
              style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
            >
              <IndexCard
                project={project}
                position={i + 1}
                tone={["a", "b", "c"][i % 3]}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One entry in the index: a numbered ledger line.
 *
 * The number is the design. A long list of titles needs a left edge with a
 * rhythm to it, and a counting column gives the eye something to travel down
 * and a way to say where something was. The plate beside it is small, square
 * and permanently visible rather than a reveal, because an index is scanned
 * and a picture that only exists under the pointer cannot be scanned.
 *
 * Everything that happens on hover is transform and colour: the plate lifts
 * its image, the title and the arrow slide, a wash fades in behind the row.
 */
function IndexCard({
  project,
  position,
  tone,
}: {
  project: CardProject;
  position: number;
  tone: string;
}) {
  return (
    <Link href={`/projects/${project.slug}`} className="index-row group">
      <span aria-hidden className="index-row-wash" />

      <span className="index-num t-meta tabular-nums" aria-hidden>
        {String(position).padStart(2, "0")}
      </span>

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

      <div className="index-row-body">
        <h2 className="index-title t-display text-[clamp(1.375rem,2.6vw,2rem)]">
          {project.title}
        </h2>
        <span className="mt-2 block max-w-[52ch] text-[0.9375rem] leading-relaxed tracking-[-0.012em] text-[var(--muted)]">
          {project.shortDescription}
        </span>
        {project.technologies.length > 0 ? (
          <span className="index-row-tech" aria-hidden>
            {project.technologies.slice(0, 3).join(" · ")}
          </span>
        ) : null}
      </div>

      <span className="index-row-meta">
        {project.year ? (
          <span className="t-serif index-year tabular-nums">{project.year}</span>
        ) : null}
        {project.categoryName ? (
          <span className="t-meta mt-1 block">{project.categoryName}</span>
        ) : null}
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
