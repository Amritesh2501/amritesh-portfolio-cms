/**
 * The case room's intake sheet and the things hidden in it.
 *
 * Kept out of the components for the same reason lib/world is: an easter egg
 * that never fires, or an intake that prints "undefined" where a name should
 * be, fails silently as nobody noticing. See scripts/check-secrets.ts.
 *
 * Every line of text here is built from the CMS. Nothing about the person is
 * written in this file, so editing the profile changes the room on the next
 * load (the page is force-dynamic) without anybody touching code.
 */

/** The fields of the profile this file reads. Structural, so the check can
 *  hand it a plain object and nothing here imports Prisma. */
export type Subject = {
  name?: string | null;
  headline?: string | null;
  location?: string | null;
  email?: string | null;
  resumeUrl?: string | null;
  availabilityStatus?: string | null;
  availabilityText?: string | null;
  currentlyWorkingAt?: string | null;
  currentlyWorkingRole?: string | null;
  yearsOfExperience?: number | null;
  philosophy?: string | null;
  technicalInterests?: string | null;
  currentFocus?: string | null;
  hobbies?: string[] | null;
};

export type Counts = {
  projects: number;
  roles: number;
  certifications: number;
  skills: number;
  evidence: number;
};

const REDACTED = "████████";
const or = (v: string | null | undefined, fallback = REDACTED) =>
  v && v.trim() ? v.trim() : fallback;

/** A case number that stays the same for the same person. */
export function caseNo(name: string | null | undefined): string {
  let h = 7;
  for (const c of or(name, "unknown")) h = (h * 31 + c.charCodeAt(0)) % 100000;
  return `AT-${String(h).padStart(5, "0")}`;
}

/* ---------------------------------------------------------------------------
   The intake: what types on the black screen
   ------------------------------------------------------------------------- */

export function intakeLines(p: Subject | null, n: Counts): string[] {
  const role =
    p?.currentlyWorkingRole && p?.currentlyWorkingAt
      ? `${p.currentlyWorkingRole}, ${p.currentlyWorkingAt}`
      : or(p?.currentlyWorkingRole ?? p?.currentlyWorkingAt);
  const years = p?.yearsOfExperience ? `${p.yearsOfExperience}+ years` : REDACTED;
  const status = or(p?.availabilityText ?? p?.availabilityStatus, "UNKNOWN");

  return [
    `CASE FILE ${caseNo(p?.name)}          STATUS: OPEN`,
    "",
    `SUBJECT ..... ${or(p?.name).toUpperCase()}`,
    `KNOWN AS .... ${or(p?.headline)}`,
    `LAST SEEN ... ${or(p?.location)}`,
    `CURRENTLY ... ${role}`,
    `ON RECORD ... ${years}`,
    `AVAILABLE ... ${status}`,
    "",
    `EVIDENCE: ${n.projects} projects shipped, ${n.roles} roles held,`,
    `${n.certifications} certifications, ${n.skills} skills, ${n.evidence} pins on the board.`,
    "",
    "The scene is through here: a room, a board with string on it, a",
    "machine somebody left running, and a shelf of six files. Every file",
    "is a door. Some things in the room were not meant to be found.",
    "",
    "Nothing you do here can break anything. Nothing is saved.",
  ];
}

/* ---------------------------------------------------------------------------
   Interrogation: commands typed at the intake prompt
   ------------------------------------------------------------------------- */

/**
 * What the prompt says back. `null` means "clear the transcript".
 * Unknown input gets a reply too, so typing never reads as broken.
 */
