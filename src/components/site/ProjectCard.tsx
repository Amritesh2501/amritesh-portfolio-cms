"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The shape a project takes on the public site, and the frame that previews it.
 *
 * The browser-window card that used to live here is gone with the stacked
 * layout it belonged to; what is left is the part that was worth keeping. See
 * WorkIndex for what shows a project now.
 */

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
// One pass down the page while the preview is open.
const SCROLL_MS = 9000;

/** Slow in, slow out, so neither end of the pass snaps. */
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * The site itself, rendered at one laptop viewport and scaled into the window.
 *
 * While the preview is open it scrolls down the page and back up again when it
 * closes, which is the only honest way to show more than the fold without
 * stretching the viewport out from under the site.
 *
 * It only works for the case study, which is this site's own page. A
 * cross-origin document cannot be scrolled from here at all, by design, so a
 * live site shows its fold and nothing else. That is the whole trade: a
 * correct first screen for every site beats a scrolling one for some and a
 * stretched hero for the rest.
 */
export function LiveFrame({
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
