import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/content";
import { Markdown } from "@/components/site/Markdown";
import { Reveal } from "@/components/site/Reveal";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: "Now",
    description: `What ${settings.get("site.title", "the author")} is focused on right now.`,
  };
}

/**
 * A /now page (nownownow.com): what is being built, learned and read at the
 * moment. Two settings in the CMS; empty body means no page, so it never
 * goes live half-written.
 */
export default async function NowPage() {
  const settings = await getSettings();
  const body = settings.get("now.body").trim();
  if (!body) notFound();

  // The row, not the value, knows when it last changed.
  const updated = settings.all.find((r) => r.key === "now.body")?.updatedAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="relative isolate">
      <div className="hero-wash" aria-hidden />
      <div className="relative mx-auto w-full max-w-[1400px] px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Now" }]} />
        <Reveal>
          <h1 className="t-display-lg text-[clamp(2.5rem,7.5vw,5rem)]">
            {settings.get("now.title", "What I'm doing now")}
          </h1>
          {updated ? <p className="t-meta mt-6">Updated {updated}</p> : null}
        </Reveal>
        <Reveal delay={0.08} className="mt-14 max-w-[68ch]">
          <Markdown content={body} />
        </Reveal>
      </div>
    </div>
  );
}
