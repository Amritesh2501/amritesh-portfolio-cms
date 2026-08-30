import { Reveal } from "./Reveal";

/**
 * The structural compartment used across the public site.
 *
 * Manga page rhythm: a numbered gutter marker, the section label as an inked
 * caption, then the headline carrying the weight. The label is the section's
 * own heading rendered once, not a decorative eyebrow stacked above another
 * heading, so the document outline stays correct.
 */
export function Section({
  id,
  label,
  index,
  title,
  intro,
  children,
  aside,
}: {
  id: string;
  label: string;
  index?: string;
  title?: string;
  intro?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="relative scroll-mt-24 border-t-2 border-[var(--ink)]"
    >
      <div
        aria-hidden
        className="mg-tone pointer-events-none absolute inset-0 opacity-40"
      />
      <div className="relative mx-auto w-full max-w-[1400px] px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2
              id={`${id}-heading`}
              className="flex items-center gap-3 text-[var(--fg)]"
            >
              {index ? <span className="mg-num">{index}</span> : null}
              <span className="t-meta text-[var(--fg)]">{label}</span>
              <span
                aria-hidden
                className="hidden h-[2px] w-16 bg-[var(--ink)] sm:block"
              />
            </h2>
            {aside ? <span className="mg-caption">{aside}</span> : null}
          </div>
        </Reveal>

        {(title || intro) && (
          <Reveal delay={0.06}>
            <div className="mt-8 max-w-3xl">
              {title ? (
                <p className="t-display text-[clamp(2rem,5vw,3.5rem)] text-[var(--fg)]">
                  {title}
                </p>
              ) : null}
              {intro ? (
                <p className="t-lead mt-6 max-w-[58ch]">{intro}</p>
              ) : null}
            </div>
          </Reveal>
        )}

        <div className={title || intro ? "mt-16" : "mt-12"}>{children}</div>
      </div>
    </section>
  );
}

/** Consistent empty state. Every list on the site routes through this. */
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="mg-panel px-6 py-16 text-center">
      <p className="t-meta">{children}</p>
    </div>
  );
}
