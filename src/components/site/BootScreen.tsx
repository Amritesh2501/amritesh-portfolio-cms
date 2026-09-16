"use client";

import { useEffect, useState } from "react";

/**
 * The intro, in two acts: a clean loader (a moon ring drawing itself over
 * still water while the name spells out), then a bank of fog that covers the
 * page and slowly parts to reveal the pond.
 *
 * Why it is shaped like this:
 *  - It is in the server HTML, so it covers the very first paint. Mounting it
 *    from an effect let the hero flash before the loader appeared.
 *  - An inline script runs before the first paint and hides it when this
 *    session has already seen it, so repeat navigations never flash it either.
 *  - The whole sequence is CSS-timed, which is also the hard ceiling: nothing
 *    here can trap a visitor, with or without JavaScript.
 *  - This component only locks scroll while the loader is up, records the
 *    visit, and unmounts once the fog has gone.
 *  - Still behind the `site.showIntro` CMS toggle.
 */
const SESSION_KEY = "intro-shown-v4";
// Keep in step with the timings in globals.css (Intro).
const LOADER_MS = 2600;
const TOTAL_MS = 5600;

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

    document.body.style.overflow = "hidden";
    const unlock = window.setTimeout(() => {
      document.body.style.overflow = "";
    }, LOADER_MS);
    const finish = window.setTimeout(() => setDone(true), TOTAL_MS);

    return () => {
      window.clearTimeout(unlock);
      window.clearTimeout(finish);
      document.body.style.overflow = "";
    };
  }, []);

  if (done) return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: HIDE_IF_SEEN }} />
      <div className="intro keep-motion">
        <div aria-hidden className="intro-fog">
          <div className="intro-fog-layer intro-fog-a" />
          <div className="intro-fog-layer intro-fog-b" />
        </div>

        <div
          // Not aria-hidden: a screen reader user should be told the page is
          // loading rather than hearing nothing at all.
          role="status"
          aria-live="polite"
          className="boot"
        >
          <div className="boot-stage">
            <div aria-hidden className="boot-moon">
              <svg viewBox="0 0 120 120">
                <circle className="boot-moon-track" cx="60" cy="60" r="56" />
                <circle className="boot-moon-arc" cx="60" cy="60" r="56" pathLength={100} />
              </svg>
              <span className="boot-mark">{logoText}</span>
            </div>

            <div aria-hidden className="boot-horizon" />

            <p aria-hidden className="boot-name">
              {Array.from(name).map((char, i) => (
                <span key={i} style={{ animationDelay: `${0.6 + i * 0.04}s` }}>
                  {char}
                </span>
              ))}
            </p>
            <span className="sr-only">Loading {name}</span>
          </div>
        </div>
      </div>
    </>
  );
}
