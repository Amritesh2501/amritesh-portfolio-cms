import Link from "next/link";
import { HeroParallax } from "./Parallax";
import { Reveal } from "./Reveal";
import { RiverScene } from "./RiverScene";

export function Hero({
  name,
  headline,
  tagline,
  description,
  resumeUrl,
  hasProjects,
  availability,
}: {
  name: string;
  headline: string;
  tagline: string;
  description: string;
  resumeUrl: string;
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
      className="river relative isolate -mt-16 flex min-h-[100dvh] items-center overflow-hidden pt-16"
    >
      <RiverScene />

      <div className="relative mx-auto w-full max-w-[1400px] px-6 py-24 sm:px-8 lg:px-12">
        <HeroParallax depth={0.55} className="max-w-[46rem]">
          {availability?.text ? (
            <Reveal y={16} blur={false}>
              <span className="chip">
                {/* Real semantic state: whether he is open to work right now. */}
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-[var(--r-full)]"
                  style={{
                    background:
                      availability.status === "OPEN" ? "#30d158" : "var(--muted)",
                    boxShadow:
                      availability.status === "OPEN" ? "0 0 8px #30d158" : "none",
                  }}
                />
                {availability.text}
              </span>
            </Reveal>
          ) : null}

          <Reveal delay={0.1} y={40}>
            <h1
              id="hero-heading"
              className="t-serif mt-6 text-[clamp(3.25rem,9vw,7.5rem)] text-[var(--fg)] [text-shadow:0_0_40px_rgba(190,150,255,0.35)]"
            >
              {name}
            </h1>
          </Reveal>

          {positions.length > 0 ? (
            <Reveal delay={0.22}>
              <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.75rem] font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
                {positions.map((position, i) => (
                  <span key={position} className="flex items-center gap-4">
                    {i > 0 ? (
                      <span aria-hidden className="h-px w-6 bg-[var(--line-strong)]" />
                    ) : null}
                    {position}
                  </span>
                ))}
              </p>
            </Reveal>
          ) : null}

          {tagline ? (
            <Reveal delay={0.34}>
              <p className="t-serif mt-10 max-w-[30ch] text-[clamp(1.5rem,2.6vw,2.125rem)] text-[var(--fg-soft)]">
                {tagline}
              </p>
            </Reveal>
          ) : null}

          {description ? (
            <Reveal delay={0.44}>
              <p className="mt-5 max-w-[52ch] text-[1.0625rem] leading-relaxed tracking-[-0.014em] text-[var(--muted)]">
                {description}
              </p>
            </Reveal>
          ) : null}

          <Reveal delay={0.54} blur={false}>
            <div className="mt-10 flex flex-wrap gap-3">
              {hasProjects ? (
                <Link href="/#work" className="btn btn-solid">
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
      </div>

      <a
        href="#work"
        className="keep-motion absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 text-[0.625rem] font-medium uppercase tracking-[0.28em] text-[var(--muted)] transition-colors hover:text-[var(--fg)] sm:left-[27%]"
      >
        Scroll
        <span aria-hidden className="river-scroll-line" />
      </a>
    </section>
  );
}
