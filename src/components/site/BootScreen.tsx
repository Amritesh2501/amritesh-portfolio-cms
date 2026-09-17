"use client";

import { useEffect, useState } from "react";

/**
 * The intro: the name rises letter by letter over a thin progress line, then
 * two curtains lift away to reveal the page.
 *
 * Why it is shaped like this:
 *  - It is in the server HTML, so it covers the very first paint. Mounting it
 *    from an effect let the hero flash before the loader appeared.
 *  - An inline script runs before the first paint and hides it when this
 *    session has already seen it, so repeat navigations never flash it either.
 *  - The whole sequence is CSS-timed, which is also the hard ceiling: nothing
 *    here can trap a visitor, with or without JavaScript.
 *  - Transform and opacity only. The previous fog intro scaled two
 *    viewport-and-a-half noise textures, blurred a glowing ring with a
 *    drop-shadow and mirrored it with box-reflect, all while the page hydrated
 *    underneath. That was the lag.
 *  - Still behind the `site.showIntro` CMS toggle.
 */
const SESSION_KEY = "intro-shown-v5";
// Keep in step with the timings in globals.css (Intro).
const TOTAL_MS = 2300;

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
    const finish = window.setTimeout(() => setDone(true), TOTAL_MS);

    return () => {
      window.clearTimeout(finish);
      root.style.overflow = "";
    };
  }, []);

  if (done) return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: HIDE_IF_SEEN }} />
      <div className="intro keep-motion">
        <div aria-hidden className="intro-curtain intro-curtain-back" />
        <div role="status" aria-live="polite" className="intro-curtain intro-curtain-front">
          <div className="intro-stage">
            <span aria-hidden className="intro-mark t-serif">
              {logoText}
            </span>
            <p aria-hidden className="intro-name">
              {Array.from(name).map((char, i) => (
                <span key={i} style={{ animationDelay: `${0.15 + i * 0.03}s` }}>
                  {char}
                </span>
              ))}
            </p>
            <span aria-hidden className="intro-bar" />
            <span className="sr-only">Loading {name}</span>
          </div>
        </div>
      </div>
    </>
  );
}
