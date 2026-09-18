"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Arrow } from "./Arrow";
import { ProjectWindow, type CardProject } from "./ProjectCard";

gsap.registerPlugin(ScrollTrigger);

/**
 * Selected work, as a stack that deals itself.
 *
 * Each project holds the whole viewport while you read it, then the next one
 * rises over it and the one behind settles back and dims. It replaces four
 * full-width rows scrolling past in a column, where every project got the same
 * glance on the way to the next and the window was never bigger than a third
 * of the screen.
 *
 * The pinning is CSS `position: sticky`, not ScrollTrigger's `pin`. Pinning
 * rewrites the document with a spacer element and takes over the scroll
 * position, which is exactly what Lenis is already doing; the two fight and
 * the seam shows as a shudder at every hand-off. Sticky needs no spacer, and
 * GSAP is left to do the part it is actually best at: scrubbing the scale and
 * opacity of the card behind against the arrival of the card in front.
 *
 * Lenis drives the real window scroll, so ScrollTrigger's own listener is
 * already accurate and no scrollerProxy is needed.
 */
export function WorkStack({ projects }: { projects: CardProject[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduce || projects.length < 2) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".work-panel");

      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) return;

        // Driven by the NEXT card's approach, so the one behind recedes in
        // exact step with the one in front covering it.
        gsap.to(card.querySelector(".work-panel-inner"), {
          scale: 0.94,
          opacity: 0.4,
          ease: "none",
          scrollTrigger: {
            trigger: next,
            start: "top bottom",
            end: "top top",
            scrub: 0.6,
          },
        });
      });
    }, root);

    return () => ctx.revert();
  }, [reduce, projects.length]);

  return (
    <div ref={rootRef} className="work-stack">
      {projects.map((project, i) => (
        <section key={project.id} className="work-panel">
          <div className="work-panel-inner">
            <WorkPanel project={project} position={i + 1} total={projects.length} />
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * One project, composed around the window rather than beside it.
 *
 * The window used to sit in the right-hand 55% of a bordered card with the
 * copy crammed into the left. At that width the preview, which is the whole
 * point of the thing, was smaller than the paragraph explaining it. Now the
 * title sits above the window and the facts below it, so the window gets the
 * full column and the reading order matches the way the eye already moves:
 * name, look, detail.
 */
function WorkPanel({
  project,
  position,
  total,
}: {
  project: CardProject;
  position: number;
  total: number;
}) {
  const meta = [project.categoryName, project.year].filter(Boolean).join(" · ");

  return (
    <div className="work-card">
      <div className="work-card-head">
        <Link href={`/projects/${project.slug}`} className="group min-w-0">
          <h3 className="t-display text-[clamp(1.875rem,4vw,3.25rem)] text-[var(--fg)] transition-colors duration-500 group-hover:text-[var(--accent-ink)]">
            {project.title}
          </h3>
        </Link>
        <span className="t-meta shrink-0 tabular-nums" aria-hidden>
          {String(position).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>

      <div className="work-card-window">
        <ProjectWindow project={project} index={position - 1} />
      </div>

      <div className="work-card-foot">
        <div className="min-w-0">
          {meta ? <p className="t-meta tabular-nums">{meta}</p> : null}
          <p className="mt-3 max-w-[54ch] text-[0.9375rem] leading-relaxed tracking-[-0.012em] text-[var(--muted)]">
            {project.shortDescription}
          </p>
          {project.technologies.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {project.technologies.slice(0, 5).map((tech) => (
                <span key={tech} className="tag">
                  {tech}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="work-card-side">
          {project.metrics.length > 0 ? (
            <dl className="flex gap-x-8 gap-y-3 sm:flex-wrap lg:justify-end">
              {project.metrics.slice(0, 2).map((metric) => (
                <div key={metric.label}>
                  <dd className="t-serif text-[1.625rem] text-[var(--fg)]">
                    {metric.value}
                  </dd>
                  <dt className="t-meta mt-1 text-[0.6875rem]">{metric.label}</dt>
                </div>
              ))}
            </dl>
          ) : null}

          <Link
            href={`/projects/${project.slug}`}
            className="group mt-6 inline-flex items-center gap-3 text-[0.9375rem] font-medium tracking-[-0.01em] text-[var(--fg)]"
          >
            <span className="work-cta">Read the case study</span>
            <span aria-hidden className="arrow-ring h-9 w-9 text-[0.9375rem]">
              <Arrow />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
