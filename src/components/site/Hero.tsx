import Link from "next/link";
import { HeroParallax } from "./Parallax";
import { Reveal } from "./Reveal";

// Fixed seed so server and client agree and the scene never reshuffles.
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const rand = seeded(42);

const MOTES = Array.from({ length: 46 }, () => ({
  left: rand() * 100,
  top: rand() * 100,
  size: 1 + rand() * 2.4,
  dur: 9 + rand() * 14,
  delay: -rand() * 20,
}));

// Heading in degrees: 0 swims right, 180 swims left.
const FISH = [
  { left: 22, top: 18, angle: 150, size: 20, dur: 38, delay: -4 },
  { left: 60, top: 14, angle: -70, size: 14, dur: 46, delay: -20 },
  { left: 63, top: 38, angle: 110, size: 15, dur: 42, delay: -11 },
  { left: 36, top: 76, angle: 60, size: 22, dur: 34, delay: -26 },
  { left: 60, top: 75, angle: 70, size: 22, dur: 40, delay: -8 },
  { left: 92, top: 58, angle: 15, size: 18, dur: 48, delay: -30 },
  { left: 8, top: 52, angle: -80, size: 13, dur: 44, delay: -16 },
];

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
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="river-glow" />
        <div className="river-band" />
        <div className="river-cloud river-cloud-far" />
        <div className="river-cloud river-cloud-near" />
        <div className="river-fog river-fog-a" />
        <div className="river-fog river-fog-b" />

        {MOTES.map((m, i) => (
          <span
            key={i}
            className="river-mote"
            style={{
              left: `${m.left}%`,
              top: `${m.top}%`,
              width: m.size,
              height: m.size,
              animationDuration: `${m.dur}s`,
              animationDelay: `${m.delay}s`,
            }}
          />
        ))}

        {FISH.map((f, i) => (
          <span
            key={i}
            className="river-fish"
            style={{
              left: `${f.left}%`,
              top: `${f.top}%`,
              transform: `rotate(${f.angle}deg)`,
            }}
          >
            <span
              className="river-fish-swim"
              style={{ animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}
            >
              <svg
                viewBox="0 0 24 10"
                width={f.size}
                height={(f.size * 10) / 24}
                className="river-fish-body"
              >
                <ellipse cx="15" cy="5" rx="8" ry="3.4" />
                <path d="M8 5 L1 0.8 L3 5 L1 9.2 Z" />
              </svg>
            </span>
          </span>
        ))}

        <div className="river-vignette" />
      </div>

      <div className="relative mx-auto w-full max-w-[1400px] px-6 py-24 sm:px-8 lg:px-12">
        <HeroParallax depth={0.55} className="max-w-[46rem]">
          {availability?.text ? (
            <Reveal y={16} blur={false}>
              <span className="inline-flex items-center gap-2.5 text-[0.6875rem] font-medium uppercase tracking-[0.22em] text-[var(--muted)]">
                {/* Real semantic state: whether he is open to work right now. */}
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-[var(--r-full)]"
                  style={{
                    background:
                      availability.status === "OPEN" ? "#30d158" : "var(--muted)",
                  }}
                />
                {availability.text}
              </span>
            </Reveal>
          ) : null}

          <Reveal delay={0.1} y={40}>
            <h1
              id="hero-heading"
              className="t-serif mt-6 text-[clamp(3.25rem,9vw,7.5rem)] text-[var(--fg)]"
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
        className="river-scroll absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 text-[0.625rem] font-medium uppercase tracking-[0.28em] text-[var(--muted)] transition-colors hover:text-[var(--fg)] sm:left-[27%]"
      >
        Scroll
        <span aria-hidden className="river-scroll-line" />
      </a>
    </section>
  );
}
