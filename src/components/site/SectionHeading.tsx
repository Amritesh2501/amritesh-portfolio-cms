"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * A section heading that assembles itself as the section arrives.
 *
 * Split into words rather than letters. Letter-by-letter is the cheaper effect
 * to reach for and the worse one to read: at this size a two-word heading
 * becomes fourteen separately moving objects and the eye tracks none of them.
 * Words keep the heading legible the whole way in.
 *
 * Played once when it scrolls in, on motion (already on the page), rather
 * than scrubbed by a scroll-linked GSAP timeline: that cost a second animation
 * library and a scroll listener for one heading effect.
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
  const reduce = useReducedMotion();
  const words = children.split(/s+/).filter(Boolean);

  return (
    <h2 id={id} className={className}>
      {words.map((word, i) => (
        <Fragment key={i}>
          {/* The space sits OUTSIDE the clipping box. Inside it, overflow
              hidden on an inline-flex box eats it and the words run together. */}
          <span className="heading-word">
            <motion.span
              initial={reduce ? false : { y: "118%", rotate: 3 }}
              whileInView={{ y: 0, rotate: 0 }}
              viewport={{ once: true, margin: "0px 0px -8% 0px" }}
              transition={{ duration: 0.9, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              {word}
            </motion.span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </h2>
  );
}
