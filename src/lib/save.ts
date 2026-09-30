"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * The case room's memory: one object in localStorage, split into named slots.
 *
 * `useSaved(slot, initial)` is a drop-in for useState, so a room keeps its own
 * state where it always was and gets persistence by changing one call. Every
 * room reads the same store, which is what lets the casebook, the leads and
 * the ending see progress made anywhere.
 *
 * Storage can be missing, full or blocked (private windows); every access is
 * guarded and the game simply forgets on refresh rather than breaking.
 */

const KEY = "experiments:save:v1";

type Save = Record<string, unknown>;

let cache: Save | null = null;
const listeners = new Set<() => void>();
const EMPTY: Save = {};

function read(): Save {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Save;
  } catch {
    cache = {};
  }
  return cache ?? EMPTY;
}

export function getSave(): Save {
  return typeof window === "undefined" ? EMPTY : read();
}

export function writeSlot(slot: string, value: unknown) {
  cache = { ...read(), [slot]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* kept in memory for this visit */
  }
  listeners.forEach((l) => l());
}

/** Wipe everything: the "new case" button. */
export function resetSave() {
  cache = {};
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to remove */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The whole save, live. */
export function useSave(): Save {
  return useSyncExternalStore(subscribe, getSave, () => EMPTY);
}

export function useSaved<T>(slot: string, initial: T) {
  const save = useSave();
  const value = (slot in save ? save[slot] : initial) as T;
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const s = getSave();
      const prev = (slot in s ? s[slot] : initial) as T;
      const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      if (v !== prev) writeSlot(slot, v);
    },
    // `initial` is a literal at every call site; its identity is irrelevant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slot],
  );
  return [value, set] as const;
}

/** Add one value to a list slot (flags, items), once. */
export function addTo(slot: string, value: string) {
  const cur = getSave()[slot];
  const list = Array.isArray(cur) ? (cur as string[]) : [];
  if (!list.includes(value)) writeSlot(slot, [...list, value]);
}
