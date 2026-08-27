"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

/**
 * Scroll-linked depth.
 *
 * Driven entirely by motion values, never React state: a useState scroll
 * handler re-renders the tree on every frame and collapses on mobile. There is
 * also no scroll listener anywhere here, useScroll batches against the
 * browser's own scroll timeline.
 *
 * Under prefers-reduced-motion every layer renders flat and static.
 */
export function Parallax({
  children,
  speed = 0.2,
  className,
  fade = false,
  scale = false,
}: {
  children: React.ReactNode;
  /** Positive drifts slower than the page, negative drifts faster. */
  speed?: number;
  className?: string;
  fade?: boolean;
  scale?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const smooth = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  const y = useTransform(smooth, [0, 1], [`${speed * 100}%`, `${speed * -100}%`]);
  const opacity = useTransform(smooth, [0, 0.25, 0.75, 1], [0.4, 1, 1, 0.4]);
  const scaleValue = useTransform(smooth, [0, 0.5, 1], [0.96, 1, 0.96]);

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        y,
        ...(fade ? { opacity } : {}),
        ...(scale ? { scale: scaleValue } : {}),
        willChange: "transform",
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Hero-specific: content drifts up and dissolves as the page scrolls past it,
 * the way Apple's product pages hand the viewport off to the next section.
 * Bound to the window rather than an element, so it starts at scroll 0.
 */
export function HeroParallax({
  children,
  depth = 1,
  className,
}: {
  children: React.ReactNode;
  /** 0 is stationary, 1 is the reference layer, >1 moves further. */
  depth?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();

  const y = useTransform(scrollY, [0, 800], [0, 120 * depth]);
  const opacity = useTransform(scrollY, [0, 420], [1, 0]);
  const blur = useTransform(scrollY, [0, 500], ["blur(0px)", "blur(6px)"]);

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      style={{ y, opacity, filter: blur, willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}

/** A thin accent bar pinned to the top of the viewport showing read progress. */
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 40,
    restDelta: 0.001,
  });

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden
      className="fixed left-0 right-0 top-0 z-[var(--z-nav)] h-[2px] origin-left bg-[var(--accent)]"
      style={{ scaleX: scaleX as MotionValue<number> }}
    />
  );
}
