import {
  getNavigationSafe,
  getProfileSafe,
  getSettingsSafe,
} from "@/lib/content";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CommandPalette } from "@/components/site/CommandPalette";
import { BootScreen } from "@/components/site/BootScreen";
import { ScrollProgress } from "@/components/site/Parallax";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Safe variants: an error thrown in a layout bubbles past this segment
  // error boundary, so a database blip here would replace the whole site with
  // a bare 500. The shell degrades instead, and the page below still surfaces
  // the failure through error.tsx.
  const [settings, nav, profile] = await Promise.all([
    getSettingsSafe(),
    getNavigationSafe("HEADER"),
    getProfileSafe(),
  ]);

  const navItems = nav.map((item) => ({
    id: item.id,
    label: item.label,
    href: item.href,
    external: item.external,
  }));

  const availability = profile?.availabilityText
    ? {
        status: profile.availabilityStatus ?? "CLOSED",
        text: profile.availabilityText,
      }
    : null;

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      {settings.get("site.showIntro", "true") === "true" ? (
        <BootScreen
          logoText={settings.get("site.logoText", "AT")}
          name={settings.get("site.title", "Portfolio")}
        />
      ) : null}

      <ScrollProgress />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-[var(--z-toast)] focus:rounded-[var(--r-full)] focus:border focus:border-[var(--accent)] focus:bg-[var(--bg)] focus:px-4 focus:py-2"
      >
        Skip to content
      </a>

      <SiteHeader
        logoText={settings.get("site.logoText", "AT")}
        logoImage={settings.get("site.logoImage")}
        navItems={navItems}
        availability={availability}
      />

      <main id="main" className="flex-1">
        {children}
      </main>

      <SiteFooter />
      <CommandPalette navItems={navItems} />
    </div>
  );
}
