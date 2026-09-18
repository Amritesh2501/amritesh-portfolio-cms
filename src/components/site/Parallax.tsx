"use client";

import { useRef } from "react";
import {
  motion,
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
 * Scroll-linked, so it runs both ways: scrolling back up plays it in reverse.
 *
 * Under prefers-reduced-motion the .parallax class pins it flat in CSS. It used
 * to render a plain div instead, but useReducedMotion() is false on the server,
 * so hydration kept the server's offset on the element and it stayed shifted.
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

  return (
    <motion.div
      ref={ref}
      className={`parallax ${className ?? ""}`}
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
 * Slides its content sideways as the page scrolls past, in step with the
 * scroll in either direction. Used to give the marquee rows momentum.
 */
export function ScrollDrift({
  children,
  distance = 160,
  className,
}: {
  children: React.ReactNode;
  /** Pixels travelled across the element's pass through the viewport. */
  distance?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  const x = useTransform(smooth, [0, 1], [distance / 2, -distance / 2]);

  return (
    <motion.div ref={ref} className={`parallax ${className ?? ""}`} style={{ x }}>
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
  const { scrollY } = useScroll();

  const y = useTransform(scrollY, [0, 800], [0, 120 * depth]);
  const opacity = useTransform(scrollY, [0, 420], [1, 0]);

  return (
    <motion.div
      className={`parallax ${className ?? ""}`}
      // No scroll-linked blur: a filter on the hero copy re-rasterised it on
      // every scroll frame, on top of the animated scene below.
      style={{ y, opacity, willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A thin accent bar pinned to the top of the viewport showing read progress.
 *
 * Always rendered, hidden by CSS under reduced motion. It used to return null
 * when useReducedMotion() was true, but that hook is false on the server and
 * true on the client, so for anyone with the OS setting on hydration failed,
 * React regenerated the whole tree, and the intro replayed over the painted page.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 40,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      className="fixed left-0 right-0 top-0 z-[var(--z-nav)] h-[2px] origin-left bg-[var(--accent)] motion-reduce:hidden"
      style={{ scaleX: scaleX as MotionValue<number> }}
    />
  );
}