export function interrogate(raw: string, p: Subject | null): string | null {
  const cmd = raw.trim().toLowerCase();
  const first = or(p?.name, "").split(/\s+/)[0]?.toLowerCase();

  if (cmd === "clear") return null;
  if (cmd === "help" || cmd === "?")
    return "Try: whoami, ls, cat motive, alibi, hire, contact, sudo, clear. Some words aren't on this list.";
  if (cmd === "whoami") return "A detective, apparently. The subject is the other one.";
  if (cmd === "ls" || cmd === "ls -la")
    return "about/  experience/  projects/  stack/  certifications/  skills/  .secrets  (permission denied)";
  if (cmd === "cat motive" || cmd === "motive")
    return or(p?.philosophy, "The motive field is blank. Suspicious.");
  if (cmd === "alibi")
    return p?.currentlyWorkingAt
      ? `Claims to have been at ${p.currentlyWorkingAt} the whole time.`
      : "No alibi on file.";
  if (cmd === "hire" || cmd === "hire me" || cmd === "hire him" || cmd === "hire them")
    return or(p?.availabilityText, "Status unknown. Ask anyway.") +
      (p?.email ? ` Write to ${p.email}.` : "");
  if (cmd === "contact" || cmd === "email")
    return p?.email ? `Last known address: ${p.email}` : "No forwarding address.";
  if (cmd.startsWith("sudo")) return "Nice try. This incident will be reported.";
  if (cmd === "cat .secrets" || cmd === "ls .secrets")
    return "Permission denied. Some doors open with ↑↑↓↓←→←→BA.";
  if (cmd === "rm -rf /" || cmd === "rm -rf")
    return "Tampering with evidence is a crime.";
  if (cmd === "coffee") return "The cup on the desk is cold. It has been a while.";
  if (first && cmd === first) return "Who told you that name? …Go on in.";
  if (cmd === "") return "";
  return `'${raw.trim()}': no record. Type 'help'.`;
}

/* ---------------------------------------------------------------------------
   Keys: the Konami code and the console word
   ------------------------------------------------------------------------- */

export const KONAMI = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a",
] as const;

/** The word the DevTools console hints at. */
export const CONSOLE_WORD = "fingerprint";

/**
 * Does the tail of what was typed end in `seq`? Letters compare without
 * case, so Caps Lock does not quietly break the code.
 */
export function endsWith(keys: readonly string[], seq: readonly string[]): boolean {
  if (keys.length < seq.length) return false;
  const tail = keys.slice(-seq.length);
  return tail.every((k, i) => k.toLowerCase() === seq[i].toLowerCase());
}

/* ---------------------------------------------------------------------------
   Hidden evidence in the room
   ------------------------------------------------------------------------- */

export type Hidden = {
  id: string;
  /** Marker number once found. */
  tag: string;
  /** Hit area in world units (lib/world WORLD space). */
  at: { x: number; y: number; r: number };
  label: string;
  /** What the evidence card says, from the profile. */
  text: (p: Subject | null) => string;
};

export const HIDDEN: Hidden[] = [
  {
    id: "clock",
    tag: "1",
    at: { x: 1548, y: 352, r: 48 },
    label: "Behind the clock",
    text: (p) =>
      p?.yearsOfExperience
        ? `Taped behind the clock: "${p.yearsOfExperience}+ years on the job." The clock stopped counting.`
        : "Taped behind the clock: a blank note. Nobody wrote the years down.",
  },
  {
    id: "floorboard",
    tag: "2",
    at: { x: 330, y: 1230, r: 60 },
    label: "A loose floorboard",
    text: (p) =>
      p?.hobbies?.length
        ? `Under a loose floorboard: ticket stubs and notes. ${p.hobbies.join(", ")}.`
        : "Under a loose floorboard: dust, and nothing else.",
  },
  {
    id: "corner",
    tag: "3",
    at: { x: 140, y: 150, r: 60 },
    label: "A cobweb in the corner",
    text: (p) =>
      `Caught in the cobweb: a postcard from ${or(p?.location, "somewhere unreadable")}.`,
  },
  {
    id: "skirting",
    tag: "4",
    at: { x: 1860, y: 930, r: 40 },
    label: "A gap in the skirting",
    text: (p) =>
      `Folded into the skirting: a to-do list. Top line reads "${or(p?.currentFocus, "…")}".`,
  },
  {
    id: "under-desk",
    tag: "5",
    at: { x: 1140, y: 1180, r: 70 },
    label: "Under the desk",
    text: (p) =>
      `Taped under the desk: "${or(p?.technicalInterests, "Nothing legible.")}"`,
  },
];

/** The notes written in UV ink, shown under the blacklight. */
export function uvNotes(p: Subject | null): string[] {
  return [p?.philosophy, p?.currentFocus, p?.technicalInterests]
    .map((v) => v?.trim())
    .filter((v): v is string => !!v);
}
