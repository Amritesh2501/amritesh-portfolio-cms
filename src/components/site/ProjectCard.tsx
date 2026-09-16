"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type CardProject = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  thumbnail: string | null;
  /** Best image to reveal on hover: thumbnail, hero image, or first gallery shot. */
  preview: string | null;
  liveUrl: string | null;
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

const TECH_LIMIT = 4;
// The live site is laid out at a desktop width, then scaled down to the card.
const FRAME_WIDTH = 1440;
const FRAME_HEIGHT = 2200;

/**
 * Compact card for a three-column grid. Every project gets the same footprint;
 * featured ones are marked with a chip rather than a full-width panel.
 *
 * Hovering reveals the work itself: a curtain wipes up over the number plate
 * to show the project image, or, when there is no image but the project is
 * live, a scaled-down live view of the site that slowly scrolls. The live
 * frame is only created on the first hover, so a grid of cards never loads a
 * row of websites in the background.
 */
export function ProjectCard({
  project,
  index,
}: {
  project: CardProject;
  index: number;
}) {
  const label = LIFECYCLE_LABEL[project.lifecycle] ?? project.lifecycle;
  const live = !project.preview && project.liveUrl ? project.liveUrl : null;
  const [armed, setArmed] = useState(false);

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="card card-hover group flex h-full flex-col overflow-hidden"
      onPointerEnter={() => setArmed(true)}
      onFocus={() => setArmed(true)}
    >
      <div className="relative aspect-[16/7] overflow-hidden">
        {/* The plate: shown until something is revealed over it. */}
        <div className="absolute inset-0 flex items-end justify-between gap-4 bg-[radial-gradient(80%_120%_at_100%_0%,color-mix(in_srgb,var(--accent)_16%,transparent),transparent_70%)] p-5">
          <span
            className="t-serif text-[3.5rem] leading-none"
            style={{ color: "color-mix(in srgb, var(--accent) 30%, transparent)" }}
            aria-hidden
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="t-meta text-right text-[0.5625rem]">
            {project.categoryName ?? "Project"}
          </span>
        </div>

        {project.preview ? (
          <div className="peek" aria-hidden>
            <div className="peek-zoom">
              {/* Plain img: previews can be any CMS URL, and next/image refuses
                  hosts that are not allow-listed in next.config. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.preview}
                alt=""
                loading="lazy"
                decoding="async"
                className="peek-image h-full w-full object-cover object-top"
              />
            </div>
            <span className="peek-label chip">Preview</span>
          </div>
        ) : live ? (
          <div className="peek" aria-hidden>
            {armed ? <LiveFrame url={live} title={project.title} /> : null}
            <span className="peek-label chip">
              <span className="h-1.5 w-1.5 rounded-full bg-[#30d158] shadow-[0_0_8px_#30d158]" />
              Live site
            </span>
          </div>
        ) : null}

        <div className="absolute left-3 top-3 z-[2] flex gap-1.5">
          <span className="chip">{label}</span>
          {project.featured ? <span className="chip">Featured</span> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="t-display text-[1.1875rem] text-[var(--fg)]">{project.title}</h3>
          {project.year ? (
            <span className="t-meta shrink-0 tabular-nums text-[0.5625rem]">
              {project.year}
            </span>
          ) : null}
        </div>

        <p className="mt-2.5 line-clamp-3 text-[0.875rem] leading-relaxed tracking-[-0.01em] text-[var(--muted)]">
          {project.shortDescription}
        </p>

        {project.metrics.length > 0 ? (
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {project.metrics.slice(0, 2).map((metric) => (
              <div key={metric.label}>
                <dd className="t-display text-[1.125rem] text-[var(--accent)]">
                  {metric.value}
                </dd>
                <dt className="t-meta mt-0.5 text-[0.5rem]">{metric.label}</dt>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-5">
          {project.technologies.slice(0, TECH_LIMIT).map((tech) => (
            <span key={tech} className="tag">
              {tech}
            </span>
          ))}
          {project.technologies.length > TECH_LIMIT ? (
            <span className="t-meta text-[0.5625rem]">
              +{project.technologies.length - TECH_LIMIT}
            </span>
          ) : null}
        </div>

        <span className="mt-4 flex items-center gap-2 border-t border-[var(--line)] pt-3.5 text-[0.8125rem] font-medium tracking-[-0.01em] text-[var(--fg)]">
          Read the case study
          <span
            aria-hidden
            className="text-[var(--accent)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1.5"
          >
            &rarr;
          </span>
        </span>
      </div>
    </Link>
  );
}

/**
 * The live site, laid out at desktop width and scaled to fit the card. It
 * scrolls slowly down the page while hovered. Scale and scroll distance are
 * measured once per size change and handed to CSS, which does the motion.
 */
function LiveFrame({ url, title }: { url: string; title: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const fit = () => {
      const scale = box.clientWidth / FRAME_WIDTH;
      box.style.setProperty("--frame-scale", String(scale));
      box.style.setProperty("--frame-pan", `${-(FRAME_HEIGHT * scale - box.clientHeight)}px`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={boxRef} className="absolute inset-0">
      {!loaded ? <span className="peek-loading t-meta">Opening live site</span> : null}
      <div className="peek-scroll">
        <iframe
          src={url}
          title={`${title}, live site preview`}
          tabIndex={-1}
          loading="lazy"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin"
          onLoad={() => setLoaded(true)}
          className={`peek-frame ${loaded ? "is-loaded" : ""}`}
          style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT }}
        />
      </div>
    </div>
  );
}
