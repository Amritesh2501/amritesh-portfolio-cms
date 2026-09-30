/**
 * The side games around the case: what changes daily, the decoder's cipher,
 * the timeline, the witness who lies once, the evidence to match, and the
 * achievements. Pure; see scripts/check-games.ts.
 *
 * Everything that names the subject comes from the CMS rows (Facts), so
 * editing the portfolio changes the games with it.
 */

import { SLOT, type Facts, type Save } from "./casebook";

/* ---------------------------------------------------------------------------
   Daily: the same numbers all day, new ones tomorrow
   ------------------------------------------------------------------------- */

/** Small, fast, seedable. Plenty for picking lock numbers. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Local date, so "today" turns over at the visitor's midnight. */
export function dayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const dailyRnd = (salt: string, day = dayKey()) => mulberry32(hashOf(`${day}:${salt}`));

export type Streak = { last: string; streak: number };

/** Opening a daily lock: same day is no change, the next day adds one. */
export function bumpStreak(prev: Streak | undefined, today: string): Streak {
  if (prev?.last === today) return prev;
  const y = new Date(`${today}T12:00:00`);
  y.setDate(y.getDate() - 1);
  return { last: today, streak: prev?.last === dayKey(y) ? prev.streak + 1 : 1 };
}

/* ---------------------------------------------------------------------------
   The decoder ring: a Caesar shift
   ------------------------------------------------------------------------- */

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function caesar(text: string, shift: number): string {
  const k = ((shift % 26) + 26) % 26;
  return text
    .toUpperCase()
    .replace(/[A-Z]/g, (c) => ALPHABET[(c.charCodeAt(0) - 65 + k) % 26]);
}

/** Today's key: never 0, which would leave the message in the clear. */
export const decoderShift = (day = dayKey()) => 1 + (hashOf(`${day}:shift`) % 25);

/** What the fiche says, before it is scrambled. */
export function decoderPlain(f: Facts): string {
  const p = f.profile;
  const text = p?.currentFocus || p?.headline || p?.philosophy || "THE SUBJECT WAS HERE";
  // One line: the ring is for reading, not for an essay.
  const clipped = text.replace(/\s+/g, " ").trim().slice(0, 90);
  return clipped.toUpperCase();
}

/* ---------------------------------------------------------------------------
   Timeline: put the record back in order
   ------------------------------------------------------------------------- */

export type Dated = { id: string; label: string; at: number };

type WithStart = { startDate?: Date | string | null };

/** Jobs and schooling, earliest first. That order is the answer. */
export function timeline(f: Facts): Dated[] {
  const rows: Dated[] = [];
  f.experience.forEach((e, i) => {
    const at = new Date((e as WithStart).startDate ?? 0).getTime();
    rows.push({ id: `x${i}`, label: `${e.role}, ${e.company}`, at });
  });
  f.education.forEach((e, i) => {
    const at = new Date((e as WithStart).startDate ?? 0).getTime();
    rows.push({ id: `e${i}`, label: `${e.degree}, ${e.institution}`, at });
  });
  // Ties would make two answers right; order them by label so one is.
  return rows
    .filter((r) => Number.isFinite(r.at))
    .sort((a, b) => a.at - b.at || a.label.localeCompare(b.label))
    .slice(0, 6);
}

/* ---------------------------------------------------------------------------
   The witness: four statements, one of them a lie
   ------------------------------------------------------------------------- */

export type Testimony = { statements: string[]; lie: number };

/** Every fact the witness can speak to, told straight and told crooked. */
function claims(f: Facts): { truth: string; lie: string }[] {
  const out: { truth: string; lie: string }[] = [];
  const p = f.profile;
  const job = f.experience.find((e) => e.currentlyWorking) ?? f.experience[0];
  if (p?.location)
    out.push({ truth: `They live in ${p.location}.`, lie: `They live in ${p.location === "Gotham" ? "Atlantis" : "Gotham"}.` });
  if (job)
    out.push({
      truth: `They work at ${job.company}.`,
      lie: `They work at ${job.company === "Initech" ? "Globex" : "Initech"}.`,
    });
  if (f.projects.length)
    out.push({
      truth: `They have shipped ${f.projects.length} project${f.projects.length === 1 ? "" : "s"}.`,
      lie: `They have shipped ${f.projects.length + 7} projects.`,
    });
  if (f.education[0])
    out.push({
      truth: `They studied at ${f.education[0].institution}.`,
      lie: `They studied at the Clown College of Gotham.`,
    });
  const skills = f.skillGroups.reduce((n, g) => n + g.skills.length, 0);
  if (skills)
    out.push({ truth: `They list ${skills} skills.`, lie: `They list ${skills + 40} skills.` });
  if (f.certifications.length)
    out.push({
      truth: `They hold ${f.certifications.length} certification${f.certifications.length === 1 ? "" : "s"}.`,
      lie: `They have never passed an exam in their life.`,
    });
  return out;
}

