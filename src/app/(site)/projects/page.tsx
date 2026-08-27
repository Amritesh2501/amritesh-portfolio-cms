import type { Metadata } from "next";
import { getProjectCategories, getProjects, getSettings } from "@/lib/content";
import { ProjectGrid } from "@/components/site/ProjectGrid";
import { Reveal } from "@/components/site/Reveal";
import type { CardProject } from "@/components/site/ProjectCard";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: "Projects",
    description: `Shipped work by ${settings.get("site.title", "the author")}.`,
  };
}

export default async function ProjectsPage() {
  const [projects, categories] = await Promise.all([
    getProjects(),
    getProjectCategories(),
  ]);

  const cards: CardProject[] = projects.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    shortDescription: p.shortDescription,
    thumbnail: p.thumbnail,
    year: p.year,
    lifecycle: p.lifecycle,
    featured: p.featured,
    categoryName: p.category?.name ?? null,
    categorySlug: p.category?.slug ?? null,
    technologies: p.technologies.map((t) => t.name),
    metrics: p.metrics.map((m) => ({ value: m.value, label: m.label })),
  }));

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
      <Reveal>
        <p className="t-meta">Index</p>
        <h1 className="t-display mt-4 text-[clamp(2.5rem,8vw,5.5rem)]">
          All projects
        </h1>
        <p className="mt-5 max-w-[52ch] text-[0.9375rem] leading-relaxed text-[var(--muted)]">
          Everything currently published, newest ordering first. Filters come
          from the categories attached to each project.
        </p>
      </Reveal>

      <div className="mt-14">
        <ProjectGrid
          projects={cards}
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        />
      </div>
    </div>
  );
}
