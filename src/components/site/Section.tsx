import { Reveal } from "./Reveal";

/**
 * The structural compartment used across the whole public site.
 *
 * The mono label in the hairline bar is the compartmentalisation device of the
 * industrial-brutalist system, not a decorative eyebrow: it is the section's
 * own heading, rendered once, in the frame rather than floating above it.
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
    <section id={id} aria-labelledby={`${id}-heading`} className="border-t border-[var(--line)]">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] py-3">
          <h2 id={`${id}-heading`} className="t-meta text-[var(--fg)]">
            {index ? <span className="text-[var(--accent)]">{index} </span> : null}
            {label}
          </h2>
          {aside ? <div className="t-meta">{aside}</div> : null}
        </div>

        {(title || intro) && (
          <Reveal className="max-w-3xl pt-10 sm:pt-14">
            {title ? (
              <p className="t-display text-[clamp(1.75rem,4.5vw,3.25rem)] text-[var(--fg)]">
                {title}
              </p>
            ) : null}
            {intro ? (
              <p className="mt-5 max-w-[62ch] text-[0.9375rem] leading-relaxed text-[var(--muted)]">
                {intro}
              </p>
            ) : null}
          </Reveal>
        )}

        <div className="py-10 sm:py-14">{children}</div>
      </div>
    </section>
  );
}

/** Consistent empty state. Every list on the site routes through this. */
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-[var(--line-strong)] px-6 py-12 text-center">
      <p className="t-meta">{children}</p>
    </div>
  );
}
