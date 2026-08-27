import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { getSettings } from "@/lib/content";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains",
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
    theme = {
      "--bg": settings.get("theme.background", "#0a0a0a"),
      "--surface": settings.get("theme.surface", "#121212"),
      "--fg": settings.get("theme.foreground", "#eaeaea"),
      "--muted": settings.get("theme.muted", "#8a8a8a"),
      "--accent": settings.get("theme.accent", "#ff2a2a"),
    };
    effects = [
      settings.get("theme.scanlines", "true") === "true" ? "fx-scanlines" : "",
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
      className={`${archivo.variable} ${jetbrains.variable}`}
      style={theme as React.CSSProperties}
      suppressHydrationWarning
    >
      <body className={effects}>{children}</body>
    </html>
  );
}