/** Null when the CMS has too little to build a fair round from. */
export function testimony(f: Facts, rnd: () => number = Math.random): Testimony | null {
  const all = claims(f);
  if (all.length < 3) return null;
  // Shuffle, take up to four, and bend one.
  const picked = [...all].sort(() => rnd() - 0.5).slice(0, 4);
  const lie = Math.floor(rnd() * picked.length);
  return { statements: picked.map((c, i) => (i === lie ? c.lie : c.truth)), lie };
}

/* ---------------------------------------------------------------------------
   Evidence matching: each project to what it is
   ------------------------------------------------------------------------- */

export type Pair = { id: string; title: string; clue: string };

export function pairs(f: Facts, n = 4): Pair[] {
  return f.projects
    .filter((p) => (p as { shortDescription?: string }).shortDescription)
    .slice(0, n)
    .map((p, i) => ({
      id: `p${i}`,
      title: p.title,
      clue: ((p as { shortDescription?: string }).shortDescription ?? "").slice(0, 140),
    }));
}

/* ---------------------------------------------------------------------------
   Achievements
   ------------------------------------------------------------------------- */

const list = (s: Save, k: string) => (Array.isArray(s[k]) ? (s[k] as string[]) : []);
export const flags = (s: Save) => list(s, SLOT.flags);

/** Every lock in the building, by where it saves. */
export const LOCKS: { room: string; id: string; open: (s: Save) => boolean }[] = [
  ...["record", "wiring", "patch", "backlog"].map((id) => ({
    room: "office",
    id,
    open: (s: Save) => list(s, SLOT.office).includes(id),
  })),
  ...["terminal", "drawer", "poster"].map((id) => ({
    room: "bedroom",
    id,
    open: (s: Save) => list(s, SLOT.bedroom).includes(id),
  })),
  { room: "lab", id: "rig", open: (s) => s[SLOT.labRig] === true },
  ...(
    [
      ["vault", "cage"],
      ["vault", "boxes"],
      ["vault", "vault"],
      ["training", "lockers"],
      ["college", "fiche"],
      ["college", "catalogue"],
    ] as const
  ).map(([room, id]) => ({ room, id, open: (s: Save) => list(s, SLOT.archiveOpen(room)).includes(id) })),
];

export type Achievement = { id: string; title: string; desc: string; test: (s: Save) => boolean };

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first", title: "Foot in the door", desc: "Open your first lock.", test: (s) => LOCKS.some((l) => l.open(s)) },
  { id: "locks", title: "Picked every lock", desc: `Open all ${LOCKS.length} locks in the building.`, test: (s) => LOCKS.every((l) => l.open(s)) },
  { id: "hidden", title: "Nothing gets past you", desc: "Find all five hidden items in the case room.", test: (s) => list(s, SLOT.hidden).length >= 5 },
  { id: "closed", title: "Case closed", desc: "Answer the three questions.", test: (s) => !!s[SLOT.closed] },
  { id: "clean", title: "By the book", desc: "Close the case without skipping a single puzzle.", test: (s) => !!s[SLOT.closed] && !s[SLOT.skips] },
  { id: "mugshot", title: "Say cheese", desc: "Take your own booking photo.", test: (s) => flags(s).includes("mugshot") },
  { id: "witness", title: "Liar, liar", desc: "Catch the witness in a lie.", test: (s) => flags(s).includes("witness") },
  { id: "matched", title: "Evidence locker", desc: "Match every project to its file.", test: (s) => flags(s).includes("matched") },
  { id: "voicemail", title: "You have 3 new messages", desc: "Listen to the office phone.", test: (s) => flags(s).includes("voicemail") },
  { id: "torch", title: "Invisible ink", desc: "Find the UV torch and use it.", test: (s) => flags(s).includes("torch") },
  {
    id: "streak",
    title: "Regular",
    desc: "Open a daily lock three days running.",
    test: (s) => ((s[SLOT.daily] as Streak | undefined)?.streak ?? 0) >= 3,
  },
];

export const earned = (s: Save) => ACHIEVEMENTS.filter((a) => a.test(s));
