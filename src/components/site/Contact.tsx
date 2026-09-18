import type { HomeData } from "@/lib/content";
import { ContactForm, CopyButton } from "./ContactForm";
import { Reveal } from "./Reveal";

/**
 * Contact as the close of the page: a large serif invitation, the direct
 * routes (email with copy, socials, status) on one side and the form in a
 * glass panel on the other, with ripples spreading faintly behind.
 */
export function Contact({
  heading,
  blurb,
  email,
  socials,
  location,
  availability,
}: {
  heading: string;
  blurb: string;
  email: string;
  socials: HomeData["socials"];
  location: string | null;
  availability: { status: string; text: string } | null;
}) {
  return (
    <div className="relative">
      <div aria-hidden className="contact-ripples" />

      <Reveal>
        <p className="t-serif max-w-[15ch] pb-1 text-[clamp(2.75rem,7vw,5.5rem)] leading-[1.1] text-[var(--fg)]">
          {heading}
        </p>
      </Reveal>
      {blurb ? (
        <Reveal delay={0.08}>
          <p className="t-lead mt-6 max-w-[52ch]">{blurb}</p>
        </Reveal>
      ) : null}

      <div className="mt-16 grid gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <div className="grid content-start gap-12">
          {email ? (
            <Reveal delay={0.1}>
              <p className="t-label text-[var(--muted)]">
                Write directly
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
                <a
                  href={`mailto:${email}`}
                  className="u-link t-serif break-all text-[clamp(1.625rem,3vw,2.375rem)] leading-tight text-[var(--fg)]"
                >
                  {email}
                </a>
                <CopyButton value={email} />
              </div>
            </Reveal>
          ) : null}

          {socials.length > 0 ? (
            <Reveal delay={0.16}>
              <p className="t-label text-[var(--muted)]">
                Elsewhere
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {socials.map((social) => (
                  <li key={social.id}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm group"
                    >
                      {social.label}
                      <span
                        aria-hidden
                        className="text-[var(--accent-ink)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      >
                        &#8599;
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>
          ) : null}

          {availability || location ? (
            <Reveal delay={0.22}>
              <dl className="grid gap-6 border-t border-[var(--line)] pt-8 sm:grid-cols-2">
                {availability ? (
                  <div>
                    <dt className="t-meta text-[0.6875rem]">Status</dt>
                    <dd className="mt-2.5 flex items-center gap-2.5 text-[0.9375rem] text-[var(--fg)]">
                      <span
                        aria-hidden
                        className={`status-dot ${availability.status === "OPEN" ? "is-open" : ""}`}
                      />
                      {availability.text}
                    </dd>
                  </div>
                ) : null}
                {location ? (
                  <div>
                    <dt className="t-meta text-[0.6875rem]">Based in</dt>
                    <dd className="mt-2.5 text-[0.9375rem] text-[var(--fg)]">{location}</dd>
                  </div>
                ) : null}
              </dl>
            </Reveal>
          ) : null}
        </div>

        <Reveal delay={0.12}>
          <div className="card contact-panel p-6 sm:p-10">
            <p className="t-serif pb-1 text-[2rem] leading-[1.1] text-[var(--fg)]">Send a message</p>
            <div className="mt-8">
              <ContactForm />
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
