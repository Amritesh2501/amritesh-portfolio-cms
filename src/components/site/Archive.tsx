"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  ARCHIVE,
  ARCHIVE_ESTABLISH,
  archiveById,
  type ArchiveId,
  type ArchiveProp,
  type Shows,
} from "@/lib/archives";
import { frameFor } from "@/lib/world";
import type { CaseRoomData } from "@/lib/content";
import { dateRange, monthYear } from "@/lib/utils";
import * as sound from "@/lib/sound";
import { ArchiveRoom } from "./ArchiveArt";
import { Lockpick } from "./Lockpick";
import { Markdown } from "./Markdown";

/**
 * The rooms through the STACK, CERTIFICATIONS and SKILLS books.
 *
 * The lab's screen again — one CSS transform for the camera, stations rather
 * than a free camera — written once for three rooms, because what differs
 * between them is in lib/archives and ArchiveArt, not here.
 *
 * Every prop does something when used: it changes in the drawing (a drawer
 * slides, a wheel turns, a bag swings), says a line in the HUD, and if it holds
 * part of the portfolio it opens a card with that on it.
 */
export function Archive({
  id,
  data,
  onBack,
}: {
  id: ArchiveId;
  data: CaseRoomData;
  onBack: () => void;
}) {
  const room = archiveById(id);
  const reduce = useReducedMotion();
  const view = useViewport();

  const [at, setAt] = useState<string | null>(null);
  const [cam, setCam] = useState(room.arrival);
  const [camMs, setCamMs] = useState(0);
  const [black, setBlack] = useState(true);
  const [ready, setReady] = useState(false);

  const [on, setOn] = useState<Record<string, boolean>>({});
  const [used, setUsed] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [lights, setLights] = useState(false);
  const [shelfLights, setShelfLights] = useState(false);
  const [blindOpen, setBlindOpen] = useState(false);

  const timers = useRef<number[]>([]);
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(window.clearTimeout);
  }, []);

  /* Arriving ---------------------------------------------------------------- */

  useEffect(() => {
    if (reduce) {
      setCam(ARCHIVE_ESTABLISH);
      setBlack(false);
      setReady(true);
      return;
    }
    const t1 = window.setTimeout(() => {
      setCamMs(3000);
      setCam(ARCHIVE_ESTABLISH);
      setBlack(false);
    }, 420);
    const t2 = window.setTimeout(() => setReady(true), 3200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [reduce]);

  /* The camera -------------------------------------------------------------- */

  const goto = useCallback(
    (sid: string) => {
      const station = room.stations.find((s) => s.id === sid);
      if (!station) return;
      setAt(sid);
      setNote(null);
      setCamMs(reduce ? 0 : 1300);
      setCam(station.cam);
      sound.settle();
    },
    [room, reduce],
  );

  const toRoom = useCallback(() => {
    setAt(null);
    setOpen(null);
    setNote(null);
    setCamMs(reduce ? 0 : 1300);
    setCam(ARCHIVE_ESTABLISH);
    sound.settle();
  }, [reduce]);

  /* Props ------------------------------------------------------------------- */

  const act = useCallback(
    (prop: ArchiveProp) => {
      sound.latch();
      if (prop.locked && !unlocked) {
        setOpen(prop.id);
        return;
      }
      const next = !on[prop.id];
      setOn((prev) => ({ ...prev, [prop.id]: next }));
      setUsed((prev) => (prev.includes(prop.id) ? prev : [...prev, prop.id]));
      setNote(prop.note);
      // Putting a thing back does not open it again.
      if (prop.shows && next) setOpen(prop.id);
    },
    [on, unlocked],
  );

  /** Clicking a thing is using the thing: from across the floor this walks
   *  over first and uses it on arrival. */
  const use = useCallback(
    (pid: string) => {
      const prop = room.props.find((p) => p.id === pid);
      if (!prop) return;
      if (at === prop.at) {
        act(prop);
        return;
      }
      goto(prop.at);
      timers.current.push(window.setTimeout(() => act(prop), reduce ? 0 : 900));
    },
    [room, at, act, goto, reduce],
  );

  const unlock = useCallback(() => {
    const prop = room.props.find((p) => p.id === open);
    setUnlocked(true);
    if (!prop) return;
    setOn((prev) => ({ ...prev, [prop.id]: true }));
    setUsed((prev) => (prev.includes(prop.id) ? prev : [...prev, prop.id]));
    setNote(prop.note);
  }, [room, open]);

  const toggle = (set: (fn: (v: boolean) => boolean) => void) => () => {
    set((v) => !v);
    sound.latch();
  };

  /* Keyboard ---------------------------------------------------------------- */

  const order = useMemo(() => room.stations.map((s) => s.id), [room]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (open) setOpen(null);
        else if (at) toRoom();
        else onBack();
        return;
      }
      if (open) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const from = at ? order.indexOf(at) : -1;
      const next = from + (e.key === "ArrowRight" ? 1 : -1);
      if (next < 0) toRoom();
      else if (next < order.length) goto(order[next]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, open, order, goto, toRoom, onBack]);

  const shot = useMemo(() => frameFor(cam, view, ARCHIVE), [cam, view]);
  const here = at ? room.stations.find((s) => s.id === at) : null;
  const opened = open ? room.props.find((p) => p.id === open) : null;

  return (
    <div
      className={`xw ${lights || shelfLights ? "is-lit" : ""}`}
      style={{ ["--xw-bulb" as string]: room.bulb }}
    >
      <div className="xw-viewport">
        <div
          className="xw-stage"
          style={{
            width: ARCHIVE.w,
            height: ARCHIVE.h,
            transform: `scale(${shot.z}) translate(${-shot.x}px, ${-shot.y}px)`,
            transitionDuration: `${camMs}ms`,
          }}
        >
          <ArchiveRoom
            room={room}
            at={at}
            on={on}
            lights={lights}
            shelfLights={shelfLights}
            blindOpen={blindOpen}
            onStation={goto}
            onProp={use}
            onLights={toggle(setLights)}
            onShelfLights={toggle(setShelfLights)}
            onBlind={toggle(setBlindOpen)}
          />
        </div>
      </div>

      <div aria-hidden className={`xw-black ${black ? "is-on" : ""}`} />

      <div className={`xw-hud ${ready ? "is-in" : ""}`}>
        <div className="xw-hud-top">
          <p className="xw-title">{room.title}</p>
          <p className="xw-count">
            {used.length} / {room.props.length} touched
          </p>
          <div className="xw-lights">
            <button
              type="button"
              className={`xw-mute ${lights ? "is-on" : ""}`}
              onClick={toggle(setLights)}
              aria-pressed={lights}
            >
              LIGHTS
            </button>
            <button
              type="button"
              className={`xw-mute ${shelfLights ? "is-on" : ""}`}
              onClick={toggle(setShelfLights)}
              aria-pressed={shelfLights}
            >
              SHELF LIGHTS
            </button>
            <button
              type="button"
              className={`xw-mute ${blindOpen ? "is-on" : ""}`}
              onClick={toggle(setBlindOpen)}
              aria-pressed={blindOpen}
            >
              BLIND
            </button>
          </div>
        </div>

        <div className="xw-hud-bottom">
          <p className="xw-blurb" role="status">
            {note ?? (here ? here.blurb : room.blurb)}
          </p>

          <div className="xw-stations">
            <button
              type="button"
              className={`xw-station ${at === null ? "is-here" : ""}`}
              onClick={toRoom}
            >
              The floor
            </button>
            {room.stations.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`xw-station ${at === s.id ? "is-here" : ""}`}
                onClick={() => goto(s.id)}
              >
                {s.name}
              </button>
            ))}
            <button type="button" className="xw-station is-exit" onClick={onBack}>
              Back to the case room
            </button>
          </div>

          {at ? (
            <div className="xw-files">
              {room.props
                .filter((p) => p.at === at)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`xw-file-btn ${on[p.id] ? "is-done" : ""}`}
                    onClick={() => use(p.id)}
                  >
                    <span>{p.name.toUpperCase()}</span>
                    <span className="xw-file-s">
                      {p.locked && !unlocked ? "LOCKED" : on[p.id] ? "PUT BACK" : "USE"}
                    </span>
                  </button>
                ))}
            </div>
          ) : null}
        </div>
      </div>

      {opened ? (
        opened.locked && !unlocked ? (
          <Lockpick
            data={data}
            name={opened.name}
            onOpened={unlock}
            onClose={() => setOpen(null)}
          />
        ) : opened.shows ? (
          <div className="xa" role="dialog" aria-modal="true" aria-label={opened.name}>
            <article className="xa-card">
              <header className="xa-head">
                <p className="xa-kicker">{room.title}</p>
                <h2 className="xa-title">{opened.name}</h2>
              </header>
              <div className="xa-body">
                <Contents shows={opened.shows} data={data} />
              </div>
              <button type="button" className="btn btn-sm" onClick={() => setOpen(null)}>
                Step back
              </button>
            </article>
          </div>
        ) : null
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   What the props hold

   All of it read from the same rows the front page reads, and each one says
   so out loud when the table is empty rather than showing a blank card.
   ------------------------------------------------------------------------- */

function Contents({ shows, data }: { shows: Shows; data: CaseRoomData }) {
  const { education: edu, certifications: certs, skillGroups: groups } = data;

  switch (shows) {
    case "records":
      if (edu.length === 0) return <Empty table="Education" />;
      return (
        <div className="xr2-list">
          {edu.map((e) => (
            <article key={e.id} className="xr2-item">
              <p className="xr2-when">{dateRange(e.startDate, e.endDate, !e.endDate)}</p>
              <h3 className="xr2-name">
                {e.degree}
                {e.field ? `, ${e.field}` : ""}
              </h3>
              <p className="xr2-sub">
                {[e.institution, e.location, e.grade].filter(Boolean).join(" · ")}
              </p>
              {e.description ? <Markdown content={e.description} /> : null}
            </article>
          ))}
        </div>
      );

    case "years":
      if (edu.length === 0) return <Empty table="Education" />;
      return (
        <ul className="xr2-notes">
          {edu.map((e) => (
            <li key={e.id}>
              <span className="xr2-notes-n">
                {new Date(e.startDate).getUTCFullYear()}–
                {e.endDate ? new Date(e.endDate).getUTCFullYear() : "now"}
              </span>
              <span>{e.institution}</span>
            </li>
          ))}
        </ul>
      );

    case "places": {
      const places = [...new Set(edu.map((e) => e.location).filter((l): l is string => Boolean(l)))];
      if (places.length === 0) return <p className="xa-empty">No pins in it yet: no record has a location.</p>;
      return (
        <ul className="xr2-notes">
          {places.map((p, i) => (
            <li key={p}>
              <span className="xr2-notes-n">{String(i + 1).padStart(2, "0")}</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      );
    }

    case "diploma": {
      const e = edu[0];
      if (!e) return <Empty table="Education" />;
      return (
        <>
          <p className="xa-lede">
            {e.degree}
            {e.field ? ` in ${e.field}` : ""}
          </p>
          <p className="xa-foot">
            Conferred by {e.institution}
            {e.endDate ? `, ${monthYear(e.endDate)}` : ""}
          </p>
        </>
      );
    }

    case "certifications":
      if (certs.length === 0) return <Empty table="Certifications" />;
      return (
        <div className="xr2-list">
          {certs.map((c) => (
            <article key={c.id} className="xr2-item">
              <p className="xr2-when">{monthYear(c.issueDate) ?? ""}</p>
              <h3 className="xr2-name">
                {c.credentialUrl ? (
                  <a href={c.credentialUrl} target="_blank" rel="noreferrer">
                    {c.name}
                  </a>
                ) : (
                  c.name
                )}
              </h3>
              <p className="xr2-sub">{c.issuer}</p>
              {c.description ? <Markdown content={c.description} /> : null}
            </article>
          ))}
        </div>
      );

    case "issuers": {
      const count = new Map<string, number>();
      for (const c of certs) count.set(c.issuer, (count.get(c.issuer) ?? 0) + 1);
      if (count.size === 0) return <Empty table="Certifications" />;
      return (
        <ul className="xr2-notes">
          {[...count].map(([issuer, n]) => (
            <li key={issuer}>
              <span className="xr2-notes-n">×{n}</span>
              <span>{issuer}</span>
            </li>
          ))}
        </ul>
      );
    }

    case "drills":
      if (groups.length === 0) return <Empty table="Skills" />;
      return (
        <ul className="xr2-notes">
          {groups.map((g) => (
            <li key={g.id}>
              <span className="xr2-notes-n">×{g.skills.length}</span>
              <span>{g.name}</span>
            </li>
          ))}
        </ul>
      );

    case "skills":
      if (groups.length === 0) return <Empty table="Skills" />;
      return (
        <div className="xr2-list">
          {groups.map((g) => (
            <article key={g.id} className="xr2-item">
              <h3 className="xr2-name">{g.name}</h3>
              <ul className="xr2-chips">
                {g.skills.map((s) => (
                  <li key={s.id}>{s.name}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      );
  }
}

function Empty({ table }: { table: string }) {
  return (
    <p className="xa-empty">
      Nothing filed yet. <strong>{table}</strong> in the CMS.
    </p>
  );
}

/* ------------------------------------------------------------------------- */

function useViewport() {
  const [size, setSize] = useState({ w: 1280, h: 800 });
  useEffect(() => {
    const read = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return size;
}
