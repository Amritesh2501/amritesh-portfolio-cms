import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/content";
import { Reveal } from "@/components/site/Reveal";
import { Arrow } from "@/components/site/Arrow";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: "Experiments",
    description: `Work in progress from ${settings.get("site.title", "the author")}: the portfolio as something you play rather than scroll.`,
    // Nothing here to index yet, and a page that is mostly a promise is not
    // what anyone should land on from a search.
    robots: { index: false, follow: true },
  };
}

export default function ExperimentsPage() {
  return (
    <div className="relative isolate">
      <div className="hero-wash" aria-hidden />
      <div className="relative mx-auto w-full max-w-[1400px] px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Experiments" }]} />

        <Reveal>
          <h1 className="t-display-lg max-w-[16ch] text-[clamp(2.5rem,7.5vw,5rem)]">
            The portfolio, taken apart
          </h1>
        </Reveal>

        <Reveal delay={0.08}>
          <p className="t-lead mt-8 max-w-[58ch]">
            This section is being built as something you play rather than
            something you scroll. Expect minigames, small puzzles, and pieces of
            the portfolio scattered across them: solve one and you get a piece
            back, and the whole thing only assembles once you have found them
            all.
          </p>
        </Reveal>

        <Reveal delay={0.16}>
          <p className="mt-6 max-w-[58ch] text-[1rem] leading-relaxed tracking-[-0.012em] text-[var(--muted)]">
            None of it is here yet. This page exists so the idea is written down
            somewhere other than a notes file, and so there is a link to send
            people when they ask what is next.
          </p>
        </Reveal>

        <Reveal delay={0.24}>
          <div className="mt-14 flex flex-wrap items-center gap-6">
            <Link href="/" className="btn btn-solid">
              Back to the portfolio
            </Link>
            <Link
              href="/#contact"
              className="group inline-flex items-center gap-3 text-[0.9375rem] font-medium tracking-[-0.01em] text-[var(--fg)]"
            >
              <span className="work-cta">Tell me what to build first</span>
              <span aria-hidden className="arrow-ring h-9 w-9 text-[0.9375rem]">
                <Arrow />
              </span>
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
