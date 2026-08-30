import type { MetadataRoute } from "next";
import { getSettingsSafe } from "@/lib/content";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await getSiteUrl();
  const settings = await getSettingsSafe();

  // Honours the same seo.robots setting the meta tag reads, so the CMS cannot
  // say noindex in one place and allow-all in the other.
  const noindex = settings.get("seo.robots", "index,follow").includes("noindex");

  return {
    rules: noindex
      ? { userAgent: "*", disallow: "/" }
      : { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
