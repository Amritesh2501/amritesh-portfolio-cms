import Link from "next/link";
import { Arrow } from "./Arrow";
import { RevealGroup, RevealItem } from "./Reveal";
import type { CardProject } from "./ProjectCard";
import { imgProps } from "@/lib/img";

const STATUS: Record<string, string> = {
  LIVE: "Live",
  IN_DEVELOPMENT: "In development",
  ARCHIVED: "Archived",
  PRIVATE: "Private",
  COMING_SOON: "Coming soon",
};

/**
 * Selected work, as an editorial grid: the first project leads, wide, with
 * its picture large and its story beside it; the rest follow as cards, each
 * one picture-first with what it is, what it was built with and the number it
 * moved. Every card is one link to its case study.
 *
 * Server-rendered and CSS-only on hover, so the section costs no JavaScript
 * beyond the shared reveal.
 */
export function FeaturedWork({ projects }: { projects: CardProject[] }) {
  const [lead, ...rest] = projects;
  if (!lead) return null;

  return (
    <RevealGroup className="fw">
      <RevealItem>
        <Card project={lead} lead index={1} />
      </RevealItem>
      {rest.length ? (
        <div className="fw-grid">
          {rest.map((p, i) => (
            <RevealItem key={p.id}>
              <Card project={p} index={i + 2} />
            </RevealItem>
          ))}
        </div>
      ) : null}
    </RevealGroup>
  );
}

function Card({ project: p, lead = false, index }: { project: CardProject; lead?: boolean; index: number }) {
  const meta = [p.year, p.categoryName].filter(Boolean).join(" · ");
  const metric = p.metrics[0];

  return (
    <article className={`fw-card ${lead ? "is-lead" : ""}`}>
      <Link href={`/projects/${p.slug}`} className="fw-link" aria-label={`${p.title}: read the case study`} />

      <div className="fw-media">
        {p.preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            {...imgProps(p.preview, lead ? "(min-width: 1024px) 60vw, 100vw" : "(min-width: 1024px) 45vw, 100vw")}
            alt=""
            loading={lead ? "eager" : "lazy"}
            decoding="async"
          />
        ) : (
          <span aria-hidden className="fw-blank t-serif">
            {p.title.trim().charAt(0)}
          </span>
        )}
        <span className="fw-n t-meta" aria-hidden>
          {String(index).padStart(2, "0")}
        </span>
      </div>

      <div className="fw-body">
        <p className="fw-meta t-meta">
          {meta ? <span>{meta}</span> : null}
          {STATUS[p.lifecycle] ? <span className={`fw-status is-${p.lifecycle.toLowerCase()}`}>{STATUS[p.lifecycle]}</span> : null}
        </p>

        <h3 className="fw-title t-display">{p.title}</h3>
        <p className="fw-desc">{p.shortDescription}</p>

        {metric ? (
          <p className="fw-metric">
            <span className="fw-metric-v t-serif">{metric.value}</span>
            <span className="fw-metric-k">{metric.label}</span>
          </p>
        ) : null}

        {p.technologies.length ? (
          <ul className="fw-tech" aria-label="Built with">
            {p.technologies.slice(0, lead ? 6 : 4).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        ) : null}

        <div className="fw-foot">
          <span className="fw-cta">
            Case study
            <Arrow className="fw-arrow" />
          </span>
          {p.liveUrl ? (
            <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="fw-live">
              Visit live
              <Arrow direction="up-right" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
