"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { submitContact } from "@/actions/contact";
import {
  DESKTOP_APPS,
  DIAGNOSTICS,
  type AppId,
  type GameId,
} from "@/lib/world";
import type { CaseRoomData } from "@/lib/content";
import { Untangle } from "./Untangle";
import { OrderGame, RecallGame } from "./Minigames";

/**
 * The machine on the desk.
 *
 * It is a desktop, so it boots: a cold panel, a cursor, four lines of POST, and
 * then the shell. The boot is not decoration — it is the only thing that sells
 * a monitor in a drawn room as a monitor rather than as a modal with a bezel
 * around it, and it is why the desk is worth walking over to.
 *
 * One window at a time, and no window manager. Overlapping draggable windows
 * would be a week of work to build something nobody would drag: everything here
 * is one pane deep. Icons down the left, the open pane to the right, a status
 * bar at the bottom. That is a desktop, and it is about ninety lines.
 */

type Boot = "off" | "posting" | "on";

const POST = [
  "CASE ROOM WORKSTATION — 640K OK",
  "MOUNTING /dev/portfolio ............ OK",
  "RESTORING SESSION ................. 1 USER",
  "WARNING: MACHINE WAS NOT SHUT DOWN",
];

export function Desktop({
  data,
  onClose,
}: {
  data: CaseRoomData;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const [boot, setBoot] = useState<Boot>("off");
  const [lines, setLines] = useState(0);
  const [app, setApp] = useState<AppId | null>(null);
  const [hover, setHover] = useState<AppId | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(window.clearTimeout);
  }, []);

  /* Power on -------------------------------------------------------------- */

  useEffect(() => {
    if (reduce) {
      setBoot("on");
      setLines(POST.length);
      return;
    }
    setBoot("posting");
    POST.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setLines(i + 1), 320 + i * 260));
    });
    timers.current.push(
      window.setTimeout(() => setBoot("on"), 320 + POST.length * 260 + 420),
    );
  }, [reduce]);

  /* Escape: close the pane first, then the machine ------------------------ */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (app) setApp(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [app, onClose]);

  const shown = DESKTOP_APPS.find((a) => a.id === (hover ?? app));

  return (
    <div className="xd" role="dialog" aria-modal="true" aria-label="The machine on the desk">
      <div className="xd-screen">
        {boot !== "on" ? (
          <div className="xd-post" aria-hidden>
            {POST.slice(0, lines).map((l) => (
              <p key={l}>{l}</p>
            ))}
            <p className="xd-caret" />
          </div>
        ) : (
          <>
            {/* One application, five tabs.

                The desktop metaphor is gone. Icons on a ground with a window
                floating over them is a lot of chrome for a machine that holds
                five things and can only ever show one of them — every pixel of
                it was frame rather than content. A tab strip says the same
                thing in one row: here is what is on this machine, here is
                which one you are in. */}
            <div className="xd-head">
              <span className="xd-mark" aria-hidden />
              <span className="xd-machine">CASE ROOM WORKSTATION</span>
              <span className="xd-sp" />
              <button type="button" className="xd-quit" onClick={onClose}>
                Shut down
              </button>
            </div>

            <nav className="xd-tabs" aria-label="Files on this machine">
              {DESKTOP_APPS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`xd-tab ${app === a.id ? "is-on" : ""}`}
                  onClick={() => setApp(a.id)}
                  onPointerEnter={() => setHover(a.id)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(a.id)}
                  onBlur={() => setHover(null)}
                  aria-current={app === a.id ? "page" : undefined}
                >
                  {a.name}
                </button>
              ))}
            </nav>

            <div className="xd-view">
              {app ? (
                <App id={app} data={data} />
              ) : (
                <div className="xd-welcome">
                  <p className="xd-welcome-line">Somebody left this logged in.</p>
                  <ul className="xd-welcome-list">
                    {DESKTOP_APPS.map((a) => (
                      <li key={a.id}>
                        <button type="button" onClick={() => setApp(a.id)}>
                          <span className="xd-welcome-n">{a.name}</span>
                          <span className="xd-welcome-hint">{a.hint}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <p className="xd-status" role="status">
              {shown ? shown.hint : "READY."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   What is in each one
   ------------------------------------------------------------------------- */

function App({ id, data }: { id: AppId; data: CaseRoomData }) {
  if (id === "gallery") return <Gallery data={data} />;
  if (id === "reviews") return <Reviews data={data} />;
  if (id === "suggestions") return <Suggestions />;
  if (id === "diagnostics") return <Diagnostics />;
  return <Readme />;
}

/** Every image from every published project, at the size it was uploaded. */
function Gallery({ data }: { data: CaseRoomData }) {
  const shots = data.projects.flatMap((p) =>
    [p.thumbnail, p.heroImage, ...p.gallery.map((g) => g.url)]
      .filter((url): url is string => Boolean(url))
      .map((url) => ({ url, title: p.title, slug: p.slug })),
  );

  if (shots.length === 0) return <Nothing>No images on any published project.</Nothing>;

  return (
    <ul className="xd-grid">
      {shots.map((s, i) => (
        <li key={`${s.slug}-${i}`}>
          <a href={`/projects/${s.slug}`} className="xd-shot">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.url} alt={s.title} loading="lazy" decoding="async" />
            <span>{s.title}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** The numbers each project was actually judged on. */
function Reviews({ data }: { data: CaseRoomData }) {
  const scored = data.projects.filter((p) => p.metrics.length > 0);
  if (scored.length === 0) return <Nothing>No project carries a metric yet.</Nothing>;

  return (
    <ul className="xd-rows">
      {scored.map((p) => (
        <li key={p.id}>
          <p className="xd-row-title">{p.title}</p>
          <dl className="xd-metrics">
            {p.metrics.map((m) => (
              <div key={m.label}>
                <dd>{m.value}</dd>
                <dt>{m.label}</dt>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}

/**
 * A note, straight into the same inbox as the contact form.
 *
 * Reusing `submitContact` rather than adding a suggestions table: it already
 * validates, rate-limits by IP and lands in Admin > Messages, and a second
 * table would be the same five columns with a different name on it. The
 * subject says where it came from, which is the only thing that differs.
 */
function Suggestions() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending");
    setError(null);

    const result = await submitContact({
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      subject: "Suggestion from the case room",
      message: String(form.get("message") ?? ""),
      website: String(form.get("website") ?? ""),
    });

    if (!result.ok) {
      setError(result.error ?? "Could not send it.");
      setState("idle");
      return;
    }
    setState("sent");
  }, []);

  if (state === "sent") {
    return <Nothing>Filed. It is in the same inbox as everything else.</Nothing>;
  }

  return (
    <form className="xd-form" onSubmit={send}>
      <label>
        <span>NAME</span>
        <input name="name" required minLength={2} maxLength={120} autoComplete="name" />
      </label>
      <label>
        <span>EMAIL</span>
        <input name="email" type="email" required maxLength={200} autoComplete="email" />
      </label>
      <label className="is-wide">
        <span>SUGGESTION</span>
        <textarea name="message" required minLength={20} maxLength={5000} rows={5} />
      </label>
      {/* Honeypot, same as the contact form. Real people never fill it. */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="xd-honey"
      />
      {error ? <p className="xd-error">{error}</p> : null}
      <button type="submit" className="btn btn-sm" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send it"}
      </button>
    </form>
  );
}

/** The three puzzles that used to be files on the shelf. */
function Diagnostics() {
  const [open, setOpen] = useState<GameId | null>(null);
  const [fixed, setFixed] = useState<GameId[]>([]);

  const solve = useCallback((id: GameId) => {
    setFixed((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  if (open) {
    const item = DIAGNOSTICS.find((d) => d.id === open)!;
    return (
      <div className="xd-diag">
        <p className="xd-diag-brief">{item.brief}</p>
        {open === "untangle" ? <Untangle onSolved={() => solve("untangle")} /> : null}
        {open === "order" ? <OrderGame onSolved={() => solve("order")} /> : null}
        {open === "recall" ? <RecallGame onSolved={() => solve("recall")} /> : null}
        <button type="button" className="btn btn-sm" onClick={() => setOpen(null)}>
          Back to diagnostics
        </button>
      </div>
    );
  }

  return (
    <ul className="xd-rows">
      {DIAGNOSTICS.map((d) => (
        <li key={d.id}>
          <button type="button" className="xd-diag-row" onClick={() => setOpen(d.id)}>
            <span className="xd-row-title">{d.name}</span>
            <span className="xd-diag-state">
              {fixed.includes(d.id) ? "CLEARED" : "FAULT"}
            </span>
          </button>
          <p className="xd-diag-line">{d.brief}</p>
        </li>
      ))}
    </ul>
  );
}

function Readme() {
  return (
    <div className="xd-readme">
      <p>
        This room is not the portfolio. It is one SVG drawing, a camera that is a
        single CSS transform, and a synthesiser making every sound you can hear —
        no images, no audio files, no 3D engine.
      </p>
      <p>
        The board next door works out where its own pins go from the threads
        between them. The files on the shelf are the real sections of the site,
        read out of the same database the front page reads.
      </p>
      <p>
        Everything in here is also one click away in plain HTML, which is the
        deal: the room is a way to look around, never the only way in.
      </p>
      <a href="/" className="btn btn-sm">
        Back to the portfolio
      </a>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Small things
   ------------------------------------------------------------------------- */

function Nothing({ children }: { children: React.ReactNode }) {
  return <p className="xd-idle">{children}</p>;
}
