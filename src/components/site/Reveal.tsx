"use client";

import { motion, useReducedMotion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Scroll reveal.
 *
 * Motivated: it sequences a section so the eye lands on the label, then the
 * headline, then the body, instead of all three arriving at once. Collapses to
 * a plain render under prefers-reduced-motion.
 */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  blur = true,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  blur?: boolean;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];

  return (
    <Tag
      className={className}
      initial={
        reduce ? false : { opacity: 0, y, filter: blur ? "blur(6px)" : "blur(0px)" }
      }
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -80px 0px" }}
      transition={{ duration: 0.75, delay, ease: EASE }}
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
  stagger = 0.07,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  stagger?: number;
  className?: string;
  as?: "div" | "ul" | "ol" | "dl";
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];

  return (
    <Tag
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -60px 0px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
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
  y = 24,
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
          ? undefined
          : {
              hidden: { opacity: 0, y, filter: "blur(5px)" },
              visible: {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                transition: { duration: 0.7, ease: EASE },
              },
            }
      }
    >
      {children}
    </Tag>
  );
}
