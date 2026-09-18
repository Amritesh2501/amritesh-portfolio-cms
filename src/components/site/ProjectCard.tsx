"use client";

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

// Sites render at a real laptop viewport, then scale down into the window,
// which has the same 16:10 shape.
const FRAME_WIDTH = 1440;
const FRAME_HEIGHT = 900;
// How much of the page below the fold the frame renders, so hovering can pan
// down through it. A cross-origin document cannot be scrolled from here at
// all, by design, so the only way to see past the fold is to render more of it
// and move the whole frame.
//
// ponytail: the cost of that is a hero sized in vh units, which stretches to
// whatever height it is given. 3x is the most that still leaves such a hero
// recognisable while reaching a useful way down an ordinary page. If a live
// site previews badly, this is the number to change.
const FRAME_PAGE = FRAME_HEIGHT * 3;
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
 * A project shown as a browser window.
 *
 * At rest the window shows the thumbnail, or a lettered poster when there is
 * none. Hovering wipes the poster up to reveal the preview: the live site when
 * there is a live URL, otherwise the case study page on this site, which hides
 * its chrome when framed.
 *
 * When frames load:
 *  - a live site starts loading once the window is near the screen, because
 *    real sites often play their own splash first, and the hover should land
 *    on the site rather than on its loader. It unloads when it scrolls away.
 *  - the case study page is local and quick, so it loads on hover and is
 *    removed shortly after the pointer leaves.
 * Either way no hidden site keeps running for the rest of the visit.
 *
 * This is only the window. What sits beside it belongs to the caller, which is
 * WorkStack: it used to be half of an editorial row, and the row is what the
 * stack replaced.
 */
export function ProjectWindow({
  project,
  index,
}: {
  project: CardProject;
  /** Picks which of the three poster grounds this one lands on. */
  index: number;
}) {
  const [armed, setArmed] = useState(false);
  const [near, setNear] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const unload = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(unload.current), []);

  useEffect(() => {
    const box = boxRef.current;
    if (!project.liveUrl || !box) return;
    const io = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), {
      rootMargin: "400px 0px",
    });
    io.observe(box);
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

  return (
    <div
      ref={boxRef}
      className="browser"
      onPointerEnter={arm}
      onPointerLeave={disarm}
      onFocus={arm}
      onBlur={disarm}
    >
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
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ok)]" />
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
            <p className="t-serif relative max-w-[14ch] text-[clamp(1.75rem,3.2vw,2.75rem)] text-[var(--fg)]">
              {project.title}
            </p>
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
  );
}

/**
 * The site itself, rendered at laptop width and scaled into the window.
 *
 * The pan down the page is a CSS animation that is paused until the window is
 * hovered or focused, which means it costs nothing while the card sits there,
 * resumes from where it stopped rather than restarting, and needs no rAF loop
 * or scroll handler of its own.
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
          <span className="t-meta text-[0.6875rem]">Loading preview</span>
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
          style={{
            width: FRAME_WIDTH,
            height: FRAME_PAGE,
            // What the pan has to travel: everything below the first screen.
            "--peek-pan": `${FRAME_HEIGHT - FRAME_PAGE}px`,
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
}
