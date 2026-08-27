import Link from "next/link";
import { Telemetry, type TelemetryReadout } from "./Telemetry";
import { Reveal } from "./Reveal";

export function Hero({
  name,
  headline,
  tagline,
  description,
  resumeUrl,
  readouts,
  bootLines,
  hasProjects,
}: {
  name: string;
  headline: string;
  tagline: string;
  description: string;
  resumeUrl: string;
  readouts: TelemetryReadout[];
  bootLines: string[];
  hasProjects: boolean;
}) {
  // Positioning is stored as one string and split on the separator, so editing
  // "Full Stack Developer / Cloud & AI Engineer" in admin changes both halves.
  const positions = headline
    .split(/\s*[|/]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section
      aria-labelledby="hero-heading"
      className="mx-auto w-full max-w-[1400px] px-4 pt-16 sm:px-6 lg:px-10 lg:pt-24"
    >
      <div className="grid items-end gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
        <div>
          <Reveal>
            <p className="t-meta">
              {positions.map((position, i) => (
                <span key={position}>
                  {i > 0 ? <span className="text-[var(--accent)]"> / </span> : null}
                  {position}
                </span>
              ))}
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <h1
              id="hero-heading"
              className="t-display mt-5 text-[clamp(2.75rem,9vw,7rem)] text-[var(--fg)]"
            >
              {name}
            </h1>
          </Reveal>

          {tagline ? (
            <Reveal delay={0.12}>
              <p className="mt-6 max-w-[34ch] text-[clamp(1rem,2vw,1.375rem)] leading-snug text-[var(--fg)]">
                {tagline}
              </p>
            </Reveal>
          ) : null}

          {description ? (
            <Reveal delay={0.16}>
              <p className="mt-4 max-w-[52ch] text-[0.9375rem] leading-relaxed text-[var(--muted)]">
                {description}
              </p>
            </Reveal>
          ) : null}

          <Reveal delay={0.22}>
            <div className="mt-9 flex flex-wrap gap-3">
              {hasProjects ? (
                <Link href="/#work" className="btn btn-accent">
                  View projects
                </Link>
              ) : null}
              <Link href="/#contact" className="btn">
                Let&apos;s work together
              </Link>
              {resumeUrl ? (
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  download
                >
                  Resume
                </a>
              ) : null}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="lg:pb-2">
          <Telemetry readouts={readouts} bootLines={bootLines} />
        </Reveal>
      </div>
    </section>
  );
}
