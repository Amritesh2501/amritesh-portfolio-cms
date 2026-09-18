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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let theme: Record<string, string> = {};
  let mode = "dark";
  let effects = "";

  try {
    const settings = await getSettings();
    mode = settings.get("theme.mode", "dark");
    // The accent is the brand and applies to both modes.
    //
    // The substrate tokens are a DARK-palette customisation: injecting them
    // while mode is "light" would paint dark hexes over the light palette and
    // produce unreadable text. In light mode the CSS palette wins and only the
    // accent is injected. Documented in the README under Theme.
    theme = { "--accent": settings.get("theme.accent", "#b18cff") };

    if (mode !== "light") {
      theme["--bg"] = settings.get("theme.background", "#0d0718");
      theme["--surface"] = settings.get("theme.surface", "#170d2b");
      theme["--fg"] = settings.get("theme.foreground", "#efe7ff");
      theme["--muted"] = settings.get("theme.muted", "#a898c8");
    }
    effects = [
      settings.get("theme.scanlines", "false") === "true" ? "fx-scanlines" : "",
      settings.get("theme.grain", "true") === "true" ? "fx-grain" : "",
    ]
      .filter(Boolean)
      .join(" ");
  } catch {
    // Theme falls back to the CSS defaults in globals.css.
  }

  return (
    <html
      lang="en"
      data-mode={mode}
      className={`${sans.variable} ${jetbrains.variable} ${serif.variable}`}
      style={theme as React.CSSProperties}
      suppressHydrationWarning
    >
      <body className={effects}>{children}</body>
    </html>
  );
}
