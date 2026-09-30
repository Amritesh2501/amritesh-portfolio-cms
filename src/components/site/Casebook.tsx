"use client";

import { useEffect, useRef, useState } from "react";
import * as sound from "@/lib/sound";
import { getSave, resetSave, useSave, useSaved, writeSlot } from "@/lib/save";
import {
  ENTRIES,
  SLOT,
  doneEntries,
  elapsed,
  fresh,
  lead,
  questions,
  rankFor,
  readyToClose,
  type Facts,
} from "@/lib/casebook";
import { HIDDEN } from "@/lib/secrets";

/**
 * The game layer over every room: a notebook that fills in as locks give, a
 * lead pointing at the next one, three questions to close the case, and a
 * rank at the end. Rendered once by World over whichever room is on screen.
 */

/** Reads the previous visit's time once, then stamps this one. */
export function useVisit(): number | undefined {
  const [since] = useState(() => getSave()[SLOT.lastVisit] as number | undefined);
  useEffect(() => {
    const s = getSave();
    if (!s[SLOT.startedAt]) writeSlot(SLOT.startedAt, Date.now());
    writeSlot(SLOT.lastVisit, Date.now());
  }, []);
  return since;
}

/** "Just show me": on every lock, for anyone who came for the portfolio. */
export function Skip({ onSkip }: { onSkip: () => void }) {
  const [, setSkips] = useSaved(SLOT.skips, 0);
  return (
    <button
      type="button"
      className="xq-skip"
      onClick={() => {
        setSkips((n) => n + 1);
        sound.latch();
        onSkip();
      }}
    >
      Skip puzzle, just show me
    </button>
  );
}

type View = null | "book" | "quiz" | "closed";

export function CaseHud({ facts, since }: { facts: Facts; since: number | undefined }) {
  const save = useSave();
  const [view, setView] = useState<View>(null);
  const [toast, setToast] = useState<string | null>(null);
  const done = doneEntries(save);
  const closed = !!save[SLOT.closed];
  const news = fresh(facts, since);
  const newCount = news.projects.length + news.pins.length;

  // A new entry: say what went in and where to go next.
  const count = useRef(done.length);
  useEffect(() => {
    if (done.length > count.current) {
      const added = done[done.length - 1];
      const next = lead(save);
      setToast(`Added to casebook: ${added.title}.${next ? ` Next lead: ${next}` : " The notebook is full. Close the case."}`);
      const t = window.setTimeout(() => setToast(null), 6500);
      count.current = done.length;
      return () => window.clearTimeout(t);
    }
    count.current = done.length;
    // Keyed on the count alone: any other write to the save re-renders this,
    // and re-running would cancel the timer and leave the toast up for good.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done.length]);

  useEffect(() => {
    if (!view) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      setView(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [view]);

  return (
    <>
      <button
        type="button"
        className={`xq-tab ${newCount ? "has-news" : ""}`}
        onClick={() => {
          setView(closed ? "closed" : "book");
          sound.page();
        }}
      >
        CASEBOOK {done.length}/{ENTRIES.length}
      </button>

      {toast ? (
        <p className="xq-toast" role="status">
          {toast}
        </p>
      ) : null}

      {view === "book" ? (
        <Book facts={facts} news={news} onQuiz={() => setView("quiz")} onClose={() => setView(null)} />
      ) : view === "quiz" ? (
        <Quiz facts={facts} onClosed={() => setView("closed")} onBack={() => setView("book")} />
      ) : view === "closed" ? (
        <Closed facts={facts} onBook={() => setView("book")} onClose={() => setView(null)} />
      ) : null}
    </>
  );
}

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
    <div className="xa xq" role="dialog" aria-modal="true" aria-label={title}>
      <article className="xa-card">
        <header className="xa-head">
          <p className="xa-kicker">{kicker}</p>
          <h2 className="xa-title">{title}</h2>
        </header>
        <div className="xa-body">{children}</div>
        <button type="button" className="btn btn-sm" onClick={onClose} autoFocus>
          Put it away
        </button>
      </article>
    </div>
  );
}

function Book({
  facts,
  news,
  onQuiz,
  onClose,
}: {
  facts: Facts;
  news: ReturnType<typeof fresh>;
  onQuiz: () => void;
  onClose: () => void;
}) {
  const save = useSave();
  const n = doneEntries(save).length;
  const start = (save[SLOT.startedAt] as number) || Date.now();
  const hidden = ((save[SLOT.hidden] as string[]) ?? []).length;
  const skips = (save[SLOT.skips] as number) ?? 0;

  return (
    <Panel kicker="THE CASEBOOK" title="What is known about the subject" onClose={onClose}>
      <p className="xq-stats">
        <span>{n} / {ENTRIES.length} entries</span>
        <span>{elapsed(Date.now() - start)} on the case</span>
        <span>{hidden} / {HIDDEN.length} hidden items</span>
        {skips ? <span>{skips} skipped</span> : null}
      </p>

      {news.projects.length || news.pins.length ? (
        <p className="xq-news">
          <strong>Since your last visit:</strong>{" "}
          {[
            news.projects.length ? `new project${news.projects.length > 1 ? "s" : ""}: ${news.projects.join(", ")}` : "",
            news.pins.length ? `${news.pins.length} new pin${news.pins.length > 1 ? "s" : ""} on the board` : "",
          ]
            .filter(Boolean)
            .join("; ")}
          .
        </p>
      ) : null}

      <ol className="xq-entries">
        {ENTRIES.map((e) => {
          const got = e.done(save);
          return (
            <li key={e.id} className={got ? "is-in" : ""}>
              <p className="xq-entry-title">{e.title}</p>
              {got ? (
                <p className="xq-entry-text">{e.text(facts)}</p>
              ) : (
                <>
                  <p className="xq-redacted" aria-label="Not yet found">
                    ████████████ ██████ ████████
                  </p>
                  <p className="xq-lead">Lead: {e.where}</p>
                </>
              )}
            </li>
          );
        })}
      </ol>

      <div className="xq-actions">
        <button type="button" className="btn btn-solid" onClick={onQuiz} disabled={!readyToClose(save)}>
          {readyToClose(save) ? "Close the case" : `Close the case (${ENTRIES.length - n} entries to go)`}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            if (window.confirm("Start a new case? Every lock closes again and the notebook is wiped.")) {
              resetSave();
              writeSlot(SLOT.startedAt, Date.now());
            }
          }}
        >
          Start a new case
        </button>
      </div>
    </Panel>
  );
}

