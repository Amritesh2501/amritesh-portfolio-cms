/**
 * The investigation's memory: what has been recovered, and how that survives
 * the tab being closed.
 *
 * One state object for the whole experience, because the thing section 20 asks
 * for — progress that does not reset when you change environment — is exactly
 * what you get for free if there is only ever one place progress lives. Scenes
 * read it; they never own a copy.
 *
 * Pure except for the two storage functions at the bottom, which is what lets
 * the check script exercise the arithmetic without a browser.
 */

import { CASES, EVIDENCE, caseTotal, evidenceFor, type CaseId } from "./cases";

/** Bumped when the shape changes. An older save is dropped, not migrated. */
export const SAVE_VERSION = 1;

export const SAVE_KEY = "amritesh-files:save";

export type Progress = {
  v: number;
  /** Evidence ids, in the order they were recovered. */
  collected: string[];
  /** Optional discoveries: easter eggs, terminal commands, the AMR-000 file. */
  flags: string[];
  startedAt: number;
  updatedAt: number;
};

export function emptyProgress(now = Date.now()): Progress {
  return { v: SAVE_VERSION, collected: [], flags: [], startedAt: now, updatedAt: now };
}

/* ---------------------------------------------------------------------------
   Transitions
   ------------------------------------------------------------------------- */

/**
 * Idempotent: collecting the same piece twice is a no-op rather than a second
 * entry. Worth being strict about, because a double-fire from a minigame that
 * resolves on both a click and a keypress would otherwise push the counter
 * past its own total and show "9 / 8".
 */
export function collect(state: Progress, id: string, now = Date.now()): Progress {
  if (state.collected.includes(id)) return state;
  if (!EVIDENCE.some((e) => e.id === id)) return state;
  return { ...state, collected: [...state.collected, id], updatedAt: now };
}

export function flag(state: Progress, name: string, now = Date.now()): Progress {
  if (state.flags.includes(name)) return state;
  return { ...state, flags: [...state.flags, name], updatedAt: now };
}

export const has = (state: Progress, id: string) => state.collected.includes(id);

/* ---------------------------------------------------------------------------
   Counting
   ------------------------------------------------------------------------- */

export type CaseProgress = {
  id: CaseId;
  found: number;
  total: number;
  /** No environment built for it yet. The HUD says SEALED rather than 0 / 0. */
  sealed: boolean;
  solved: boolean;
};

export function caseProgress(state: Progress, id: CaseId): CaseProgress {
  const total = caseTotal(id);
  const found = evidenceFor(id).filter((e) => state.collected.includes(e.id)).length;
  return {
    id,
    found,
    total,
    sealed: total === 0,
    solved: total > 0 && found === total,
  };
}

export const allCaseProgress = (state: Progress) =>
  CASES.map((c) => caseProgress(state, c.id));

export const isCaseSolved = (state: Progress, id: CaseId) =>
  caseProgress(state, id).solved;

/**
 * Overall completion, over the evidence that actually exists.
 *
 * Counting the unbuilt cases as zeroes would pin the bar near the bottom no
 * matter how well the player did, which turns the one number the HUD is for
 * into a lie. Cases arrive with their evidence, and the denominator grows with
 * them.
 */
export function percent(state: Progress): number {
  const total = EVIDENCE.length;
  if (total === 0) return 0;
  const found = state.collected.filter((id) =>
    EVIDENCE.some((e) => e.id === id),
  ).length;
  return Math.round((found / total) * 100);
}

/** Every piece of every case that currently exists. */
export const isComplete = (state: Progress) =>
  EVIDENCE.length > 0 && percent(state) === 100;

/**
 * Every case built AND solved — the gate on the CASE SOLVED finale.
 *
 * Deliberately stricter than `isComplete`. That one is measured against the
 * evidence that exists, which is what the HUD percentage should track; using
 * it to trigger the ending would declare the investigation over while five of
 * the six rooms are still unbuilt. This one comes true on its own as the
 * remaining cases are marked playable, so the finale needs no second edit to
 * arm it.
 */
export const isInvestigationComplete = (state: Progress) =>
  CASES.every((c) => c.playable && caseProgress(state, c.id).solved);

/* ---------------------------------------------------------------------------
   Storage
   ------------------------------------------------------------------------- */

/**
 * Storage can throw outright — Safari private mode, a locked-down profile, an
 * iframe with third-party storage blocked — and it can also come back with
 * whatever a previous version of this file wrote. Both are ordinary, neither
 * is worth losing the page over, so every path here degrades to "no save"
 * instead of propagating.
 */
export function loadProgress(): Progress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return parseProgress(raw);
  } catch {
    return null;
  }
}

/** Split out from loadProgress so the parsing can be checked without a DOM. */
export function parseProgress(raw: string): Progress | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;

  const obj = data as Partial<Progress>;
  if (obj.v !== SAVE_VERSION) return null;

  // Trust nothing about the contents: an id that no longer exists would render
  // as a phantom tick in the HUD and inflate the percentage forever.
  const collected = Array.isArray(obj.collected)
    ? obj.collected.filter(
        (id): id is string =>
          typeof id === "string" && EVIDENCE.some((e) => e.id === id),
      )
    : [];
  const flags = Array.isArray(obj.flags)
    ? obj.flags.filter((f): f is string => typeof f === "string")
    : [];

  return {
    v: SAVE_VERSION,
    collected: [...new Set(collected)],
    flags: [...new Set(flags)],
    startedAt: typeof obj.startedAt === "number" ? obj.startedAt : Date.now(),
    updatedAt: typeof obj.updatedAt === "number" ? obj.updatedAt : Date.now(),
  };
}

export function saveProgress(state: Progress): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearProgress(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    /* nothing to clear if storage is not there in the first place */
  }
}
