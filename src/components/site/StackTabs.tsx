"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type Group = {
  id: string;
  name: string;
  skills: { id: string; name: string; proficiency: number | null }[];
};

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * One skill area at a time: a tab list of areas beside a grid of tiles, each
 * with a ring that draws to its level. Replaces six tall cards of bars, which
 * made the section several screens long.
 *
 * Proper tabs for keyboard and screen reader users: arrow keys, Home and End
 * move between areas, and only the active tab is in the tab order.
 */
export function StackTabs({ groups }: { groups: Group[] }) {
  const [active, setActive] = useState(0);
  // The first panel waits until it scrolls into view; after a tab is chosen,
  // each new panel animates in straight away.
  const [chosen, setChosen] = useState(false);
  const select = (index: number) => {
    setActive(index);
    setChosen(true);
  };
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const reduce = useReducedMotion();
  const group = groups[active];

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = groups.length - 1;
    const next =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? index === last ? 0 : index + 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? index === 0 ? last : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : -1;
    if (next < 0) return;
    event.preventDefault();
    select(next);
    tabs.current[next]?.focus();
  };

  if (!group) return null;

  return (
    <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
      <div
        role="tablist"
        aria-label="Skill areas"
        aria-orientation="vertical"
        className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0"
      >
        {groups.map((g, i) => {
          const selected = i === active;
          return (
            <button
              key={g.id}
              ref={(node) => {
                tabs.current[i] = node;
              }}
              type="button"
              role="tab"
              id={`stack-tab-${g.id}`}
              aria-selected={selected}
              aria-controls="stack-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => select(i)}
              onKeyDown={(event) => onKeyDown(event, i)}
              className={`group relative flex shrink-0 items-center gap-4 rounded-[var(--r-md)] px-4 py-3 text-left transition-colors duration-300 lg:py-3.5 ${
                selected ? "text-[var(--fg)]" : "text-[var(--muted)] hover:text-[var(--fg)]"
              }`}
            >
              {selected ? (
                <motion.span
                  layoutId="stack-tab-highlight"
                  aria-hidden
                  className="absolute inset-0 rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_9%,transparent)] shadow-[0_0_34px_-14px_var(--glow)]"
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 34 }}
                />
              ) : null}
              <span className="t-serif relative text-[1.375rem] leading-none text-[var(--accent)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="relative flex-1 whitespace-nowrap text-[0.9375rem] font-medium tracking-[-0.01em]">
                {g.name}
              </span>
              <span className="t-meta relative text-[0.5625rem] tabular-nums">{g.skills.length}</span>
            </button>
          );
        })}
      </div>

      <div
        id="stack-panel"
        role="tabpanel"
        aria-labelledby={`stack-tab-${group.id}`}
        className="min-h-[16rem]"
      >
        {/* Keyed by area, so switching remounts the grid and it plays in fresh.
            No exit handoff: waiting on the old grid's exit left the panel stuck
            on the previous area. */}
        <motion.ul
          key={group.id}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
          initial="hidden"
          {...(chosen
            ? { animate: "visible" }
            : { whileInView: "visible", viewport: { once: true, amount: 0.2 } })}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: reduce ? 0 : 0.045 } },
          }}
        >
          {group.skills.map((skill) => (
            <motion.li
              key={skill.id}
              className="card flex flex-col items-center gap-3 px-3 py-6 text-center"
              variants={{
                hidden: { opacity: 0, y: reduce ? 0 : 14, scale: reduce ? 1 : 0.96 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: reduce ? { duration: 0.3 } : { duration: 0.55, ease: EASE },
                },
              }}
            >
              <Ring value={skill.proficiency} reduce={!!reduce} />
              <span className="text-[0.875rem] font-medium leading-snug tracking-[-0.01em] text-[var(--fg)]">
                {skill.name}
              </span>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </div>
  );
}

function Ring({ value, reduce }: { value: number | null; reduce: boolean }) {
  if (value == null) {
    return (
      <span aria-hidden className="grid h-16 w-16 place-items-center">
        <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--glow)]" />
      </span>
    );
  }

  const level = Math.max(0, Math.min(100, value));
  return (
    <span className="relative grid h-16 w-16 place-items-center">
      <svg viewBox="0 0 64 64" aria-hidden className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r="28" fill="none" stroke="var(--line-strong)" strokeWidth="1.5" />
        <motion.circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 4px var(--glow))" }}
          variants={{
            hidden: { pathLength: 0 },
            visible: {
              pathLength: level / 100,
              transition: reduce ? { duration: 0 } : { duration: 1.1, delay: 0.15, ease: EASE },
            },
          }}
        />
      </svg>
      <span className="t-display relative text-[0.9375rem] tabular-nums text-[var(--fg)]">
        {level}
        <span className="sr-only"> out of 100</span>
      </span>
    </span>
  );
}
