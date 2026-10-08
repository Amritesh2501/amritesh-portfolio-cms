import type { Metadata } from "next";
import { getProjects, getSettings } from "@/lib/content";
import { getDevLog } from "@/lib/github";
import { DevLog, type DevLogEntry } from "@/components/site/DevLog";
import { Reveal } from "@/components/site/Reveal";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: "Dev log",
    description: `What ${settings.get("site.title", "the author")} has been building: new projects and recent commits, live from GitHub.`,
  };
}

/** How far back a published case study still counts as news. */
const RECENT_DAYS = 180;

/**
 * The dev log: a blog that writes itself from GitHub (new repositories and
 * pushes, refreshed every fifteen minutes) and the CMS (case studies
 * published lately). Reached from the nav, not shown on the home page.
 */
export default async function LogPage() {
  const settings = await getSettings();
  const user = settings.get("site.githubUser");
  const [gh, projects] = await Promise.all([getDevLog(user, 30), getProjects()]);

  const cut = Date.now() - RECENT_DAYS * 86400000;
  const entries: DevLogEntry[] = [
    ...gh,
    ...projects
      .filter((p) => (p.publishedAt ?? p.createdAt).getTime() >= cut)
      .map((p) => ({
        id: `case:${p.id}`,
        kind: "case-study" as const,
        repo: p.slug,
        url: `/projects/${p.slug}`,
        at: (p.publishedAt ?? p.createdAt).toISOString(),
        title: p.title,
        lines: p.shortDescription ? [p.shortDescription] : [],
        language: null,
      })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="relative isolate">
      <div className="hero-wash" aria-hidden />
      <div className="relative mx-auto w-full max-w-[1400px] px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Dev log" }]} />
        <Reveal>
          <h1 className="t-display-lg text-[clamp(2.5rem,7.5vw,5rem)]">Dev log</h1>
          <p className="t-lead mt-6 max-w-[54ch]">
            New projects, recent commits and fresh case studies, newest first. Updated from GitHub every fifteen
            minutes.
          </p>
        </Reveal>
        <div className="mt-16">
          {entries.length ? (
            <DevLog entries={entries} user={user} />
          ) : (
            <p className="text-[var(--muted)]">Nothing to show yet. Check back after the next push.</p>
          )}
        </div>
      </div>
    </div>
  );
}
