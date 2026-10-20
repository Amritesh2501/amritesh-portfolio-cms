/**
 * The arithmetic behind "Currently working on": where on the road a project
 * is, how far along, and how its dates read today. Pure; see
 * scripts/check-current.ts.
 */

export const STAGES = [
  { id: "IDEA", label: "Idea" },
  { id: "PLANNING", label: "Planning" },
  { id: "DESIGN", label: "Design" },
  { id: "BUILDING", label: "Building" },
  { id: "TESTING", label: "Testing" },
  { id: "LAUNCHING", label: "Launching" },
] as const;

export const HEALTH: Record<string, { label: string; tone: "good" | "warn" | "bad" | "idle" }> = {
  ON_TRACK: { label: "On track", tone: "good" },
  AHEAD: { label: "Ahead of schedule", tone: "good" },
  AT_RISK: { label: "At risk", tone: "warn" },
  BLOCKED: { label: "Blocked", tone: "bad" },
  PAUSED: { label: "Paused", tone: "idle" },
};

/** Index of the current stage; an unknown value reads as Building. */
export function stageIndex(stage: string): number {
  const i = STAGES.findIndex((s) => s.id === stage);
  return i < 0 ? 3 : i;
}

type Milestone = { done: boolean };

/**
 * The number on the bar. An explicit progress wins; at 0 it is worked out
 * from the milestones ticked off, so a list kept up to date needs no second
 * number kept up to date beside it.
 */
export function effectiveProgress(progress: number, milestones: readonly Milestone[]): number {
  const p = Math.round(progress);
  if (p > 0) return Math.min(100, p);
  if (!milestones.length) return 0;
  return Math.round((milestones.filter((m) => m.done).length / milestones.length) * 100);
}

const DAY = 86400000;
const midnight = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** Whole days from a to b (negative when b is earlier). */
export const daysBetween = (a: Date, b: Date) => Math.round((midnight(b) - midnight(a)) / DAY);

export type Timeline = {
  /** "Day 42" since starting, when there is a start date. */
  daysIn: number | null;
  /** Days until the target; negative once it has passed. */
  daysLeft: number | null;
  /** Share of the start-to-target span already used, 0-100. */
  elapsed: number | null;
};

export function timeline(startedAt: Date | null, targetDate: Date | null, now = new Date()): Timeline {
  const daysIn = startedAt ? Math.max(0, daysBetween(startedAt, now)) : null;
  const daysLeft = targetDate ? daysBetween(now, targetDate) : null;
  let elapsed: number | null = null;
  if (startedAt && targetDate) {
    const span = daysBetween(startedAt, targetDate);
    elapsed = span > 0 ? Math.min(100, Math.max(0, Math.round(((daysIn ?? 0) / span) * 100))) : 100;
  }
  return { daysIn, daysLeft, elapsed };
}

/** "12 days left", "Due today", "3 days over". */
export function leftLabel(daysLeft: number): string {
  if (daysLeft === 0) return "Due today";
  if (daysLeft > 0) return `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
  const over = -daysLeft;
  return `${over} day${over === 1 ? "" : "s"} over`;
}

/**
 * The health shown. What the CMS says, except that work past its target date
 * and not yet complete cannot honestly be "on track" or "ahead".
 */
export function healthFor(health: string, progress: number, daysLeft: number | null) {
  const h = HEALTH[health] ?? HEALTH.ON_TRACK;
  if (daysLeft !== null && daysLeft < 0 && progress < 100 && h.tone === "good") return HEALTH.AT_RISK;
  return h;
}
