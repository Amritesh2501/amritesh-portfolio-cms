import type { Metadata } from "next";
import { EB_Garamond, Geist, JetBrains_Mono } from "next/font/google";
import { getSettings } from "@/lib/content";
import "./globals.css";

// Geist, not Inter: the same neutral-grotesque clarity with a little more
// character in the numerals and a tighter display cut, which the big headings
// on this page live off.
const sans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

// The italic serif voice, at every size from the hero name down to a timeline
// year. EB Garamond keeps its stroke on the dark substrate, where a
// high-contrast display serif drops its hairlines and goes patchy.
const serif = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  // Falls back to static defaults if the DB is unreachable, so a dead database
  // degrades the page instead of crashing the whole render.
  let settings;
  try {
    settings = await getSettings();
  } catch {
    return { title: "Portfolio", description: "" };
  }

  const title = settings.get("seo.title", "Portfolio");
  const description = settings.get("seo.description", "");
  const canonical = settings.get("seo.canonicalUrl") || SITE_URL;
  const ogImage = settings.get("seo.ogImage");
  const favicon = settings.get("seo.favicon");
  const robots = settings.get("seo.robots", "index,follow");
  const twitterHandle = settings.get("seo.twitterHandle");

  return {
    metadataBase: new URL(canonical),
    title: { default: title, template: `%s / ${settings.get("site.title", "Portfolio")}` },
    description,
    keywords: settings
      .get("seo.keywords")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
    alternates: { canonical },
    robots: {
      index: !robots.includes("noindex"),
      follow: !robots.includes("nofollow"),
    },
    icons: favicon ? { icon: favicon } : undefined,
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: settings.get("site.title", "Portfolio"),
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card:
        settings.get("seo.twitterCard", "summary_large_image") === "summary"
          ? "summary"
          : "summary_large_image",
      title,
      description,
      creator: twitterHandle || undefined,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

/**
 * Resolves the mode before the first paint, so the page never flashes the
 * wrong palette. Order: the visitor's own choice, then the CMS default, then
 * the operating system. Kept in sync with ThemeToggle, which writes the same
 * storage key.
 */
function themeInit(defaultMode: string) {
  return `try{var d=document.documentElement,c=localStorage.getItem("theme"),m=(c==="light"||c==="dark")?c:"${defaultMode}";if(m!=="light"&&m!=="dark")m=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";d.dataset.mode=m}catch(e){document.documentElement.dataset.mode="dark"}`;
}

/**
 * Grades the device before the first paint, so the page can decide what it can
 * afford rather than starting every effect and dropping frames discovering it
 * cannot.
 *
 * Deliberately crude. These are the only signals a browser will give away for
 * free, none of them is a benchmark, and the cost of guessing low on a fast
 * machine is a slightly quieter page while the cost of guessing high on a slow
 * one is the thing this is here to prevent.
 *
 * Touch is NOT a signal on its own: a current phone outruns plenty of laptops.
 * What it does mean is a mobile GPU, which is where full-screen blend modes and
 * backdrop filters get expensive, so it counts only alongside something else.
 */
const GRADE_DEVICE = `try{
var n=navigator,m=matchMedia,w=0;
if((n.hardwareConcurrency||8)<=4)w++;
if((n.deviceMemory||8)<=4)w++;
if(n.connection&&n.connection.saveData)w+=2;
if(m("(pointer: coarse)").matches)w++;
if(m("(prefers-reduced-motion: reduce)").matches)w+=2;
if(w>=2)document.documentElement.dataset.perf="low";
}catch(e){}`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let accent = "#b18cff";
  let defaultMode = "dark";
  let darkPalette = "";
  let effects = "";

  try {
    const settings = await getSettings();
    // "system" is allowed here as well as "dark" and "light": it hands the
    // choice to the operating system.
    defaultMode = settings.get("theme.mode", "dark");
    // The accent is the brand and applies to both modes, so it is the one
    // token that stays inline.
    accent = settings.get("theme.accent", "#b18cff");

    // The substrate tokens are a DARK-palette customisation, so they are
    // scoped to the dark mode rather than written inline on <html>. Inline
    // styles beat every stylesheet rule, so injecting them flat used to paint
    // dark hexes straight over the light palette the moment anyone switched.
    darkPalette = `:root[data-mode="dark"]{--bg:${settings.get("theme.background", "#0d0718")};--surface:${settings.get("theme.surface", "#170d2b")};--fg:${settings.get("theme.foreground", "#efe7ff")};--muted:${settings.get("theme.muted", "#a898c8")}}`;

    effects = [
      settings.get("theme.scanlines", "false") === "true" ? "fx-scanlines" : "",
      settings.get("theme.grain", "true") === "true" ? "fx-grain" : "",
    ]
      .filter(Boolean)
      .join(" ");
  } catch {
    // Theme falls back to the CSS defaults in globals.css.
  }

  // The server cannot know the visitor's stored choice, so it renders the CMS
  // default and the script above corrects it before paint. That is a
  // deliberate mismatch, hence suppressHydrationWarning.
  const ssrMode = defaultMode === "light" ? "light" : "dark";

  return (
    <html
      lang="en"
      data-mode={ssrMode}
      className={`${sans.variable} ${jetbrains.variable} ${serif.variable}`}
      style={{ "--accent": accent } as React.CSSProperties}
      suppressHydrationWarning
    >
      <head>
        {darkPalette ? (
          <style dangerouslySetInnerHTML={{ __html: darkPalette }} />
        ) : null}
        <script dangerouslySetInnerHTML={{ __html: themeInit(defaultMode) }} />
        <script dangerouslySetInnerHTML={{ __html: GRADE_DEVICE }} />
      </head>
      <body className={effects}>{children}</body>
    </html>
  );
}
