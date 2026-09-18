import { DrawLine, Reveal } from "./Reveal";

/**
 * The structural compartment used across the public site.
 *
 * The section label IS the heading, set in display type at a size you can
 * actually read. It used to be a monospace micro-label in spaced capitals
 * behind a serif index number, which gave all five sections the same
 * templated opening bar and left the page with no typographic hierarchy
 * between "Selected work" and the body text underneath it.
 */
export function Section({
  id,
  label,
  title,
  intro,
  children,
  aside,
}: {
  id: string;
  label: string;
  title?: string;
  intro?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="relative scroll-mt-24"
    >
      <DrawLine className="mist-rule" origin={0.5} delay={0} />
      <div aria-hidden className="haze" />
      <div className="relative mx-auto w-full max-w-[1400px] px-6 py-24 sm:px-8 lg:px-12 lg:py-36">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <h2
              id={`${id}-heading`}
              className="t-display text-[clamp(2rem,4.4vw,3.25rem)] text-[var(--fg)]"
            >
              {label}
            </h2>
            {aside ? (
              <span className="t-meta pb-1.5 text-[0.625rem]">{aside}</span>
            ) : null}
          </div>
        </Reveal>

        {(title || intro) && (
          <Reveal delay={0.06}>
            <div className="mt-6 max-w-3xl">
              {title ? (
                <p className="t-serif text-[clamp(1.75rem,3.4vw,2.75rem)] text-[var(--fg-soft)]">
                  {title}
                </p>
              ) : null}
              {intro ? (
                <p className="t-lead mt-5 max-w-[58ch]">{intro}</p>
              ) : null}
            </div>
          </Reveal>
        )}

        <div className={title || intro ? "mt-20" : "mt-14"}>{children}</div>
      </div>
    </section>
  );
}

/** Consistent empty state. Every list on the site routes through this. */
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="card px-6 py-16 text-center">
      <p className="t-meta">{children}</p>
    </div>
  );
}
