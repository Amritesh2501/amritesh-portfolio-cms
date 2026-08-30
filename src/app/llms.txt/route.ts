import { getProfileSafe, getSettingsSafe } from "@/lib/content";
import { getProjects } from "@/lib/content";
import { getSiteUrl } from "@/lib/site-url";

// https://llmstxt.org — a plain-markdown map of the site for language models.
// Served from a route rather than public/ for the same reason the sitemap is
// dynamic: it is CMS content, and a file written at build time goes stale.
export const dynamic = "force-dynamic";

/** Collapse markdown/HTML to one clean line, capped. */
function line(input: string | null | undefined, max = 200): string {
  if (!input) return "";
  const text = input
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`>[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export async function GET() {
  const base = await getSiteUrl();
  const [settings, profile] = await Promise.all([
    getSettingsSafe(),
    getProfileSafe(),
  ]);

  const name = profile?.name || settings.get("site.title", "Portfolio");
  const role = profile?.headline ? ` — ${line(profile.headline, 120)}` : "";
  const summary = line(
    settings.get("seo.description") || profile?.bio,
    300,
  );

  const parts: string[] = [`# ${name}${role}`, ""];
  if (summary) parts.push(`> ${summary}`, "");

  parts.push(
    "## Pages",
    "",
    `- [Home](${base}): profile, skills, experience and selected work.`,
    `- [Projects](${base}/projects): full list of published projects.`,
    "",
  );

  try {
    const projects = await getProjects();
    if (projects.length) {
      parts.push("## Projects", "");
      for (const p of projects) {
        const desc = line(p.shortDescription, 160);
        parts.push(
          `- [${p.title}](${base}/projects/${p.slug})${desc ? `: ${desc}` : ""}`,
        );
      }
      parts.push("");
    }
  } catch {
    // Database down. The page list above is still useful on its own.
  }

  parts.push(
    "## Notes",
    "",
    "- /admin is the private CMS and is disallowed in robots.txt.",
    `- Canonical origin: ${base}`,
    "",
  );

  return new Response(parts.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
