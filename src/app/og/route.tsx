import { ImageResponse } from "next/og";
import { getProfileSafe, getProjectBySlug, getSettings } from "@/lib/content";
import { plainText } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const W = 1200;
const H = 630;

// The site's dark palette, fixed: a share card is seen out of context, where
// there is no theme preference to follow.
const BG = "#0d0718";
const INK = "#efe7ff";
const MUTED = "#a99bc7";
const ACCENT = "#b08ef0";

/**
 * Social share cards, drawn on request: GET /og for the site, /og?slug=x for a
 * project. Used as the share image wherever no image was uploaded for that
 * purpose, and for every project, so a link pasted into Slack or LinkedIn
 * shows the title and a picture instead of a blank box.
 *
 * Cached for a day at the edge; CMS edits show on shares after that (most
 * platforms cache cards for longer anyway).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  let kicker = "";
  let title = "Portfolio";
  let line = "";
  let picture: string | null = null;

  try {
    const [settings, profile] = await Promise.all([getSettings(), getProfileSafe()]);
    kicker = settings.get("site.title", profile?.name ?? "");
    if (slug) {
      const project = await getProjectBySlug(slug);
      if (project) {
        title = project.title;
        line = plainText(project.shortDescription, 140);
        picture = project.heroImage ?? project.thumbnail ?? null;
        kicker = `${kicker} · Case study`;
      }
    } else {
      title = profile?.name ?? kicker;
      line = profile?.headline ?? settings.get("seo.description");
    }
  } catch {
    /* draw the plain card */
  }

  // The renderer reads PNG and JPEG; anything else (WebP, SVG) is left off
  // rather than failing the whole card.
  const src = picture && /\.(png|jpe?g)$/i.test(picture) ? new URL(picture, url.origin).toString() : null;

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", background: BG, color: INK }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "72px 64px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 26, color: MUTED }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: ACCENT }} />
            {kicker}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ fontSize: title.length > 40 ? 58 : 72, lineHeight: 1.05, fontWeight: 700, letterSpacing: -1.5 }}>
              {title}
            </div>
            {line ? <div style={{ fontSize: 28, lineHeight: 1.35, color: MUTED, maxWidth: 640 }}>{line}</div> : null}
          </div>
          <div style={{ display: "flex", width: 120, height: 6, borderRadius: 3, background: ACCENT }} />
        </div>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" width={460} height={H} style={{ objectFit: "cover", width: 460, height: H }} />
        ) : null}
      </div>
    ),
    {
      width: W,
      height: H,
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
    },
  );
}
