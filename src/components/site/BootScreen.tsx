"use client";

import { useEffect, useState } from "react";

/**
 * Initial loading screen: two koi circling on still water while the name
 * surfaces through the fog, then the mist dissolves into the hero.
 *
 * Why it is shaped like this:
 *  - It is in the server HTML. The old version mounted from an effect, so the
 *    hero painted first and the loader popped in over it a moment later.
 *  - An inline script runs before the first paint and hides it when this
 *    session has already seen it, so repeat navigations never flash it either.
 *  - The whole sequence, including the exit, is CSS-timed. That is also the
 *    hard ceiling: nothing here can trap a visitor, with or without JavaScript.
 *  - The component only has to record the visit and unmount when done.
 *  - Still behind the `site.showIntro` CMS toggle.
 */
const SESSION_KEY = "intro-shown-v3";
const TOTAL_MS = 2900;

const HIDE_IF_SEEN = `try{if(sessionStorage.getItem("${SESSION_KEY}")==="1")document.documentElement.dataset.intro="seen"}catch(e){document.documentElement.dataset.intro="seen"}`;

function Koi() {
  return (
    <svg viewBox="0 0 24 10" width="30" height="12.5" aria-hidden>
      <ellipse cx="15" cy="5" rx="8" ry="3.2" />
      <path d="M8 5 L1 0.8 L3 5 L1 9.2 Z" />
    </svg>
  );
}

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
    const timer = window.setTimeout(() => {
      document.body.style.overflow = "";
      setDone(true);
    }, TOTAL_MS);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, []);

  if (done) return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: HIDE_IF_SEEN }} />
      <div
        // Not aria-hidden: a screen reader user should be told the page is
        // loading rather than hearing nothing at all.
        role="status"
        aria-live="polite"
        className="boot keep-motion"
      >
        <div aria-hidden className="boot-clouds" />

        <div className="boot-stage">
          <div aria-hidden className="boot-orbit">
            <span className="boot-koi">
              <Koi />
            </span>
            <span className="boot-koi boot-koi-b">
              <Koi />
            </span>
            <span className="boot-mark">{logoText}</span>
          </div>

          <span className="sr-only">Loading {name}</span>
          <p aria-hidden className="boot-name">
            {name}
          </p>
          <div aria-hidden className="boot-line" />
        </div>
      </div>
    </>
  );
}
