"use client";

import { useState } from "react";
import type { CaseRoomData } from "@/lib/content";
import { monthYear } from "@/lib/utils";
import { Markdown } from "./Markdown";

/**
 * What was behind the cipher.
 *
 * The case room's machine is a workstation somebody was doing a job on. This
 * one is a person's own computer, so it is the opposite: no system name, no
 * volumes, no shutdown — a wallpaper, a handful of files somebody actually
 * made, and whatever was left open.
 *
 * Every file is a real field of the profile. Nothing here is written in this
 * component, which matters more for this screen than for any other: these are
 * the files somebody would keep, and a hardcoded set of them would be a
 * portrait of a person who does not exist.
 */

type Item = {
  name: string;
  kind: "txt" | "md" | "dir";
  /** One line in the status bar. */
  note: string;
  body: React.ReactNode;
  /** Nothing to show, so it is greyed rather than hidden — an empty machine
   *  that hides its empty files looks like a machine with nothing on it. */
  empty: boolean;
};

export function HisMachine({
  data,
  onClose,
}: {
  data: CaseRoomData;
  onClose: () => void;
}) {
  const p = data.profile;
  const [open, setOpen] = useState<string | null>(null);

  const missing = (field: string) => (
    <p className="xm-empty">
      Nothing in this one yet. <strong>{field}</strong> in the CMS.
    </p>
  );

  const items: Item[] = [
    {
      name: "about.txt",
      kind: "txt",
      note: "Who he says he is, when asked directly.",
      empty: !p?.bio,
      body: p?.bio ? (
        <>
          <p className="xm-lede">{p.headline}</p>
          <Markdown content={p.bio} />
          {p.longBio ? <Markdown content={p.longBio} /> : null}
        </>
      ) : (
        missing("Profile → Short bio")
      ),
    },
    {
      name: "how-i-work.md",
      kind: "md",
      note: "The rules he keeps coming back to.",
      empty: !p?.philosophy,
      body: p?.philosophy ? <Markdown content={p.philosophy} /> : missing("Profile → Engineering philosophy"),
    },
    {
      name: "now.txt",
      kind: "txt",
      note: "What is on the desk this month.",
      empty: !p?.currentFocus,
      body: p?.currentFocus ? <Markdown content={p.currentFocus} /> : missing("Profile → Current focus"),
    },
    {
      name: "reading.txt",
      kind: "txt",
      note: "What he keeps ending up reading about.",
      empty: !p?.technicalInterests,
      body: p?.technicalInterests ? (
        <Markdown content={p.technicalInterests} />
      ) : (
        missing("Profile → Technical interests")
      ),
    },
    {
      name: "off-the-clock/",
      kind: "dir",
      note: "What he does when nobody is paying him.",
      empty: !p?.hobbies?.length,
      body: p?.hobbies?.length ? (
        <ul className="xm-list">
          {p.hobbies.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      ) : (
        missing("Profile → Hobbies")
      ),
    },
    {
      name: "id.txt",
      kind: "txt",
      note: "The boring facts.",
      empty: !p,
      body: p ? (
        <dl className="xm-facts">
          <div>
            <dt>Name</dt>
            <dd>{p.name}</dd>
          </div>
          {p.dateOfBirth ? (
            <div>
              <dt>Born</dt>
              <dd>{monthYear(p.dateOfBirth)}</dd>
            </div>
          ) : null}
          {p.location ? (
            <div>
              <dt>Based</dt>
              <dd>{p.location}</dd>
            </div>
          ) : null}
          {p.currentlyWorkingRole && p.currentlyWorkingAt ? (
            <div>
              <dt>Currently</dt>
              <dd>
                {p.currentlyWorkingRole}, {p.currentlyWorkingAt}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        missing("Profile")
      ),
    },
  ];

  const current = items.find((i) => i.name === open) ?? null;

  return (
    <div className="xm" role="dialog" aria-modal="true" aria-label="His computer">
      <div className="xm-screen">
        <div className="xm-bar">
          <span className="xm-user">{p?.name ?? "unknown"}</span>
          <span className="xm-sp" />
          <span className="xm-free">{items.filter((i) => !i.empty).length} files</span>
          <button type="button" className="xm-quit" onClick={onClose}>
            Log out
          </button>
        </div>

        <div className="xm-desk">
          <ul className="xm-files">
            {items.map((item) => (
              <li key={item.name}>
                <button
                  type="button"
                  className={`xm-file ${open === item.name ? "is-open" : ""} ${item.empty ? "is-empty" : ""}`}
                  onClick={() => setOpen((cur) => (cur === item.name ? null : item.name))}
                >
                  <Glyph kind={item.kind} />
                  <span className="xm-file-name">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>

          {current ? (
            <section className="xm-window">
              <header className="xm-window-bar">
                <span>{current.name}</span>
                <button
                  type="button"
                  className="xm-x"
                  onClick={() => setOpen(null)}
                  aria-label="Close"
                >
                  ×
                </button>
              </header>
              <div className="xm-window-body">{current.body}</div>
            </section>
          ) : null}
        </div>

        <p className="xm-status" role="status">
          {current ? current.note : "His machine. Nothing here is work."}
        </p>
      </div>
    </div>
  );
}

/** Three marks: a page, a page with a fold, a folder. */
function Glyph({ kind }: { kind: Item["kind"] }) {
  if (kind === "dir") {
    return (
      <svg viewBox="0 0 32 26" aria-hidden className="xm-glyph">
        <path d="M1 25V3h11l3 4h16v18Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 30" aria-hidden className="xm-glyph">
      <path d="M1 29V1h14l8 8v20Z" />
      <path d="M15 1v8h8" />
      {kind === "md" ? <path d="M6 17h12M6 22h8" /> : null}
    </svg>
  );
}
