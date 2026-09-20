import "server-only";

import { getHomeData } from "@/lib/content";
import type { SlotId } from "./cases";

/**
 * The one place the game layer touches real facts about the subject.
 *
 * Everything the investigation hands back comes through here, read from the
 * same CMS rows the public site renders. The rule in the brief is not
 * decorative: the mystery is allowed to be fictional, the portfolio is not, so
 * nothing in this file writes a claim of its own. It moves published rows into
 * the slots the evidence names, and where a row is empty it says so in as many
 * words rather than filling the gap.
 *
 * Server-only, and the result is passed into the client game as a plain
 * object. That keeps `server-only` honest and keeps the whole of Prisma out of
 * the bundle the player downloads.
 */

export type DossierEntry = {
  /** Heading on the recovered-evidence card. */
  title: string;
  /** The body. Plain text, possibly multi-paragraph. */
  body: string;
  /** Optional short facts rendered as evidence tags. */
  tags?: string[];
  /** True when the CMS had nothing and this is a marked placeholder. */
  placeholder?: boolean;
};

export type Dossier = Record<SlotId, DossierEntry>;

/** Shown instead of an invented fact. Deliberately obvious in the UI. */
const MISSING = (what: string): DossierEntry => ({
  title: "RECORD INCOMPLETE",
  body: `No ${what} is on file for the subject. This field is empty in the archive rather than withheld — set it in the CMS and it will appear here.`,
  placeholder: true,
});

const text = (value: string | null | undefined) => (value ?? "").trim();

/**
 * Turns the markdown-ish bullet/emphasis conventions the CMS fields use into
 * flat prose. The evidence cards are typeset as document extracts, and a
 * literal `**` in the middle of one reads as a corrupted file rather than as
 * emphasis.
 */
function flatten(value: string): string {
  return value
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^[-*]\s+/gm, "— ")
    .trim();
}

export async function getDossier(): Promise<Dossier> {
  const data = await getHomeData();
  const p = data.profile;

  const identityTags = [
    text(p?.headline),
    text(p?.location),
    text(p?.currentlyWorkingRole) && text(p?.currentlyWorkingAt)
      ? `${text(p?.currentlyWorkingRole)}, ${text(p?.currentlyWorkingAt)}`
      : "",
    text(p?.availabilityText),
  ].filter(Boolean);

  return {
    identity: text(p?.name)
      ? {
          title: text(p?.name).toUpperCase(),
          body:
            text(p?.heroDescription) ||
            text(p?.bio) ||
            text(p?.headline),
          tags: identityTags,
        }
      : MISSING("identity record"),

    interests: text(p?.technicalInterests)
      ? {
          title: "DECLARED INTERESTS",
          body: flatten(text(p!.technicalInterests!)),
        }
      : MISSING("statement of technical interests"),

    ethic: text(p?.philosophy)
      ? {
          title: "WORKING PRINCIPLES",
          body: flatten(text(p!.philosophy!)),
        }
      : MISSING("statement of working principles"),

    personality: text(p?.bio)
      ? {
          title: "SUBJECT PROFILE",
          body: flatten(text(p!.bio!)),
          tags: text(p?.heroTagline) ? [text(p!.heroTagline!)] : undefined,
        }
      : MISSING("subject profile"),

    goals: text(p?.currentFocus)
      ? {
          title: "CURRENT FOCUS",
          body: flatten(text(p!.currentFocus!)),
        }
      : MISSING("statement of current focus"),

    method: text(p?.longBio)
      ? {
          title: "METHOD",
          body: flatten(text(p!.longBio!)),
        }
      : MISSING("long-form account of method"),

    // The only slot assembled rather than quoted, and it still invents
    // nothing: these are the published skill categories and their published
    // skills, counted, not characterised.
    toolkit: data.skillGroups.length
      ? {
          title: "TOOLKIT",
          body: data.skillGroups
            .map(
              (g) =>
                `${g.name}: ${g.skills.map((s) => s.name).join(", ")}`,
            )
            .join("\n"),
          tags: [
            `${data.skillGroups.length} categories`,
            `${data.skillGroups.reduce((n, g) => n + g.skills.length, 0)} entries`,
          ],
        }
      : MISSING("skills index"),

    secret: {
      title: "UNFILED — AMR-000",
      body:
        text(p?.heroTagline) ||
        text(p?.headline) ||
        "The subject left no note in this folder.",
      tags: [text(p?.email)].filter(Boolean),
    },
  };
}

/**
 * The chrome-safe read.
 *
 * This page is a game, and a game that shows a 500 because a managed database
 * went to sleep is worse than a game that opens with every card marked
 * RECORD INCOMPLETE. The placeholder path is already built and already honest,
 * so a dead database degrades into it instead of taking the route down.
 */
export async function getDossierSafe(): Promise<Dossier> {
  try {
    return await getDossier();
  } catch {
    return {
      identity: MISSING("identity record"),
      interests: MISSING("statement of technical interests"),
      ethic: MISSING("statement of working principles"),
      personality: MISSING("subject profile"),
      goals: MISSING("statement of current focus"),
      method: MISSING("long-form account of method"),
      toolkit: MISSING("skills index"),
      secret: MISSING("unfiled document"),
    };
  }
}
