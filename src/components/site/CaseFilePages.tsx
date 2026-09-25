"use client";

import Link from "next/link";
import type { CaseRoomData } from "@/lib/content";
import type { CaseFile } from "@/lib/world";
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
}: {
  file: CaseFile;
  data: CaseRoomData;
}) {
  switch (file.topic) {
    case "experience":
      return <ExperiencePages data={data} />;
    case "projects":
      return <ProjectPages data={data} />;
    case "stack":
      return <StackPages data={data} />;
    case "certifications":
      return <CertificationPages data={data} />;
  }
}

/* ------------------------------------------------------------------------- */

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

/* ------------------------------------------------------------------------- */

function Blank({ children }: { children: React.ReactNode }) {
  return <p className="xf-blank">{children}</p>;
}
