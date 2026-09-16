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

const TECH_LIMIT = 6;
// Sites render at a real laptop viewport, then scale down into the window,
// which has the same 16:10 shape. A taller frame would let the page scroll,
// but sites sized in vh units stretch their hero to fill it and show nothing.
const FRAME_WIDTH = 1440;
const FRAME_HEIGHT = 900;
// How long a preview stays loaded after the pointer leaves: long enough for
// the curtain to close, short enough that no hidden site keeps running.
const UNLOAD_MS = 900;

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * A project as a browser window. At rest the window shows a poster of the
 * project; hovering wipes the poster away to reveal the site itself, as it
 * would look on a laptop screen.
 *
 * What the window shows, in order of preference:
 *  1. the live site, when the project has a live URL;
 *  2. an uploaded screenshot, panned down while hovered;
 *  3. the project's own case study page on this site, so every card has a
 *     real page to show. The site layout hides its header, footer and intro
 *     when it detects it is framed.
 *
 * When frames load:
 *  - a live site starts loading once its card is near the screen, because
 *    real sites often play their own splash screen first, and the hover
 *    should land on the site rather than on its loader. It is unloaded again
 *    when the card scrolls well away.
 *  - the case study page is on this site and loads quickly, so it only loads
 *    on hover and is removed shortly after the pointer leaves.
 * Either way no hidden site keeps running for the rest of the visit, which is
 * what happened when frames stayed mounted after a hover.
 */
export function ProjectCard({
  project,
  index,
}: {
  project: CardProject;
  index: number;
}) {
  const label = LIFECYCLE_LABEL[project.lifecycle] ?? project.lifecycle;
  const [armed, setArmed] = useState(false);
  const [near, setNear] = useState(false);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const unload = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(unload.current), []);

  useEffect(() => {
    const card = cardRef.current;
    if (!project.liveUrl || !card) return;
    const io = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), {
      rootMargin: "400px 0px",
    });
    io.observe(card);
    return () => io.disconnect();
  }, [project.liveUrl]);

  const arm = () => {
    window.clearTimeout(unload.current);
    setArmed(true);
  };
  const disarm = () => {
    window.clearTimeout(unload.current);
    unload.current = window.setTimeout(() => setArmed(false), UNLOAD_MS);
  };

  const caseStudy = `/projects/${project.slug}`;
  const frameUrl = project.liveUrl ?? (project.preview ? null : caseStudy);
  const address = project.liveUrl ? hostOf(project.liveUrl) : caseStudy;

  return (
    <Link
      ref={cardRef}
      href={caseStudy}
      className="card card-hover group flex h-full flex-col overflow-hidden"
      onPointerEnter={arm}
      onPointerLeave={disarm}
      onFocus={arm}
      onBlur={disarm}
    >
      <div className="p-3 pb-0 sm:p-4 sm:pb-0">
        <div className="browser">
          <div className="browser-bar" aria-hidden>
            <span className="browser-dots">
              <span />
              <span />
              <span />
            </span>
            <span className="browser-url">{address}</span>
            <span className="browser-kind">
              {project.liveUrl ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#30d158] shadow-[0_0_8px_#30d158]" />
                  Live
                </>
              ) : project.preview ? (
                "Preview"
              ) : (
                "Case study"
              )}
            </span>
          </div>

          <div className="browser-view">
            <Poster project={project} index={index} />

            <div className="peek" aria-hidden>
              {project.liveUrl || !project.preview ? (
                (project.liveUrl ? near : armed) && frameUrl ? (
                  <LiveFrame
                    url={frameUrl}
                    title={project.title}
                    external={Boolean(project.liveUrl)}
                  />
                ) : null
              ) : (
                // Plain img: previews can be any CMS URL, and next/image refuses
                // hosts that are not allow-listed in next.config.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={project.preview ?? ""}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="peek-image h-full w-full object-cover object-top"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">{label}</span>
          {project.featured ? <span className="chip">Featured</span> : null}
          {project.categoryName ? <span className="tag">{project.categoryName}</span> : null}
          {project.year ? (
            <span className="t-meta ml-auto tabular-nums text-[0.5625rem]">{project.year}</span>
          ) : null}
        </div>

        <h3 className="t-display mt-5 text-[clamp(1.5rem,2.4vw,2rem)] text-[var(--fg)]">
          {project.title}
        </h3>

        <p className="mt-3 max-w-[60ch] text-[0.9375rem] leading-relaxed tracking-[-0.012em] text-[var(--muted)]">
          {project.shortDescription}
        </p>

        {project.metrics.length > 0 ? (
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3">
            {project.metrics.slice(0, 3).map((metric) => (
              <div key={metric.label}>
                <dd className="t-serif text-[2rem] leading-none text-[var(--accent)] [text-shadow:0_0_24px_var(--glow)]">
                  {metric.value}
                </dd>
                <dt className="t-meta mt-1.5 text-[0.5625rem]">{metric.label}</dt>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-7">
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

        <span className="mt-6 flex items-center gap-2 border-t border-[var(--line)] pt-5 text-[0.875rem] font-medium tracking-[-0.01em] text-[var(--fg)]">
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

/** The window at rest: the project set as a poster, with a hint to hover. */
function Poster({ project, index }: { project: CardProject; index: number }) {
  return (
    <div className={`poster poster-${index % 3}`}>
      <span aria-hidden className="poster-index t-serif">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="relative">
        <p className="t-meta text-[0.5625rem]">{project.categoryName ?? "Project"}</p>
        <p className="t-serif mt-2 max-w-[14ch] text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.02] text-[var(--fg)]">
          {project.title}
        </p>
      </div>
      <span aria-hidden className="poster-hint">
        Hover to preview
      </span>
    </div>
  );
}

/**
 * A site rendered at a laptop viewport and scaled into the window. The scale
 * is measured once per size change and handed to CSS.
 */
function LiveFrame({ url, title, external }: { url: string; title: string; external: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const fit = () => {
      const scale = box.clientWidth / FRAME_WIDTH;
      box.style.setProperty("--frame-scale", String(scale));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={boxRef} className="absolute inset-0">
      {!loaded ? (
        <span className="peek-loading">
          <span className="peek-skeleton" />
          <span className="t-meta text-[0.5625rem]">Loading preview</span>
        </span>
      ) : null}
      <div className="peek-scroll">
        <iframe
          src={url}
          title={`${title}, site preview`}
          tabIndex={-1}
          loading="eager"
          referrerPolicy="no-referrer"
          // Other sites run sandboxed. The case study is this site's own page;
          // sandboxing a same-origin frame with scripts allowed buys nothing
          // and the browser warns about it.
          sandbox={external ? "allow-scripts allow-same-origin" : undefined}
          onLoad={() => setLoaded(true)}
          className={`peek-frame ${loaded ? "is-loaded" : ""}`}
          style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT }}
        />
      </div>
    </div>
  );
}
