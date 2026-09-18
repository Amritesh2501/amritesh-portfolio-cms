"use client";

import { Fragment, useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * A section heading that assembles itself as the section arrives.
 *
 * Split into words rather than letters. Letter-by-letter is the cheaper effect
 * to reach for and the worse one to read: at this size a two-word heading
 * becomes fourteen separately moving objects and the eye tracks none of them.
 * Words keep the heading legible the whole way in.
 *
 * Scrubbed rather than played, so it runs backwards when the page does, which
 * is the same contract the rest of the reveals on this site follow.
 *
 * Every word is in the DOM at full contrast from the first frame; only
 * transform and opacity move, so nothing here changes what is read out or what
 * is found by in-page search.
 */
export function SectionHeading({
  id,
  children,
  className = "",
}: {
  id: string;
  children: string;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();
  const words = children.split(/\s+/).filter(Boolean);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".heading-word span",
        { yPercent: 118, rotate: 3 },
        {
          yPercent: 0,
          rotate: 0,
          ease: "power3.out",
          duration: 1,
          stagger: 0.08,
          scrollTrigger: {
            trigger: el,
            // Starts as the heading clears the fold and finishes well before
            // it reaches the middle, so it is settled by the time it is being
            // read rather than still arriving.
            start: "top 92%",
            end: "top 58%",
            scrub: 0.8,
          },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [reduce]);

  return (
    <h2 id={id} ref={ref} className={className}>
      {words.map((word, i) => (
        <Fragment key={i}>
          {/* The space sits OUTSIDE the clipping box. Inside it, overflow
              hidden on an inline-flex box eats it and the words run together. */}
          <span className="heading-word">
            <span>{word}</span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </h2>
  );
}
