/**
 * The casebook: what the visitor has learned, what is still out there, and
 * how the case closes.
 *
 * Pure. It reads a save (lib/save) and the CMS rows the page already fetched,
 * so every line in the notebook is the portfolio's own text and the check
 * script can run it without a browser. See scripts/check-casebook.ts.
 */

import type { Subject } from "./secrets";

type When = Date | string;

/** The rows this file reads. CaseRoomData satisfies it structurally. */
export type Facts = {
  profile: Subject | null;
  experience: { role: string; company: string; currentlyWorking: boolean; createdAt?: When }[];
  education: { degree: string; institution: string }[];
  projects: { title: string; createdAt: When }[];
  certifications: { name: string; issuer: string }[];
  skillGroups: { name: string; skills: { name: string }[] }[];
  evidence: { code: string; createdAt: When }[];
};

export type Save = Record<string, unknown>;

/* ---------------------------------------------------------------------------
   Slots: the names every room saves under
   ------------------------------------------------------------------------- */

export const SLOT = {
  read: "read",
  office: "office",
  bedroom: "bedroom",
  labRig: "lab:rig",
  archiveUnlocked: (id: string) => `archive:${id}:unlocked`,
  archiveUsed: (id: string) => `archive:${id}:used`,
  hidden: "hidden",
  skips: "skips",
  wrong: "wrong",
  startedAt: "startedAt",
  lastVisit: "lastVisit",
  closed: "closed",
} as const;

const list = (s: Save, k: string) => (Array.isArray(s[k]) ? (s[k] as string[]) : []);
const num = (s: Save, k: string) => (typeof s[k] === "number" ? (s[k] as number) : 0);

/* ---------------------------------------------------------------------------
   Entries
   ------------------------------------------------------------------------- */

export type Entry = {
  id: string;
  title: string;
  /** Where to go, shown as the lead while this entry is still blank. */
  where: string;
  done: (s: Save) => boolean;
  text: (f: Facts) => string;
};

const join = (xs: string[], n = 3) =>
  xs.length <= n ? xs.join(", ") : `${xs.slice(0, n).join(", ")} and ${xs.length - n} more`;

const current = (f: Facts) => f.experience.find((e) => e.currentlyWorking) ?? f.experience[0];

export const ENTRIES: Entry[] = [
  {
    id: "identity",
    title: "Identity",
    where: "The shelf in the case room: file 01, ABOUT.",
    done: (s) => list(s, SLOT.read).includes("about"),
    text: (f) => {
      const p = f.profile;
      if (!p?.name) return "No name on file.";
      return [p.name, p.headline, p.location ? `based in ${p.location}` : ""].filter(Boolean).join(", ") + ".";
    },
  },
  {
    id: "motive",
    title: "Motive",
    where: "The bedroom: the computer on the desk is locked behind a cipher.",
    done: (s) => list(s, SLOT.bedroom).includes("terminal"),
    text: (f) => f.profile?.philosophy || f.profile?.currentFocus || "The motive is not on file.",
  },
  {
    id: "post",
    title: "Current post",
    where: "The office: the filing cabinet is screwed shut.",
    done: (s) => list(s, SLOT.office).includes("record"),
    text: (f) => {
      const j = current(f);
      if (!j) return "No employer on record.";
      const yrs = f.profile?.yearsOfExperience ? ` ${f.profile.yearsOfExperience}+ years on the job.` : "";
      return `${j.role} at ${j.company}.${yrs}`;
    },
  },
  {
    id: "record",
    title: "Employment record",
    where: "The office: the architecture on the whiteboard is a tangle.",
    done: (s) => list(s, SLOT.office).includes("wiring"),
    text: (f) =>
      f.experience.length
        ? `${f.experience.length} role${f.experience.length === 1 ? "" : "s"}: ${join([...new Set(f.experience.map((e) => e.company))])}.`
        : "No roles on record.",
  },
  {
    id: "tools",
    title: "Tools of the trade",
    where: "The office: the patch panel in the rack is unwired.",
    done: (s) => list(s, SLOT.office).includes("patch"),
    text: (f) => {
      const names = f.skillGroups.flatMap((g) => g.skills.map((k) => k.name));
      return names.length ? `Works with ${join(names, 6)}.` : "No tools listed.";
    },
  },
  {
    id: "schooling",
    title: "Schooling",
    where: "The office: the backlog on the desk needs sorting.",
    done: (s) => list(s, SLOT.office).includes("backlog"),
    text: (f) =>
      f.education.length
        ? f.education.map((e) => `${e.degree}, ${e.institution}`).join("; ") + "."
        : "No schooling on record.",
  },
  {
    id: "projects",
    title: "The work",
    where: "The lab (file 03): the machine is locked behind a circuit.",
    done: (s) => s[SLOT.labRig] === true,
    text: (f) =>
      f.projects.length
        ? `${f.projects.length} project${f.projects.length === 1 ? "" : "s"} shipped: ${join(f.projects.map((p) => p.title))}.`
        : "No projects published.",
  },
  {
    id: "papers",
    title: "Papers",
    where: "The locked archives (file 05): the cage needs picking.",
    done: (s) => s[SLOT.archiveUnlocked("vault")] === true,
    text: (f) =>
      f.certifications.length
        ? `${f.certifications.length} certification${f.certifications.length === 1 ? "" : "s"}: ${join(f.certifications.map((c) => `${c.name} (${c.issuer})`), 2)}.`
        : "No certifications on file.",
  },
  {
    id: "training",
    title: "Training",
    where: "The training floor (file 06): open the lockers.",
    done: (s) => list(s, SLOT.archiveUsed("training")).includes("lockers"),
    text: (f) => {
      const n = f.skillGroups.reduce((a, g) => a + g.skills.length, 0);
      return n ? `${n} skills across ${join(f.skillGroups.map((g) => g.name))}.` : "Nothing in the lockers.";
    },
  },
];

