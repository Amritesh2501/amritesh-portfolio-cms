import Link from "next/link";
import {
  getNavigationSafe,
  getSettingsSafe,
  getSocialLinksSafe,
} from "@/lib/content";

export async function SiteFooter() {
  // Rendered inside the layout, so it degrades rather than throwing. See the
  // note on the safe readers in lib/content.ts.
  const [settings, nav, socials] = await Promise.all([
    getSettingsSafe(),
    getNavigationSafe("FOOTER"),
    getSocialLinksSafe(),
  ]);

  return (
    <footer className="border-t border-[var(--line)]">
      <div className="mx-auto w-full max-w-[1400px] px-6 sm:px-8 lg:px-12">
        <div className="grid gap-12 py-16 md:grid-cols-[1.6fr_1fr_1fr] md:py-20">
          <div>
            <p className="t-display text-[clamp(1.5rem,3vw,2rem)]">
              {settings.get("site.title", "Portfolio")}
            </p>
            <p className="mt-4 max-w-[46ch] text-[0.9375rem] leading-relaxed tracking-[-0.012em] text-[var(--muted)]">
              {settings.get("site.footerText")}
            </p>
          </div>

          {nav.length > 0 ? (
            <nav aria-label="Footer">
              <p className="t-meta text-[0.5625rem]">Sections</p>
              <ul className="mt-5 grid gap-3">
                {nav.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                      className="text-[0.9375rem] tracking-[-0.012em] text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
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
              <p className="t-meta text-[0.5625rem]">Elsewhere</p>
              <ul className="mt-5 grid gap-3">
                {socials.map((social) => (
                  <li key={social.id}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[0.9375rem] tracking-[-0.012em] text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--line)] py-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="t-meta text-[0.5625rem]">{settings.get("site.copyright")}</p>
          <Link
            href="/admin"
            className="t-meta text-[0.5625rem] transition-colors hover:text-[var(--fg)]"
          >
            CMS
          </Link>
        </div>
      </div>
    </footer>
  );
}
