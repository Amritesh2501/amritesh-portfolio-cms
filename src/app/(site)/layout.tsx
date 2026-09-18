import { getNavigationSafe, getSettingsSafe } from "@/lib/content";
import { SiteHeader } from "@/components/site/SiteHeader";
import { CommandPalette } from "@/components/site/CommandPalette";
import { BootScreen } from "@/components/site/BootScreen";
import { ScrollProgress } from "@/components/site/Parallax";
import { HoverFx } from "@/components/site/HoverFx";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import { SiteMist } from "@/components/site/SiteMist";

// Runs before first paint. When a page is framed (the project card previews
// load case study pages into a window), it drops the site chrome and skips the
// intro so the frame shows only the page.
const MARK_EMBED = `try{if(window.top!==window.self){var d=document.documentElement.dataset;d.embed="1";d.intro="seen"}}catch(e){}`;

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Safe variants: an error thrown in a layout bubbles past this segment
  // error boundary, so a database blip here would replace the whole site with
  // a bare 500. The shell degrades instead, and the page below still surfaces
  // the failure through error.tsx.
  const [settings, nav] = await Promise.all([
    getSettingsSafe(),
    getNavigationSafe("HEADER"),
  ]);

  const navItems = nav.map((item) => ({
    id: item.id,
    label: item.label,
    href: item.href,
    external: item.external,
  }));

  return (
    <div className="fx relative flex min-h-[100dvh] flex-col">
      <script dangerouslySetInnerHTML={{ __html: MARK_EMBED }} />
      <div aria-hidden className="page-wash" />
      <SiteMist />
      <HoverFx />
      <SmoothScroll />

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
      />

      <main id="main" className="flex-1">
        {children}
      </main>

      <CommandPalette navItems={navItems} />
    </div>
  );
}
