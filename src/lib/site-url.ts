import { getSettingsSafe } from "@/lib/content";

/**
 * The one place the public origin is resolved.
 *
 * Order matters: the CMS value wins so the origin can be corrected without a
 * redeploy, then the build-time env var, then localhost for dev. Everything
 * SEO-facing (canonical, sitemap, robots, llms.txt, JSON-LD) has to agree on
 * this string or crawlers see two sites.
 */
export async function getSiteUrl(): Promise<string> {
  const settings = await getSettingsSafe();
  const fromCms = settings.get("seo.canonicalUrl");
  const url =
    fromCms || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return url.replace(/\/$/, "");
}
