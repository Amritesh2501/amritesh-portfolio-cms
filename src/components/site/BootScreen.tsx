"use client";

import { useEffect, useState } from "react";

/**
 * The intro: the mark settles, a rule draws under it, the name rises letter by
 * letter, a meter fills the width of that rule, and then the ground splits
 * apart and the page is underneath. Roughly 3.8s end to end.
 *
 * Why it is shaped like this:
 *  - It is in the server HTML, so it covers the very first paint. Mounting it
 *    from an effect let the hero flash before the loader appeared.
 *  - It plays on every load of the document, reload included, and the page
 *    starts at the top underneath it. Moving between routes does not replay
 *    it: this lives in the layout, which survives client-side navigation, so
 *    the component simply stays mounted and finished.
 *  - A framed page is the one exception. The project previews load case study
 *    pages into an iframe, and the layout marks those as seen before paint so
 *    a preview never sits there playing a loader.
 *  - The whole sequence is CSS-timed, which is also the hard ceiling: nothing
 *    here can trap a visitor, with or without JavaScript.
 *  - Transform and opacity only, on two promoted layers. This runs while the
 *    page below is hydrating, so a frame spent on layout or paint is a frame
 *    the main thread has not got. The fog intro before it scaled two
 *    viewport-and-a-half noise textures and blurred a glowing ring; the
 *    curtain version after that lifted two full-viewport gradients in
 *    sequence. Both were overdraw at exactly the wrong moment.
 *  - Still behind the `site.showIntro` CMS toggle.
 */
// Keep in step with the timings in globals.css (Intro).
const TOTAL_MS = 3900;

// Before the first paint: pin the page to the top, so a reload opens on the
// hero rather than wherever the visitor happened to be. Browsers restore the
// old offset on reload by default, and doing this here rather than in an
// effect means the restore never lands at all.
//
// Two things it deliberately does not touch:
//  - back_forward navigations, where restoring the old position is the
//    correct behaviour and taking it away is just a broken Back button;
//  - a URL carrying a hash, which is someone deep-linking to a section and
//    asking for exactly one position that is not the top.
const START_AT_TOP = `try{var n=performance.getEntriesByType("navigation")[0];if((!n||n.type!=="back_forward")&&!location.hash){history.scrollRestoration="manual";window.scrollTo(0,0)}}catch(e){}`;

export function BootScreen({
  logoText,
  name,
}: {
  logoText: string;
  name: string;
}) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (document.documentElement.dataset.intro === "seen") {
      setDone(true);
      return;
    }

    // Belt and braces with the pre-paint script: anything that restored a
    // scroll offset between that script and this effect is undone here, before
    // the ground splits on it. Same hash exemption.
    if (!window.location.hash) window.scrollTo(0, 0);

    // On <html>, not <body>: the smooth scroller watches the root's overflow
    // and pauses itself while it is hidden.
    const root = document.documentElement;
    root.style.overflow = "hidden";
    // Released here, not only in the cleanup: `done` renders null but does not
    // unmount this component, so the cleanup never ran and the lock stuck.
    const finish = window.setTimeout(() => {
      root.style.overflow = "";
      setDone(true);
    }, TOTAL_MS);

    return () => {
      window.clearTimeout(finish);
      root.style.overflow = "";
    };
  }, []);

  if (done) return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: START_AT_TOP }} />
      <div className="intro keep-motion" role="status" aria-live="polite">
        <div aria-hidden className="intro-half intro-half-top" />
        <div aria-hidden className="intro-half intro-half-bottom" />
        <div className="intro-stage">
          <span aria-hidden className="intro-mark t-serif">
            {logoText}
          </span>
          <p aria-hidden className="intro-name">
            {Array.from(name).map((char, i) => (
              <span key={i} style={{ animationDelay: `${0.55 + i * 0.03}s` }}>
                {char}
              </span>
            ))}
          </p>
          <span aria-hidden className="intro-meter" />
          <span className="sr-only">Loading {name}</span>
        </div>
      </div>
    </>
  );
}
