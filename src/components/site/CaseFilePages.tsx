"use client";

import Link from "next/link";
import type { CaseRoomData } from "@/lib/content";
import type { CaseFile } from "@/lib/world";
import { FILES } from "@/lib/world";
import { dateRange, monthYear } from "@/lib/utils";
import { Markdown } from "./Markdown";

/**
 * What is actually inside a file off the shelf.
 *
 * Six covers, one renderer each, and no copy of the portfolio anywhere in here:
 * every one of these reads the same rows the front page reads. That is the only
 * version of this that stays true — a room with its own hand-typed "about"
 * paragraph is a room that is wrong the first time the CMS is edited.
 *
 * Each one also handles being empty out loud rather than rendering a blank
 * page, because on a fresh install every one of these tables is empty and a
 * silent blank file reads as a bug rather than as a CMS waiting to be filled.
 */
export function CaseFilePages({
  file,
  data,
  read,
}: {
  file: CaseFile;
  data: CaseRoomData;
  /** Which files have been read. Only the index cares. */
  read: readonly string[];
}) {
  switch (file.topic) {
    case "about":
      return <AboutPages data={data} />;
    case "experience":
      return <ExperiencePages data={data} />;
    case "projects":
      return <ProjectPages data={data} />;
    case "stack":
      return <StackPages data={data} />;
    case "certifications":
      return <CertificationPages data={data} />;
    case "dossier":
      return <IndexPages read={read} />;
  }
}

/* ------------------------------------------------------------------------- */

function AboutPages({ data }: { data: CaseRoomData }) {
  const p = data.profile;
  if (!p) return <Blank>No profile is published.</Blank>;

  return (
    <div className="xf-pages">
      <p className="xf-lede">{p.headline}</p>
      <Markdown content={p.bio} />
      <Markdown content={p.longBio} />

      <dl className="xf-facts">
        {p.location ? <Fact k="Based" v={p.location} /> : null}
        {p.yearsOfExperience ? (
          <Fact k="Years in" v={String(p.yearsOfExperience)} />
        ) : null}
        {p.currentlyWorkingRole && p.currentlyWorkingAt ? (
          <Fact k="Currently" v={`${p.currentlyWorkingRole}, ${p.currentlyWorkingAt}`} />
        ) : null}
        {p.availabilityText ? <Fact k="Status" v={p.availabilityText} /> : null}
      </dl>

      {p.currentFocus ? (
        <section className="xf-sub">
          <h4>Currently into</h4>
          <Markdown content={p.currentFocus} />
        </section>
      ) : null}
      {p.philosophy ? (
        <section className="xf-sub">
          <h4>How he works</h4>
          <Markdown content={p.philosophy} />
        </section>
      ) : null}
    </div>
  );
}

function ExperiencePages({ data }: { data: CaseRoomData }) {
  const { experience, education } = data;
  if (experience.length === 0 && education.length === 0) {
    return <Blank>Nothing published under experience or education.</Blank>;
  }

  return (
    <div className="xf-pages">
      {experience.map((job) => (
        <article key={job.id} className="xf-entry">
          <p className="xf-entry-when">
            {dateRange(job.startDate, job.endDate, job.currentlyWorking)}
          </p>
          <h4 className="xf-entry-title">{job.role}</h4>
          <p className="xf-entry-sub">
            {[job.company, job.location].filter(Boolean).join(" · ")}
          </p>
          {job.description ? <Markdown content={job.description} /> : null}
          {job.achievements.length > 0 ? (
            <ul className="xf-bullets">
              {job.achievements.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : null}
          {job.technologies.length > 0 ? (
            <p className="xf-entry-tech">
              {job.technologies.map((t) => t.name).join(" · ")}
            </p>
          ) : null}
        </article>
      ))}

      {education.length > 0 ? (
        <section className="xf-sub">
          <h4>Education</h4>
          {education.map((e) => (
            <article key={e.id} className="xf-entry">
              <p className="xf-entry-when">{dateRange(e.startDate, e.endDate, false)}</p>
              <h4 className="xf-entry-title">{e.degree}</h4>
              <p className="xf-entry-sub">
                {[e.institution, e.field].filter(Boolean).join(" · ")}
              </p>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function ProjectPages({ data }: { data: CaseRoomData }) {
  if (data.projects.length === 0) return <Blank>No project is published.</Blank>;

  return (
    <div className="xf-pages">
      {data.projects.map((p) => (
        <article key={p.id} className="xf-entry">
          <p className="xf-entry-when">{p.year ?? ""}</p>
          <h4 className="xf-entry-title">
            <Link href={`/projects/${p.slug}`}>{p.title}</Link>
          </h4>
          <p className="xf-entry-sub">{p.shortDescription}</p>
          {p.technologies.length > 0 ? (
            <p className="xf-entry-tech">
              {p.technologies.map((t) => t.name).join(" · ")}
            </p>
          ) : null}
          {p.liveUrl ? (
            <a href={p.liveUrl} target="_blank" rel="noreferrer" className="xf-link">
              {p.liveUrl.replace(/^https?:\/\//, "")}
            </a>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function StackPages({ data }: { data: CaseRoomData }) {
  if (data.skillGroups.length === 0) return <Blank>No skills are published.</Blank>;

  return (
    <div className="xf-pages">
      {data.skillGroups.map((group) => (
        <section key={group.id} className="xf-sub">
          <h4>{group.name}</h4>
          <ul className="xf-chips">
            {group.skills.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function CertificationPages({ data }: { data: CaseRoomData }) {
  if (data.certifications.length === 0) {
    return <Blank>No certification is published.</Blank>;
  }

  return (
    <div className="xf-pages">
      {data.certifications.map((c) => (
        <article key={c.id} className="xf-entry">
          <p className="xf-entry-when">{monthYear(c.issueDate) ?? ""}</p>
          <h4 className="xf-entry-title">
            {c.credentialUrl ? (
              <a href={c.credentialUrl} target="_blank" rel="noreferrer">
                {c.name}
              </a>
            ) : (
              c.name
            )}
          </h4>
          <p className="xf-entry-sub">{c.issuer}</p>
          {c.description ? <Markdown content={c.description} /> : null}
        </article>
      ))}
    </div>
  );
}

/** File 06: what the other five held, and where the same thing lives outside. */
function IndexPages({ read }: { read: readonly string[] }) {
  return (
    <div className="xf-pages">
      <p className="xf-lede">
        Five files, read. Every one of them was the site you are already standing
        next to, taken off a shelf instead of scrolled to.
      </p>
      <ul className="xf-index">
        {FILES.filter((f) => f.topic !== "dossier").map((f) => (
          <li key={f.id}>
            <span className="xf-index-n">{f.index}</span>
            <span>{f.name}</span>
            <span className="xf-index-state">
              {read.includes(f.id) ? "READ" : "UNREAD"}
            </span>
          </li>
        ))}
      </ul>
      <p className="xf-lede">
        The rest of it — the case studies, the contact line, the whole thing
        laid out flat — is back on the portfolio.
      </p>
      <Link href="/" className="btn btn-sm">
        Back to the portfolio
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function Blank({ children }: { children: React.ReactNode }) {
  return <p className="xf-blank">{children}</p>;
}
