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

// A long, soft settle: fast out of the gate, then a slow glide into place.
const EASE = [0.22, 1, 0.36, 1] as const;

// useReducedMotion() is false on the server and true on a reduced-motion
// client, so the server HTML carries the full-motion starting offset as inline
// styles, and hydration does not patch them. So the reduced variant still
// sets every transform back to rest, instantly: no travel, residue cleared.
const REST = { y: 0, scale: 1 } as const;
const INSTANT = { y: { duration: 0 }, scale: { duration: 0 } } as const;

// When the intro's curtain starts to lift. Hero copy waits for it, so it rises
// as the page is uncovered instead of finishing unseen behind the loader.
const INTRO_HANDOFF = 1.4;

function introDelay() {
  if (typeof document === "undefined") return 0;
  const showing =
    document.documentElement.dataset.intro !== "seen" && document.querySelector(".intro");
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
 * Not once: a block hides again after it leaves the viewport, so it rises back
 * in whether the page is scrolled down or up.
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
      viewport={{ once: false, amount: 0.15, margin: "0px 0px -60px 0px" }}
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
      viewport={{ once: false, amount: 0.1, margin: "0px 0px -60px 0px" }}
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
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 55%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 110, damping: 28, restDelta: 0.001 });

  return (
    <span ref={ref} aria-hidden className="timeline-rail">
      {/* Reduced motion shows it full via CSS; see LitWord for why. */}
      <motion.span className="timeline-rail-fill" style={{ scaleY: fill }} />
    </span>
  );
}

/**
 * A statement whose words light up one after another as it scrolls through
 * the viewport, so the reader's eye is paced through it. Every word is always
 * in the DOM at full contrast for assistive tech; only the visual opacity
 * changes. Under reduced motion it is simply shown.
 */
export function ScrollLitText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 50%"] });
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <p ref={ref} className={className}>
      {words.map((word, i) => (
        <LitWord
          key={i}
          progress={scrollYProgress}
          from={i / words.length}
          to={(i + 1) / words.length}
        >
          {word}
        </LitWord>
      ))}
    </p>
  );
}

function LitWord({
  children,
  progress,
  from,
  to,
}: {
  children: string;
  progress: MotionValue<number>;
  from: number;
  to: number;
}) {
  const opacity = useTransform(progress, [from, to], [0.16, 1]);
  // Reduced motion is handled in CSS (.lit-word), not by swapping in a static
  // value: the server renders the dimmed start, and a reduced-motion client
  // passing a plain 1 never overwrote it, leaving the statement dim for good.
  return (
    <>
      <motion.span className="lit-word" style={{ opacity }}>
        {children}
      </motion.span>{" "}
    </>
  );
}

/** A skill as a row with a hairline meter that fills to its level in view. */
export function SkillMeter({ name, value }: { name: string; value: number | null }) {
  const reduce = useReducedMotion();
  const level = value == null ? null : Math.max(0, Math.min(100, value));

  return (
    <div className="skill-meter">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[0.9375rem] tracking-[-0.01em] text-[var(--fg)]">{name}</span>
        {level != null ? (
          <span className="font-mono text-[0.625rem] tracking-[0.06em] text-[var(--accent-ink)]">
            {level}
            <span className="sr-only"> out of 100</span>
          </span>
        ) : null}
      </div>
      {level != null ? (
        <span aria-hidden className="skill-track">
          <motion.span
            className="skill-fill"
            style={{ originX: 0 }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: level / 100 }}
            viewport={{ once: false, margin: "0px 0px -40px 0px" }}
            transition={reduce ? { duration: 0 } : { duration: 1.2, delay: 0.15, ease: EASE }}
          />
        </span>
      ) : null}
    </div>
  );
}