export const doneEntries = (s: Save) => ENTRIES.filter((e) => e.done(s));

/** The next place worth going, or null once the notebook is full. */
export function lead(s: Save): string | null {
  return ENTRIES.find((e) => !e.done(s))?.where ?? null;
}

/** The case can be closed once every entry is in. */
export const readyToClose = (s: Save) => ENTRIES.every((e) => e.done(s));

/* ---------------------------------------------------------------------------
   Closing the case: three questions the notebook answers
   ------------------------------------------------------------------------- */

export type Question = { q: string; options: string[]; answer: string };

// Obviously invented, so a decoy is never mistaken for a real claim.
const DECOYS = {
  company: ["Initech", "Globex Corporation", "Hooli"],
  project: ["A blockchain for toasters", "Yet another to-do app", "The Hooli phone"],
  place: ["Atlantis", "The Moon", "Gotham"],
};

/** Answer plus two decoys, in an order that depends on the answer, not Math.random. */
function options(answer: string, pool: string[], decoys: string[]): string[] {
  const others = [...new Set([...pool, ...decoys])].filter((o) => o !== answer).slice(0, 2);
  const out = [...others];
  out.splice(answer.length % (out.length + 1), 0, answer);
  return out;
}

export function questions(f: Facts): Question[] {
  const out: Question[] = [];
  const j = current(f);
  if (j)
    out.push({
      q: "Where does the subject work now?",
      answer: j.company,
      options: options(j.company, f.experience.map((e) => e.company).filter((c) => c !== j.company), DECOYS.company),
    });
  const p = f.projects[0];
  if (p)
    out.push({
      q: "Which of these did the subject build?",
      answer: p.title,
      options: options(p.title, [], DECOYS.project),
    });
  const place = f.profile?.location?.trim();
  if (place)
    out.push({
      q: "Where is the subject based?",
      answer: place,
      options: options(place, [], DECOYS.place),
    });
  return out;
}

/* ---------------------------------------------------------------------------
   Rank
   ------------------------------------------------------------------------- */

export type Rank = { title: string; score: number };

export function rank(r: { ms: number; skips: number; wrong: number; hidden: number }): Rank {
  const minutes = r.ms / 60000;
  // ponytail: flat weights, tune once there are real play times to look at.
  const score = Math.max(
    0,
    Math.min(100, Math.round(100 - r.skips * 8 - r.wrong * 5 + r.hidden * 3 - Math.max(0, minutes - 15))),
  );
  const title =
    score >= 90 ? "Chief Inspector" : score >= 70 ? "Detective Inspector" : score >= 45 ? "Detective" : "Constable";
  return { title, score };
}

export function rankFor(s: Save, now = Date.now()): Rank {
  const closed = s[SLOT.closed] as { at: number } | undefined;
  const start = num(s, SLOT.startedAt) || now;
  return rank({
    ms: (closed?.at ?? now) - start,
    skips: num(s, SLOT.skips),
    wrong: num(s, SLOT.wrong),
    hidden: list(s, SLOT.hidden).length,
  });
}

/* ---------------------------------------------------------------------------
   What changed since the last visit
   ------------------------------------------------------------------------- */

const t = (w: When) => new Date(w).getTime();

/** Rows added to the CMS since `since`. Nothing is new on a first visit. */
export function fresh(f: Facts, since: number | undefined) {
  if (!since) return { projects: [] as string[], pins: [] as string[] };
  return {
    projects: f.projects.filter((p) => t(p.createdAt) > since).map((p) => p.title),
    pins: f.evidence.filter((e) => t(e.createdAt) > since).map((e) => e.code),
  };
}

export const elapsed = (ms: number) => {
  const m = Math.floor(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${Math.floor((ms % 60000) / 1000)}s`;
};
