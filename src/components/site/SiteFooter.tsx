import Link from "next/link";
import { getNavigation, getSettings, getSocialLinks } from "@/lib/content";

export async function SiteFooter() {
  const [settings, nav, socials] = await Promise.all([
    getSettings(),
    getNavigation("FOOTER"),
    getSocialLinks(),
  ]);

  return (
    <footer className="border-t border-[var(--line)]">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <div className="grid gap-10 py-12 md:grid-cols-[1.6fr_1fr_1fr] md:py-16">
          <div>
            <p className="t-display text-[clamp(1.5rem,3vw,2.25rem)]">
              {settings.get("site.title", "Portfolio")}
            </p>
            <p className="mt-4 max-w-[46ch] text-[0.8125rem] leading-relaxed text-[var(--muted)]">
              {settings.get("site.footerText")}
            </p>
          </div>

          {nav.length > 0 ? (
            <nav aria-label="Footer">
              <p className="t-meta border-b border-[var(--line)] pb-2">Sections</p>
              <ul className="mt-4 grid gap-2.5">
                {nav.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                      className="t-label text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {socials.length > 0 ? (
            <div>
              <p className="t-meta border-b border-[var(--line)] pb-2">Elsewhere</p>
              <ul className="mt-4 grid gap-2.5">
                {socials.map((social) => (
                  <li key={social.id}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="t-label text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--line)] py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="t-meta">{settings.get("site.copyright")}</p>
          <Link href="/admin" className="t-meta transition-colors hover:text-[var(--fg)]">
            CMS
          </Link>
        </div>
      </div>
    </footer>
  );
}
