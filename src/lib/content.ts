import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";

/**
 * The only place the public site reads from Postgres.
 *
 * Every query here filters `status: "PUBLISHED"`, so a draft can never leak
 * onto the public site by a page forgetting a where-clause. Admin screens use
 * Prisma directly and see everything.
 *
 * `cache()` dedupes within a single render pass: the header, hero and footer
 * all ask for settings and only one query goes out.
 */

const PUBLISHED = { status: "PUBLISHED" } as const;

export const getProfile = cache(async () => {
  return prisma.profile.findFirst({
    where: PUBLISHED,
    orderBy: { createdAt: "asc" },
  });
});

export const getSettings = cache(async () => {
  const rows = await prisma.siteSetting.findMany({
    orderBy: [{ group: "asc" }, { displayOrder: "asc" }],
  });
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return {
    all: rows,
    get: (key: string, fallback = "") => map[key] ?? fallback,
    map,
  };
});

/**
 * Chrome-safe reads.
 *
 * The header and footer are rendered by a layout, and an error thrown inside a
 * layout bubbles PAST that segment error boundary. Left unguarded, a database
 * blip therefore replaces the whole site with a bare 500 instead of showing the
 * shell plus an explanation. These variants degrade to empty rather than throw;
 * page-level reads still throw, so a genuine failure is never silently hidden.
 */
export async function getSettingsSafe() {
  try {
    return await getSettings();
  } catch {
    const empty: Record<string, string> = {};
    return {
      all: [] as Awaited<ReturnType<typeof getSettings>>["all"],
      get: (_key: string, fallback = "") => fallback,
      map: empty,
    };
  }
}

export async function getNavigationSafe(location: "HEADER" | "FOOTER") {
  try {
    return await getNavigation(location);
  } catch {
    return [];
  }
}

export async function getProfileSafe() {
  try {
    return await getProfile();
  } catch {
    return null;
  }
}

export async function getSocialLinksSafe() {
  try {
    return await getSocialLinks();
  } catch {
    return [];
  }
}

export const getNavigation = cache(async (location: "HEADER" | "FOOTER") => {
  return prisma.navigationItem.findMany({
    where: {
      visible: true,
      location: { in: [location, "BOTH"] },
    },
    orderBy: { displayOrder: "asc" },
  });
});

export const getSocialLinks = cache(async () => {
  return prisma.socialLink.findMany({
    where: { ...PUBLISHED, enabled: true },
    orderBy: { displayOrder: "asc" },
  });
});

export const getProjects = cache(async () => {
  return prisma.project.findMany({
    where: PUBLISHED,
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    include: {
      category: true,
      technologies: { orderBy: { displayOrder: "asc" } },
      metrics: { orderBy: { displayOrder: "asc" } },
    },
  });
});

export const getProjectBySlug = cache(async (slug: string) => {
  return prisma.project.findFirst({
    where: { slug, ...PUBLISHED },
    include: {
      category: true,
      technologies: { orderBy: { displayOrder: "asc" } },
      metrics: { orderBy: { displayOrder: "asc" } },
      gallery: { orderBy: { displayOrder: "asc" } },
    },
  });
});

/** Categories that actually have a published project. No empty filter chips. */
export const getProjectCategories = cache(async () => {
  return prisma.projectCategory.findMany({
    where: {
      ...PUBLISHED,
      projects: { some: PUBLISHED },
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
});

export const getExperience = cache(async () => {
  return prisma.experience.findMany({
    where: PUBLISHED,
    orderBy: [{ displayOrder: "asc" }, { startDate: "desc" }],
    include: { technologies: { orderBy: { displayOrder: "asc" } } },
  });
});

export const getEducation = cache(async () => {
  return prisma.education.findMany({
    where: PUBLISHED,
    orderBy: [{ displayOrder: "asc" }, { startDate: "desc" }],
  });
});

/** Grouped by category, and categories with no published skill are dropped. */
export const getSkillGroups = cache(async () => {
  const categories = await prisma.skillCategory.findMany({
    where: { ...PUBLISHED, skills: { some: PUBLISHED } },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: {
      skills: {
        where: PUBLISHED,
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      },
    },
  });
  return categories;
});

export const getCertifications = cache(async () => {
  return prisma.certification.findMany({
    where: PUBLISHED,
    orderBy: [{ displayOrder: "asc" }, { issueDate: "desc" }],
  });
});

export const getAchievements = cache(async () => {
  return prisma.achievement.findMany({
    where: PUBLISHED,
    orderBy: { displayOrder: "asc" },
  });
});

/** Everything the home page needs, in one round trip fan-out. */
export async function getHomeData() {
  const [
    profile,
    settings,
    projects,
    categories,
    experience,
    education,
    skillGroups,
    certifications,
    achievements,
    socials,
  ] = await Promise.all([
    getProfile(),
    getSettings(),
    getProjects(),
    getProjectCategories(),
    getExperience(),
    getEducation(),
    getSkillGroups(),
    getCertifications(),
    getAchievements(),
    getSocialLinks(),
  ]);

  return {
    profile,
    settings,
    projects,
    categories,
    experience,
    education,
    skillGroups,
    certifications,
    achievements,
    socials,
  };
}

export type HomeData = Awaited<ReturnType<typeof getHomeData>>;
export type PublicProject = HomeData["projects"][number];
export type ProjectDetail = NonNullable<
  Awaited<ReturnType<typeof getProjectBySlug>>
>;
