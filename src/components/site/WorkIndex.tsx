"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Arrow } from "./Arrow";
import { LiveFrame, type CardProject } from "./ProjectCard";

/**
 * Selected work, as an index with one thing on the wall next to it.
 *
 * It replaces a stack of four full-viewport cards, each with its own browser
 * window in it. That version gave every project a whole screen and cost four
 * screens of scrolling to see four names, which is the opposite of what a
 * SELECTION is for: a shortlist you can take in at once, and then look into.
 *
 * So: the list is a list. Numbered rows, one hairline each, all four legible
 * without scrolling. Beside it, one slab holds whichever row you are on — and
 * that slab is the only place the design spends anything.
 *
 * The slab is genuinely three-dimensional, not a card with a shadow. It sits in
 * a perspective, it rotates toward the pointer, and the picture, the frame and
 * the plate are on separate Z planes, so moving the pointer parallaxes them
 * against each other the way real layers behind glass do. That is what makes
 * the section look like an object rather than a layout — and it costs two CSS
 * custom properties and no re-renders, because the pointer writes straight to
 * the element instead of through React state.
 *
 * Below the desktop breakpoint there is no slab. A phone has nowhere to put a
 * thing beside a list, and a tilt driven by a pointer that does not exist is
 * dead weight, so each row simply carries its own picture.
 */
export function WorkIndex({ projects }: { projects: CardProject[] }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  /** Set by the viewer, per project, and never on its own. One frame at most. */
  const [live, setLive] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  /* The tilt ---------------------------------------------------------------- */

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage || reduce) return;
    // Below the breakpoint the slab is not rendered at all, so there is nothing
    // to tilt and no reason to listen.
    if (!window.matchMedia("(min-width: 1024px)").matches) return;

    let raf = 0;
    let want = { x: 0, y: 0 };
    let have = { x: 0, y: 0 };

    const onMove = (e: PointerEvent) => {
      const box = root.getBoundingClientRect();
      want = {
        x: (e.clientX - box.left) / box.width - 0.5,
        y: (e.clientY - box.top) / box.height - 0.5,
      };
      if (!raf) raf = requestAnimationFrame(tick);
    };

    /**
     * Eased toward the pointer rather than snapped to it.
     *
     * Writing the raw pointer position every frame makes the slab feel welded
     * to the cursor, which reads as cheap. A tenth of the remaining distance
     * per frame gives it the small amount of weight that makes it read as a
     * heavy object being turned.
     */
    const tick = () => {
      have = { x: have.x + (want.x - have.x) * 0.1, y: have.y + (want.y - have.y) * 0.1 };
      stage.style.setProperty("--tilt-y", `${have.x * 13}deg`);
      stage.style.setProperty("--tilt-x", `${-have.y * 9}deg`);
      stage.style.setProperty("--slide", `${have.x * 14}px`);

      raf =
        Math.abs(want.x - have.x) > 0.0005 || Math.abs(want.y - have.y) > 0.0005
          ? requestAnimationFrame(tick)
          : 0;
    };

    const onLeave = () => {
      want = { x: 0, y: 0 };
      if (!raf) raf = requestAnimationFrame(tick);
    };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduce]);

  // Changing row drops any frame that was loaded, so no hidden site keeps
  // running behind the one on screen.
  const focus = useCallback((i: number) => {
    setActive((cur) => {
      if (cur !== i) setLive(null);
      return i;
    });
  }, []);

  const current = projects[active] ?? projects[0];
  if (!current) return null;

  return (
    <div className="wi" ref={rootRef}>
      <ol className="wi-list">
        {projects.map((project, i) => (
          <li key={project.id}>
            <Row
              project={project}
              n={i + 1}
              total={projects.length}
              active={i === active}
              onFocus={() => focus(i)}
            />
          </li>
        ))}
      </ol>

      <div className="wi-stage" ref={stageRef} aria-hidden>
        <div className="wi-slab">
          <div className="wi-slab-face">
            {live === current.slug ? (
              <LiveFrame
                url={current.liveUrl ?? `/projects/${current.slug}`}
                title={current.title}
                external={Boolean(current.liveUrl)}
                active
              />
            ) : current.preview ? (
              // Plain img: a thumbnail is whatever URL the CMS holds, and
              // next/image refuses hosts that are not allow-listed.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.preview} alt="" loading="lazy" decoding="async" />
            ) : (
              <p className="wi-slab-blank t-serif">{current.title}</p>
            )}
          </div>

          {/* On its own Z plane, so it floats off the picture as the slab
              turns. This is the whole reason the slab is 3D and not a card. */}
          <div className="wi-slab-plate">
            <span className="t-meta tabular-nums">
              {String(active + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}
            </span>
            <span className="wi-slab-name">{current.title}</span>
          </div>

          {/* The one control on the slab. Hidden from the reader because the
              row beside it already carries the same link in the tab order. */}
          <button
            type="button"
            className="wi-slab-peek"
            tabIndex={-1}
            onClick={() => setLive((cur) => (cur === current.slug ? null : current.slug))}
          >
            {live === current.slug
              ? "Close preview"
              : current.liveUrl
                ? "Preview the live site"
                : "Preview the case study"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   One row
   ------------------------------------------------------------------------- */

function Row({
  project,
  n,
  total,
  active,
  onFocus,
}: {
  project: CardProject;
  n: number;
  total: number;
  active: boolean;
  onFocus: () => void;
}) {
  const meta = [project.categoryName, project.year].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/projects/${project.slug}`}
      className={`wi-row ${active ? "is-on" : ""}`}
      onPointerEnter={onFocus}
      onFocus={onFocus}
      aria-label={`${project.title}. ${project.shortDescription}`}
    >
      <span className="wi-n t-meta tabular-nums" aria-hidden>
        {String(n).padStart(2, "0")}
        <span className="wi-n-total">/{String(total).padStart(2, "0")}</span>
      </span>

      <span className="wi-main">
        <span className="wi-title t-display">{project.title}</span>
        {meta ? <span className="wi-meta t-meta tabular-nums">{meta}</span> : null}
        <span className="wi-desc">{project.shortDescription}</span>

        {/* The picture, for the screens with no slab beside the list. */}
        {project.preview ? (
          <span className="wi-inline" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={project.preview} alt="" loading="lazy" decoding="async" />
          </span>
        ) : null}

        {project.metrics.length > 0 ? (
          <span className="wi-metrics">
            {project.metrics.slice(0, 3).map((metric) => (
              <span key={metric.label}>
                <b className="t-serif">{metric.value}</b>
                {metric.label}
              </span>
            ))}
          </span>
        ) : null}

        {project.technologies.length > 0 ? (
          <span className="wi-tags">
            {project.technologies.slice(0, 4).map((tech) => (
              <span key={tech} className="tag">
                {tech}
              </span>
            ))}
          </span>
        ) : null}
      </span>

      <span aria-hidden className="wi-go arrow-ring h-11 w-11 text-[1.125rem]">
        <Arrow />
      </span>
    </Link>
  );
}
