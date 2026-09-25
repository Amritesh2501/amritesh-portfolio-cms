"use client";

import type { CaseRoomData } from "@/lib/content";
import { Markdown } from "./Markdown";

/**
 * The long version of who he is, found in his own room.
 *
 * ABOUT is the door to this room rather than a file with pages in it, which
 * means everything that used to be on those pages has to be somewhere in here
 * — and it should be found rather than presented. This is what the shelf of
 * books gives up, and what the terminal gives up once it is beaten.
 *
 * Two panels, one component: they are the same shape and the same paper, and
 * the only thing that differs is which fields of the profile they carry.
 */
export function Books({
  data,
  onClose,
}: {
  data: CaseRoomData;
  onClose: () => void;
}) {
  const p = data.profile;

  return (
    <Panel kicker="OFF THE SHELF" title="His own account" onClose={onClose}>
      {p ? (
        <>
          <p className="xa-lede">{p.headline}</p>
          <Markdown content={p.bio} />
          {p.longBio ? <Markdown content={p.longBio} /> : null}
          {!p.bio && !p.longBio ? (
            <p className="xa-empty">
              Nothing written yet. <strong>Profile → About</strong> in the CMS.
            </p>
          ) : null}
        </>
      ) : (
        <p className="xa-empty">No profile is published.</p>
      )}
    </Panel>
  );
}

/**
 * What the terminal was protecting.
 *
 * The cipher is the lock; this is what is behind it. How somebody works is the
 * thing they are least likely to say out loud on a front page, so it is the
 * thing worth making somebody earn.
 */
export function Working({
  data,
  onClose,
}: {
  data: CaseRoomData;
  onClose: () => void;
}) {
  const p = data.profile;

  return (
    <Panel kicker="DECRYPTED" title="How he works" onClose={onClose}>
      {p?.philosophy ? (
        <Markdown content={p.philosophy} />
      ) : (
        <p className="xa-empty">
          Nothing written yet. <strong>Profile → Engineering philosophy</strong> in
          the CMS.
        </p>
      )}

      {p?.currentlyWorkingRole && p?.currentlyWorkingAt ? (
        <p className="xa-foot">
          Currently {p.currentlyWorkingRole} at {p.currentlyWorkingAt}.
        </p>
      ) : null}
    </Panel>
  );
}

/* ------------------------------------------------------------------------- */

function Panel({
  kicker,
  title,
  children,
  onClose,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="xa" role="dialog" aria-modal="true" aria-label={title}>
      <article className="xa-card">
        <header className="xa-head">
          <p className="xa-kicker">{kicker}</p>
          <h2 className="xa-title">{title}</h2>
        </header>

        <div className="xa-body">{children}</div>

        <button type="button" className="btn btn-sm" onClick={onClose}>
          Put it back
        </button>
      </article>
    </div>
  );
}