function Quiz({ facts, onClosed, onBack }: { facts: Facts; onClosed: () => void; onBack: () => void }) {
  const qs = questions(facts);
  const [i, setI] = useState(0);
  const [miss, setMiss] = useState(false);
  const [, setWrong] = useSaved(SLOT.wrong, 0);

  const close = () => {
    writeSlot(SLOT.closed, { at: Date.now() });
    sound.recovered();
    onClosed();
  };

  // Nothing in the CMS to ask about: the notebook being full is enough.
  useEffect(() => {
    if (qs.length === 0) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = qs[i];
  if (!q) return null;

  const answer = (o: string) => {
    if (o !== q.answer) {
      setMiss(true);
      setWrong((n) => n + 1);
      sound.toss();
      return;
    }
    setMiss(false);
    sound.latch();
    if (i + 1 < qs.length) setI(i + 1);
    else close();
  };

  return (
    <Panel kicker={`CLOSING THE CASE · ${i + 1} OF ${qs.length}`} title={q.q} onClose={onBack}>
      <div className="xq-options">
        {q.options.map((o) => (
          <button key={o} type="button" className="xq-option" onClick={() => answer(o)}>
            {o}
          </button>
        ))}
      </div>
      {miss ? <p className="xq-miss">That is not what the notebook says. Check it and try again.</p> : null}
    </Panel>
  );
}

function Closed({ facts, onBook, onClose }: { facts: Facts; onBook: () => void; onClose: () => void }) {
  const save = useSave();
  const r = rankFor(save);
  const c = save[SLOT.closed] as { at: number } | undefined;
  const start = (save[SLOT.startedAt] as number) || c?.at || Date.now();
  const p = facts.profile;

  return (
    <Panel kicker="CASE CLOSED" title={p?.name ? `The subject is ${p.name}.` : "Case closed."} onClose={onClose}>
      <span className="xq-stamp" aria-hidden>
        CLOSED
      </span>
      {p?.headline ? <p className="xa-lede">{p.headline}</p> : null}
      <div className="xq-rank">
        <p className="xq-rank-title">{r.title}</p>
        <p className="xq-rank-score">{r.score} / 100</p>
      </div>
      <p className="xq-stats">
        <span>{elapsed((c?.at ?? Date.now()) - start)}</span>
        <span>{(save[SLOT.skips] as number) ?? 0} skipped</span>
        <span>{(save[SLOT.wrong] as number) ?? 0} wrong answers</span>
        <span>{((save[SLOT.hidden] as string[]) ?? []).length} / {HIDDEN.length} hidden items</span>
      </p>
      <p>
        {p?.availabilityText ?? "Every lock in this building was a part of the portfolio. You have read all of it."}
      </p>
      <div className="xq-actions">
        {p?.email ? (
          <a className="btn btn-solid" href={`mailto:${p.email}`}>
            Get in touch
          </a>
        ) : null}
        {p?.resumeUrl ? (
          <a className="btn btn-sm" href={p.resumeUrl} target="_blank" rel="noreferrer">
            Download résumé
          </a>
        ) : null}
        <button type="button" className="btn btn-sm" onClick={onBook}>
          Reread the casebook
        </button>
      </div>
    </Panel>
  );
}
