import Link from "next/link";
import { HeroParallax } from "./Parallax";
import { Reveal } from "./Reveal";
import { RiverScene } from "./RiverScene";

/**
 * Four things and nothing else: what he does, who he is, one line, two ways
 * in. The availability flag lives in the header and again in Contact, the
 * longer description opens About, and the "Scroll" cue is gone: a full-height
 * hero over a moving river already reads as the top of a page.
 */
export function Hero({
  name,
  headline,
  tagline,
  resumeUrl,
  hasProjects,
}: {
  name: string;
  headline: string;
  tagline: string;
  resumeUrl: string;
  hasProjects: boolean;
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

      <div className="relative mx-auto w-full max-w-[1400px] px-6 pt-20 pb-24 sm:px-8 lg:px-12">
        <HeroParallax depth={0.55} className="max-w-[46rem]">
          {positions.length > 0 ? (
            <Reveal afterIntro y={16}>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.75rem] font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
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

          <Reveal afterIntro delay={0.12} y={40}>
            <h1
              id="hero-heading"
              className="t-serif mt-5 text-[clamp(3.25rem,9vw,7rem)] text-[var(--fg)]"
            >
              {name}
            </h1>
          </Reveal>

          {tagline ? (
            <Reveal afterIntro delay={0.26}>
              <p className="mt-6 max-w-[38ch] text-[clamp(1.0625rem,1.7vw,1.375rem)] leading-relaxed tracking-[-0.016em] text-[var(--fg-soft)]">
                {tagline}
              </p>
            </Reveal>
          ) : null}

          <Reveal afterIntro delay={0.38}>
            <div className="mt-10 flex flex-wrap gap-3">
              {hasProjects ? (
                <Link href="/#work" className="btn btn-solid">
                  View projects
                </Link>
              ) : (
                <Link href="/#contact" className="btn btn-solid">
                  Get in touch
                </Link>
              )}
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
    </section>
  );
}
