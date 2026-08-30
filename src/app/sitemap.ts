import type { MetadataRoute } from "next";
import { getProjects } from "@/lib/content";
import { getSiteUrl } from "@/lib/site-url";

// force-dynamic: the project list is CMS content, so a sitemap frozen at build
// time goes stale the moment something is published.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getSiteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/projects`, changeFrequency: "weekly", priority: 0.8 },
  ];

  // A dead database must not 500 the sitemap; a partial sitemap beats none.
  try {
    const projects = await getProjects();
    return [
      ...staticRoutes,
      ...projects.map((p) => ({
        url: `${base}/projects/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
