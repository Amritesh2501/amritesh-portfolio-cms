"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Scroll reveal. Motivated: it sequences a section's content so the eye lands
 * on the label, then the headline, then the body, instead of all three at once.
 * Collapses to a plain render under prefers-reduced-motion.
 */
export function Reveal({
  children,
  delay = 0,
  y = 20,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];

  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}
