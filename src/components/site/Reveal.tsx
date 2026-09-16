"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";

// A long, soft settle: fast out of the gate, then a slow glide into place.
const EASE = [0.22, 1, 0.36, 1] as const;

// useReducedMotion() is false on the server and true on a reduced-motion
// client, so the server HTML carries the full-motion starting offset as inline
// styles, and hydration does not patch them. So the reduced variant still
// sets every transform back to rest, instantly: no travel, residue cleared.
const REST = { y: 0, scale: 1 } as const;
const INSTANT = { y: { duration: 0 }, scale: { duration: 0 } } as const;

// When the intro's fog starts to thin. Hero copy waits for it, so it rises out
// of the clearing fog instead of finishing unseen behind the loader.
const INTRO_HANDOFF = 3;

function introDelay() {
  if (typeof document === "undefined") return 0;
  const showing =
    document.documentElement.dataset.intro !== "seen" && document.querySelector(".boot");
  return showing ? INTRO_HANDOFF : 0;
}

/**
 * Scroll reveal.
 *
 * Motivated: it sequences a section so the eye lands on the label, then the
 * headline, then the body, instead of all three arriving at once.
 *
 * Transform and opacity only. The earlier version also animated a blur
 * filter, which re-rasterised every block as it arrived and was the main
 * source of stutter while scrolling into a new section.
 *
 * Under prefers-reduced-motion it keeps the opacity fade and drops the travel.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = "div",
  afterIntro = false,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "section";
  /** Wait for the intro screen to clear before revealing. For the hero. */
  afterIntro?: boolean;
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  const wait = delay + (afterIntro ? introDelay() : 0);

  return (
    <Tag
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y, scale: 0.985 }}
      whileInView={{ opacity: 1, ...REST }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -60px 0px" }}
      transition={
        reduce
          ? { duration: 0.5, delay: wait, ease: EASE, ...INSTANT }
          : { duration: 0.9, delay: wait, ease: EASE }
      }
    >
      {children}
    </Tag>
  );
}

/**
 * Staggers direct children on entry. Parent and children share one client
 * tree, which `staggerChildren` requires.
 */
export function RevealGroup({
  children,
  stagger = 0.08,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  stagger?: number;
  className?: string;
  as?: "div" | "ul" | "ol" | "dl";
}) {
  const Tag = motion[as];

  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1, margin: "0px 0px -60px 0px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: 0.05 } },
      }}
    >
      {children}
    </Tag>
  );
}

export function RevealItem({
  children,
  className,
  as = "div",
  y = 22,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li";
  y?: number;
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];

  return (
    <Tag
      className={className}
      variants={
        reduce
          ? {
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                ...REST,
                transition: { duration: 0.5, ease: EASE, ...INSTANT },
              },
            }
          : {
              hidden: { opacity: 0, y, scale: 0.98 },
              visible: {
                opacity: 1,
                ...REST,
                transition: { duration: 0.85, ease: EASE },
              },
            }
      }
    >
      {children}
    </Tag>
  );
}

/** A rule that draws itself across when it scrolls into view. */
export function DrawLine({
  className,
  origin = 0,
  delay = 0.15,
}: {
  className?: string;
  /** 0 draws from the left, 0.5 from the centre. */
  origin?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.span
      aria-hidden
      className={className}
      style={{ originX: origin }}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
      transition={reduce ? { duration: 0 } : { duration: 1.2, delay, ease: EASE }}
    />
  );
}

/** A vertical rail that fills with light in step with scrolling past it. */
export function TimelineRail() {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 55%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 110, damping: 28, restDelta: 0.001 });

  return (
    <span ref={ref} aria-hidden className="timeline-rail">
      <motion.span className="timeline-rail-fill" style={{ scaleY: reduce ? 1 : fill }} />
    </span>
  );
}
