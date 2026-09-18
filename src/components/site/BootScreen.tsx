"use client";

import { useEffect, useState } from "react";

/**
 * The intro: the mark settles over a drawn rule, the name rises letter by
 * letter, then the ground splits apart and the page is underneath.
 *
 * Why it is shaped like this:
 *  - It is in the server HTML, so it covers the very first paint. Mounting it
 *    from an effect let the hero flash before the loader appeared.
 *  - An inline script runs before the first paint and hides it when this
 *    session has already seen it, so repeat navigations never flash it either.
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
const SESSION_KEY = "intro-shown-v6";
// Keep in step with the timings in globals.css (Intro).
const TOTAL_MS = 2000;

const HIDE_IF_SEEN = `try{if(sessionStorage.getItem("${SESSION_KEY}")==="1")document.documentElement.dataset.intro="seen"}catch(e){document.documentElement.dataset.intro="seen"}`;

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

    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* private mode: it simply shows again next session */
    }

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
      <script dangerouslySetInnerHTML={{ __html: HIDE_IF_SEEN }} />
      <div className="intro keep-motion" role="status" aria-live="polite">
        <div aria-hidden className="intro-half intro-half-top" />
        <div aria-hidden className="intro-half intro-half-bottom" />
        <div className="intro-stage">
          <span aria-hidden className="intro-mark t-serif">
            {logoText}
          </span>
          <span aria-hidden className="intro-rule" />
          <p aria-hidden className="intro-name">
            {Array.from(name).map((char, i) => (
              <span key={i} style={{ animationDelay: `${0.3 + i * 0.026}s` }}>
                {char}
              </span>
            ))}
          </p>
          <span className="sr-only">Loading {name}</span>
        </div>
      </div>
    </>
  );
}
