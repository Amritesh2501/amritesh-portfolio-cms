import type { Metadata } from "next";
import { getSettings } from "@/lib/content";
import { ExperimentsIntro } from "@/components/site/ExperimentsIntro";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // The page itself needs no database at all, so a blip must not take it down
  // with the rest of the site. The name is the only thing read here and it is
  // only used in a description, so losing it costs nothing worth a 500.
  let name = "the author";
  try {
    name = (await getSettings()).get("site.title", name);
  } catch {
    /* falls through to the generic description */
  }

  return {
    title: "Experiments",
    description: `Work in progress from ${name}: the portfolio as something you play rather than scroll.`,
    // Nothing here to index yet, and a page that is mostly a promise is not
    // what anyone should land on from a search.
    robots: { index: false, follow: true },
  };
}

/**
 * Black, whatever the site palette is.
 *
 * Deliberately outside the (site) route group, so it gets the root layout and
 * nothing else: no header, no fog, no back-to-top, and above all no intro.
 * The tab is supposed to open black and start typing, and sitting through
 * four seconds of lavender first would undercut the one thing the page is
 * trying to say.
 *
 * It is also the one place the theme lock is broken on purpose. A terminal
 * that politely matched a light-mode preference would not read as having left
 * the portfolio. The wrapper pins its own tokens rather than touching
 * data-mode, so nothing is fighting the toggle.
 */
export default function ExperimentsPage() {
  return <ExperimentsIntro />;
}
