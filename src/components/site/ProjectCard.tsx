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
//
// The height is exactly one viewport and must stay that way. A taller frame
// was tried, so that hovering could pan down the page, and it is wrong: a site
// whose hero is `min-height: 100vh` simply grows to fill whatever it is given,
// so the taller the frame the more of the preview is one stretched hero. The
// scroll-through below gets the same result without lying about the viewport.
const FRAME_WIDTH = 1440;
const FRAME_HEIGHT = 900;
// One pass down the page while the pointer rests on the window.
const SCROLL_MS = 9000;
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
 * none. Hovering the window wipes the poster up to reveal the preview: the
 * live site when there is a live URL, otherwise the case study page on this
 * site, which hides its chrome when framed.
 *
 * Hovering the WINDOW, not the card around it. The wipe and the frame have to
 * be triggered by the same thing: when the poster lifted on card hover but the
 * frame only loaded on window hover, moving the pointer over the text opened
 * the window onto an empty panel.
 *
 * When frames load:
 *  - a live site starts loading once the window is near the screen, because
 *    real sites often play their own splash first, and the hover should land
 *    on the site rather than on its loader. It unloads when it scrolls away.
 *  - the case study page is local and quick, so it loads on hover and is
 *    removed shortly after the pointer leaves.
 * Either way no hidden site keeps running for the rest of the visit.
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
  const showFrame = project.liveUrl ? near || armed : armed;
  const address = project.liveUrl ? hostOf(project.liveUrl) : caseStudy;

  return (
    <div
      ref={boxRef}
      className={`browser ${armed ? "is-open" : ""}`}
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
              active={armed}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Slow in, slow out, so neither end of the pass snaps. */
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * The site itself, rendered at one laptop viewport and scaled into the window.
 *
 * While the pointer rests on the window the preview scrolls down the page and
 * back up again when it leaves, which is the only honest way to show more than
 * the fold without stretching the viewport out from under the site.
 *
 * It only works for the case study, which is this site's own page. A
 * cross-origin document cannot be scrolled from here at all, by design, so a
 * live site shows its fold and nothing else. That is the whole trade: a
 * correct first screen for every site beats a scrolling one for some and a
 * stretched hero for the rest.
 */
function LiveFrame({
  url,
  title,
  external,
  active,
}: {
  url: string;
  title: string;
  external: boolean;
  active: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
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

  useEffect(() => {
    if (external || !loaded) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const win = frameRef.current?.contentWindow;
    if (!win) return;

    let raf = 0;
    let doc: Document;
    try {
      doc = win.document;
    } catch {
      // Same-origin was expected but the browser disagrees. Leave it still
      // rather than throwing on every frame.
      return;
    }

    const distance = doc.documentElement.scrollHeight - FRAME_HEIGHT;
    if (distance <= 0) return;

    const from = win.scrollY;
    const to = active ? distance : 0;
    if (Math.abs(to - from) < 1) return;

    // Proportional to the distance still to cover, so leaving early rewinds
    // quickly instead of taking the full pass to travel a short way back.
    const span = Math.max(
      400,
      SCROLL_MS * (Math.abs(to - from) / Math.max(distance, 1)),
    );
    const started = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / span);
      win.scrollTo(0, from + (to - from) * easeInOut(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [active, loaded, external]);

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
          ref={frameRef}
          src={url}
          title={`${title}, site preview`}
          tabIndex={-1}
          loading="eager"
          referrerPolicy="no-referrer"
          // Other sites run sandboxed. The case study is this site's own page;
          // sandboxing a same-origin frame with scripts allowed buys nothing,
          // the browser warns about it, and it is what lets the scroll above
          // reach the document at all.
          sandbox={external ? "allow-scripts allow-same-origin" : undefined}
          onLoad={() => setLoaded(true)}
          className={`peek-frame ${loaded ? "is-loaded" : ""}`}
          style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT }}
        />
      </div>
    </div>
  );
}
