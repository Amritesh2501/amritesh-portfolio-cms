"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";

type Mode = "light" | "dark";

/**
 * Switches the page between the two palettes.
 *
 * The mode lives on <html data-mode>, which every token in globals.css keys
 * off, so one attribute repaints the whole site. The stored choice is read
 * back by the pre-paint script in the root layout; this component only writes
 * it, and starts from whatever that script already decided rather than from a
 * guess, so the button never disagrees with the page it is sitting on.
 *
 * Until it has mounted it renders the frame at the same size but without an
 * icon: the server cannot know the visitor's stored choice, and rendering a
 * sun that flips to a moon on hydration is worse than one that fades in.
 */
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    setMode(document.documentElement.dataset.mode === "light" ? "light" : "dark");
  }, []);

  useEffect(() => {
    // Only while the visitor has expressed no preference of their own: after
    // that their choice outranks the operating system.
    if (localStorage.getItem("theme")) return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const sync = () => {
      const next: Mode = mq.matches ? "light" : "dark";
      document.documentElement.dataset.mode = next;
      setMode(next);
    };
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const toggle = () => {
    const next: Mode = mode === "light" ? "dark" : "light";
    document.documentElement.dataset.mode = next;
    setMode(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode: the choice simply lasts for this page only */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="icon-btn"
      aria-label={
        mode === "light" ? "Switch to dark theme" : "Switch to light theme"
      }
      aria-pressed={mode === "light"}
    >
      {mode ? (
        mode === "light" ? (
          <SunIcon weight="regular" aria-hidden />
        ) : (
          <MoonIcon weight="regular" aria-hidden />
        )
      ) : null}
    </button>
  );
}
