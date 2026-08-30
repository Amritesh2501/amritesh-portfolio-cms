import type { Metadata } from "next";
import { getProjectCategories, getProjects, getSettings } from "@/lib/content";
import { ProjectGrid } from "@/components/site/ProjectGrid";
import { Reveal } from "@/components/site/Reveal";
import type { CardProject } from "@/components/site/ProjectCard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { JsonLd, breadcrumbList } from "@/components/site/JsonLd";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: "Projects",
    description: `Shipped work by ${settings.get("site.title", "the author")}.`,
  };
}

export default async function ProjectsPage() {
  const [projects, categories, base] = await Promise.all([
    getProjects(),
    getProjectCategories(),
    getSiteUrl(),
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
    <div className="relative isolate">
      <div className="hero-wash" aria-hidden />
      <div className="relative mx-auto w-full max-w-[1400px] px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <JsonLd
          data={breadcrumbList(base, [
            { name: "Home", path: "/" },
            { name: "Projects", path: "/projects" },
          ])}
        />
        <Breadcrumbs
          items={[{ name: "Home", path: "/" }, { name: "Projects" }]}
        />
        <Reveal>
          <p className="t-meta">Index</p>
          <h1 className="t-display-lg mt-5 text-[clamp(2.5rem,7.5vw,5rem)]">
            All projects
          </h1>
          <p className="t-lead mt-7 max-w-[54ch]">
            Everything currently published, newest ordering first. Filters come
            from the categories attached to each project.
          </p>
        </Reveal>

        <div className="mt-16">
          <ProjectGrid
            projects={cards}
            categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          />
        </div>
      </div>
    </div>
  );
}
