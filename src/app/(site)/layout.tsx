import { getNavigation, getProfile, getSettings } from "@/lib/content";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CommandPalette } from "@/components/site/CommandPalette";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, nav, profile] = await Promise.all([
    getSettings(),
    getNavigation("HEADER"),
    getProfile(),
  ]);

  const navItems = nav.map((item) => ({
    id: item.id,
    label: item.label,
    href: item.href,
    external: item.external,
  }));

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[var(--z-toast)] focus:border focus:border-[var(--accent)] focus:bg-[var(--bg)] focus:px-4 focus:py-2"
      >
        Skip to content
      </a>

      <SiteHeader
        logoText={settings.get("site.logoText", "AT")}
        logoImage={settings.get("site.logoImage")}
        navItems={navItems}
        availability={
          profile?.availabilityText
            ? {
                status: profile.availabilityStatus ?? "CLOSED",
                text: profile.availabilityText,
              }
            : null
        }
      />

      <main id="main" className="flex-1">
        {children}
      </main>

      <SiteFooter />
      <CommandPalette navItems={navItems} />
    </div>
  );
}
