import type { Metadata } from "next";
import "./files.css";
import { getDossierSafe } from "@/lib/files/dossier";
import { getProfileSafe } from "@/lib/content";
import { TheFiles } from "@/components/files/TheFiles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Amritesh Files",
  description:
    "An interactive case file. The portfolio is in here, but it has to be investigated rather than scrolled.",
  // A game that only makes sense played is not what anyone should land on
  // from a search, and its text is the portfolio's text second-hand.
  robots: { index: false, follow: true },
};

/**
 * Deliberately outside the (site) route group, for the same reason
 * /experiments is: it gets the root layout and nothing else. No header, no
 * fog, no back-to-top, and above all no site intro — the first frame is meant
 * to be black and typing, and four seconds of lavender in front of it would
 * undercut the one thing the page is trying to say.
 *
 * The reads are the safe variants. This page is a game, and a game that
 * answers a sleeping database with a 500 is worse than one that opens with
 * its records marked RECORD INCOMPLETE — which is a state the evidence cards
 * are already built to show.
 */
export default async function FilesPage() {
  const [dossier, profile] = await Promise.all([
    getDossierSafe(),
    getProfileSafe(),
  ]);

  return <TheFiles dossier={dossier} resumeUrl={profile?.resumeUrl ?? null} />;
}
