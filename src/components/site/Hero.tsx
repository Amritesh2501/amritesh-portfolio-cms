import Link from "next/link";
import { Telemetry, type TelemetryReadout } from "./Telemetry";
import { HeroParallax } from "./Parallax";
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
  availability,
}: {
  name: string;
  headline: string;
  tagline: string;
  description: string;
  resumeUrl: string;
  readouts: TelemetryReadout[];
  bootLines: string[];
  hasProjects: boolean;
  availability: { status: string; text: string } | null;
}) {
  // Positioning is one CMS string split on its separator, so editing
  // "Full Stack Developer | Cloud & AI Engineer" in admin changes both halves.
  const positions = headline
    .split(/\s*[|/]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden"
    >
      <div className="hero-wash" aria-hidden />

      <div
        aria-hidden
        className="mg-speed mg-speed-spin pointer-events-none absolute inset-0"
      />
      <div className="relative mx-auto w-full max-w-[1400px] px-6 pb-20 pt-20 sm:px-8 lg:px-12 lg:pb-28 lg:pt-24">
        <div className="grid items-center gap-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <HeroParallax depth={0.55}>
            {availability?.text ? (
              <Reveal y={16} blur={false}>
                <span className="inline-flex items-center gap-2.5 border-2 border-[var(--ink)] bg-[var(--surface)] px-3.5 py-1.5 shadow-[4px_4px_0_0_var(--ink)]">
                  {/* Real semantic state: whether he is open to work right now. */}
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5"
                    style={{
                      background:
                        availability.status === "OPEN" ? "#30d158" : "var(--muted)",
                    }}
                  />
                  <span className="text-[0.8125rem] font-medium tracking-[-0.01em] text-[var(--fg)]">
                    {availability.text}
                  </span>
                </span>
              </Reveal>
            ) : null}

            <Reveal delay={0.06}>
              <h1
                id="hero-heading"
                className="t-display-lg mt-7 text-[clamp(3rem,8.5vw,6.5rem)] text-[var(--fg)]"
              >
                {name}
              </h1>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[clamp(1rem,1.8vw,1.25rem)] font-medium tracking-[-0.018em] text-[var(--fg)]">
                {positions.map((position, i) => (
                  <span key={position} className="flex items-center gap-3">
                    {i > 0 ? (
                      <span
                        aria-hidden
                        className="h-1 w-1 rounded-[var(--r-full)] bg-[var(--accent)]"
                      />
                    ) : null}
                    {position}
                  </span>
                ))}
              </p>
            </Reveal>

            {tagline ? (
              <Reveal delay={0.18}>
                <p className="mg-bubble mt-8 max-w-[42ch] !text-[0.8125rem] !leading-[1.7]">
                  {tagline}
                </p>
              </Reveal>
            ) : null}

            {description ? (
              <Reveal delay={0.24}>
                <p className="mt-5 max-w-[52ch] text-[1.0625rem] leading-relaxed tracking-[-0.014em] text-[var(--muted)]">
                  {description}
                </p>
              </Reveal>
            ) : null}

            <Reveal delay={0.3} blur={false}>
              <div className="mt-10 flex flex-wrap gap-3">
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
          </HeroParallax>

          {/* Slower layer, so the panel settles behind the headline on scroll. */}
          <HeroParallax depth={1.15} className="lg:pt-6">
            <Reveal delay={0.16} y={36}>
              <Telemetry readouts={readouts} bootLines={bootLines} />
            </Reveal>
          </HeroParallax>
        </div>
      </div>
    </section>
  );
}
