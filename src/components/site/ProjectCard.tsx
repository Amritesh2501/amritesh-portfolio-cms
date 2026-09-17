"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Parallax } from "./Parallax";

export type CardProject = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  thumbnail: string | null;
  /** Image shown at rest: thumbnail, hero image, or first gallery shot. */
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

const TECH_LIMIT = 5;
// Sites render at a real laptop viewport, then scale down into the window,
// which has the same 16:10 shape. A taller frame would let the page scroll,
// but sites sized in vh units stretch their hero to fill it and show nothing.
const FRAME_WIDTH = 1440;
const FRAME_HEIGHT = 900;
// How long a preview stays loaded after the pointer leaves: long enough for
// the thumbnail to close back over it, short enough that no hidden site keeps
// running.
const UNLOAD_MS = 900;

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * A project as an editorial row: the window on one side, the story on the
 * other, alternating down the page.
 *
 * The window at rest shows the project's thumbnail (or, without one, a
 * lettered poster). Hovering the row wipes the thumbnail up to reveal the
 * preview: the live site when there is a live URL, otherwise the project's own
 * case study page on this site, which hides its chrome when framed.
 *
 * When frames load:
 *  - a live site starts loading once its row is near the screen, because real
 *    sites often play their own splash screen first, and the hover should land
 *    on the site rather than on its loader. It unloads when the row scrolls
 *    well away.
 *  - the case study page is local and quick, so it loads on hover and is
 *    removed shortly after the pointer leaves.
 * Either way no hidden site keeps running for the rest of the visit.
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
  const rowRef = useRef<HTMLAnchorElement>(null);
  const unload = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(unload.current), []);

  useEffect(() => {
    const row = rowRef.current;
    if (!project.liveUrl || !row) return;
    const io = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), {
      rootMargin: "400px 0px",
    });
    io.observe(row);
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
  const frameUrl = project.liveUrl ?? caseStudy;
  const showFrame = project.liveUrl ? near : armed;
  const address = project.liveUrl ? hostOf(project.liveUrl) : caseStudy;
  const flip = index % 2 === 1;

  return (
    <Link
      ref={rowRef}
      href={caseStudy}
      className="work-row group grid items-center gap-8 lg:grid-cols-12 lg:gap-16"
      onPointerEnter={arm}
      onPointerLeave={disarm}
      onFocus={arm}
      onBlur={disarm}
    >
      <div className={`lg:col-span-7 ${flip ? "lg:order-2" : ""}`}>
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
              ) : (
                "Case study"
              )}
            </span>
          </div>

          <div className="browser-view">
            <div className={`poster poster-${index % 3}`}>
              {project.preview ? (
                <Parallax speed={0.06} className="absolute inset-x-0 inset-y-[-8%]">
                  {/* Plain img: thumbnails can be any CMS URL, and next/image
                      refuses hosts that are not allow-listed in next.config. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={project.preview}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-top"
                  />
                </Parallax>
              ) : (
                <>
                  <span aria-hidden className="poster-index t-serif">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="t-serif relative max-w-[14ch] text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.02] text-[var(--fg)]">
                    {project.title}
                  </p>
                </>
              )}
              <span aria-hidden className="poster-hint">
                Hover to preview
              </span>
            </div>

            <div className="peek" aria-hidden>
              {showFrame ? (
                <LiveFrame
                  url={frameUrl}
                  title={project.title}
                  external={Boolean(project.liveUrl)}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className={`lg:col-span-5 ${flip ? "lg:order-1" : ""}`}>
        <div className="flex items-center gap-4">
          <span className="t-serif text-[3.5rem] leading-none text-[var(--accent)]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span aria-hidden className="work-rule h-px flex-1 bg-[var(--line-strong)]" />
          <span className="t-meta text-[0.5625rem] tabular-nums">
            {[project.categoryName, project.year].filter(Boolean).join(" · ")}
          </span>
        </div>

        <h3 className="t-display mt-6 text-[clamp(2rem,3.6vw,3rem)] text-[var(--fg)] transition-colors duration-500 group-hover:text-[var(--accent)]">
          {project.title}
        </h3>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="chip">{label}</span>
          {project.featured ? <span className="chip">Featured</span> : null}
        </div>

        <p className="mt-5 max-w-[52ch] text-[1rem] leading-relaxed tracking-[-0.012em] text-[var(--muted)]">
          {project.shortDescription}
        </p>

        {project.metrics.length > 0 ? (
          <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-3">
            {project.metrics.slice(0, 3).map((metric) => (
              <div key={metric.label}>
                <dd className="t-serif text-[2rem] leading-none text-[var(--fg)]">
                  {metric.value}
                </dd>
                <dt className="t-meta mt-1.5 text-[0.5625rem]">{metric.label}</dt>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="mt-7 flex flex-wrap items-center gap-1.5">
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

        <span className="mt-8 inline-flex items-center gap-3 text-[0.9375rem] font-medium tracking-[-0.01em] text-[var(--fg)]">
          <span className="work-cta">Read the case study</span>
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--line-strong)] text-[var(--accent)] transition-[transform,background-color,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1.5 group-hover:bg-[var(--accent)] group-hover:text-[#150a26]"
          >
            &rarr;
          </span>
        </span>
      </div>
    </Link>
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
