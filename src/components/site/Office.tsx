"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  OFFICE,
  OFFICE_ARRIVAL,
  OFFICE_ESTABLISH,
  OFFICE_PUZZLES,
  OFFICE_STATIONS,
  officePuzzleById,
  officeStationById,
  type OfficePuzzleId,
} from "@/lib/office";
import { frameFor } from "@/lib/world";
import type { CaseRoomData } from "@/lib/content";
import * as sound from "@/lib/sound";
import { dateRange } from "@/lib/utils";
import { OfficeRoom } from "./OfficeArt";
import { Untangle } from "./Untangle";
import { Wires } from "./Wires";
import { Backlog } from "./Backlog";
import { Markdown } from "./Markdown";

/**
 * The room through the EXPERIENCE book.
 *
 * Structurally the third of the same screen: one CSS transform for the camera,
 * stations rather than a free camera, `frameFor` shared with the other two so
 * a shot behaves identically everywhere.
 *
 * It is written out rather than abstracted with the bedroom. The two are
 * similar and two is the number where you wait — the shared part is a dozen
 * lines of camera effects, and the parts that differ (what is in the HUD, which
 * panel each puzzle opens) are the parts a shared component would have to take
 * as props anyway.
 */
export function Office({
  data,
  onBack,
}: {
  data: CaseRoomData;
  onBack: () => void;
}) {
  const reduce = useReducedMotion();
  const view = useViewport();

  const [at, setAt] = useState<string | null>(null);
  const [cam, setCam] = useState(OFFICE_ARRIVAL);
  const [camMs, setCamMs] = useState(0);
  const [black, setBlack] = useState(true);
  const [ready, setReady] = useState(false);

  const [open, setOpen] = useState<OfficePuzzleId | null>(null);
  const [solved, setSolved] = useState<OfficePuzzleId[]>([]);
  const [lights, setLights] = useState(false);

  const timers = useRef<number[]>([]);
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(window.clearTimeout);
  }, []);

  /* Arriving ---------------------------------------------------------------- */

  useEffect(() => {
    if (reduce) {
      setCam(OFFICE_ESTABLISH);
      setBlack(false);
      setReady(true);
      return;
    }
    const t1 = window.setTimeout(() => {
      setCamMs(3000);
      setCam(OFFICE_ESTABLISH);
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
    (id: string) => {
      const station = officeStationById(id);
      if (!station) return;
      setAt(id);
      setCamMs(reduce ? 0 : 1300);
      setCam(station.cam);
      sound.settle();
    },
    [reduce],
  );

  const toRoom = useCallback(() => {
    setAt(null);
    setOpen(null);
    setCamMs(reduce ? 0 : 1300);
    setCam(OFFICE_ESTABLISH);
    sound.settle();
  }, [reduce]);

  /** Clicking a thing is using the thing: from across the floor this walks
   *  over first and opens on arrival. */
  const reach = useCallback(
    (id: OfficePuzzleId) => {
      const puzzle = officePuzzleById(id);
      if (!puzzle) return;
      if (at === puzzle.at) {
        setOpen(id);
        sound.latch();
        return;
      }
      goto(puzzle.at);
      timers.current.push(
        window.setTimeout(
          () => {
            setOpen(id);
            sound.latch();
          },
          reduce ? 0 : 900,
        ),
      );
    },
    [at, goto, reduce],
  );

  /** Beaten. The panel is NOT closed — each puzzle is a lock on something, and
   *  closing the moment the lock gives throws the reward away. */
  const solve = useCallback((id: OfficePuzzleId) => {
    setSolved((prev) => (prev.includes(id) ? prev : [...prev, id]));
    sound.recovered();
  }, []);

  /* Keyboard ---------------------------------------------------------------- */

  const order = useMemo(() => OFFICE_STATIONS.map((s) => s.id), []);
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

  const shot = useMemo(() => frameFor(cam, view, OFFICE), [cam, view]);
  const here = at ? officeStationById(at) : null;

  return (
    <div className={`xw xo ${lights ? "is-lit" : ""}`}>
      <div className="xw-viewport">
        <div
          className="xw-stage"
          style={{
            width: OFFICE.w,
            height: OFFICE.h,
            transform: `scale(${shot.z}) translate(${-shot.x}px, ${-shot.y}px)`,
            transitionDuration: `${camMs}ms`,
          }}
        >
          <OfficeRoom
            at={at}
            lights={lights}
            solved={solved}
            onStation={goto}
            onPuzzle={reach}
            onLights={() => {
              setLights((on) => !on);
              sound.latch();
            }}
          />
        </div>
      </div>

      <div aria-hidden className={`xw-black ${black ? "is-on" : ""}`} />

      <div className={`xw-hud ${ready ? "is-in" : ""}`}>
        <div className="xw-hud-top">
          <p className="xw-title">WHERE HE WORKED</p>
          <p className="xw-count">
            {solved.length} / {OFFICE_PUZZLES.length} opened
          </p>
          <div className="xw-lights">
            <button
              type="button"
              className={`xw-mute ${lights ? "is-on" : ""}`}
              onClick={() => {
                setLights((on) => !on);
                sound.latch();
              }}
              aria-pressed={lights}
            >
              LIGHTS
            </button>
          </div>
        </div>

        <div className="xw-hud-bottom">
          <p className="xw-blurb">
            {here ? here.blurb : "Somebody's office, after everybody has gone."}
          </p>

          <div className="xw-stations">
            <button
              type="button"
              className={`xw-station ${at === null ? "is-here" : ""}`}
              onClick={toRoom}
            >
              The floor
            </button>
            {OFFICE_STATIONS.map((s) => (
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

          {OFFICE_PUZZLES.filter((p) => p.at === at).map((p) => (
            <div className="xw-files" key={p.id}>
              <button
                type="button"
                className={`xw-file-btn ${solved.includes(p.id) ? "is-done" : ""}`}
                onClick={() => reach(p.id)}
              >
                <span>{p.name.toUpperCase()}</span>
                <span className="xw-file-s">
                  {p.id === "record" ? "OPEN" : solved.includes(p.id) ? "DONE" : "LOCKED"}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* The record has no lock; the other three do, and each shows what it was
          guarding once it gives. */}
      {open === "record" ? (
        <Record data={data} onClose={() => setOpen(null)} />
      ) : open === "wiring" ? (
        solved.includes("wiring") ? (
          <Roles data={data} onClose={() => setOpen(null)} />
        ) : (
          <Frame
            name="The architecture"
            note="Pull the boxes apart until no two lines cross."
            onClose={() => setOpen(null)}
          >
            <Untangle onSolved={() => solve("wiring")} />
          </Frame>
        )
      ) : open === "patch" ? (
        solved.includes("patch") ? (
          <Stacks data={data} onClose={() => setOpen(null)} />
        ) : (
          <Wires onSolved={() => solve("patch")} onClose={() => setOpen(null)} />
        )
      ) : open === "backlog" ? (
        solved.includes("backlog") ? (
          <Schooling data={data} onClose={() => setOpen(null)} />
        ) : (
          <Backlog onSolved={() => solve("backlog")} onClose={() => setOpen(null)} />
        )
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   What the room gives up
   ------------------------------------------------------------------------- */

function Frame({
  name,
  note,
  children,
  onClose,
}: {
  name: string;
  note?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="xa" role="dialog" aria-modal="true" aria-label={name}>
      <article className="xa-card">
        <header className="xa-head">
          <p className="xa-kicker">{name.toUpperCase()}</p>
          {note ? <h2 className="xa-title">{note}</h2> : null}
        </header>
        <div className="xa-body">{children}</div>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          Step back
        </button>
      </article>
    </div>
  );
}

/** Behind the whiteboard: what each job was actually for. */
function Roles({ data, onClose }: { data: CaseRoomData; onClose: () => void }) {
  return (
    <Frame name="The architecture" note="What each one was for" onClose={onClose}>
      {data.experience.length === 0 ? (
        <p className="xa-empty">
          Nothing published under experience. <strong>Experience</strong> in the CMS.
        </p>
      ) : (
        data.experience.map((job) => (
          <article key={job.id} className="xo-entry">
            <p className="xo-when">{dateRange(job.startDate, job.endDate, job.currentlyWorking)}</p>
            <h3 className="xo-role">{job.role}</h3>
            <p className="xo-where">{[job.company, job.location].filter(Boolean).join(" · ")}</p>
            {job.description ? <Markdown content={job.description} /> : null}
            {job.achievements.length > 0 ? (
              <ul className="xo-bullets">
                {job.achievements.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))
      )}
    </Frame>
  );
}

/** Behind the patch panel: what those jobs were built out of. */
function Stacks({ data, onClose }: { data: CaseRoomData; onClose: () => void }) {
  const any = data.experience.some((j) => j.technologies.length > 0);
  return (
    <Frame name="The patch panel" note="What they were built out of" onClose={onClose}>
      {any ? (
        data.experience
          .filter((j) => j.technologies.length > 0)
          .map((job) => (
            <div key={job.id} className="xo-entry">
              <h3 className="xo-role">{job.company}</h3>
              <ul className="xo-chips">
                {job.technologies.map((t) => (
                  <li key={t.id}>{t.name}</li>
                ))}
              </ul>
            </div>
          ))
      ) : (
        <p className="xa-empty">
          No technologies listed on any role. <strong>Experience → Technologies</strong> in
          the CMS.
        </p>
      )}
    </Frame>
  );
}

/** Behind the backlog: what it took to get into the work at all. */
function Schooling({ data, onClose }: { data: CaseRoomData; onClose: () => void }) {
  return (
    <Frame name="The backlog" note="Before any of it" onClose={onClose}>
      {data.education.length === 0 ? (
        <p className="xa-empty">
          Nothing published under education. <strong>Education</strong> in the CMS.
        </p>
      ) : (
        data.education.map((e) => (
          <article key={e.id} className="xo-entry">
            <p className="xo-when">{dateRange(e.startDate, e.endDate, false)}</p>
            <h3 className="xo-role">{e.degree}</h3>
            <p className="xo-where">{[e.institution, e.field].filter(Boolean).join(" · ")}</p>
            {e.grade ? <p className="xo-where">{e.grade}</p> : null}
          </article>
        ))
      )}
    </Frame>
  );
}

/** The cabinet: the whole record, in order, behind no lock at all. */
function Record({ data, onClose }: { data: CaseRoomData; onClose: () => void }) {
  return (
    <Frame name="Personnel file" note="The whole record" onClose={onClose}>
      {data.experience.length === 0 && data.education.length === 0 ? (
        <p className="xa-empty">
          Nothing published under experience or education yet.
        </p>
      ) : (
        <>
          {data.experience.map((job) => (
            <article key={job.id} className="xo-entry">
              <p className="xo-when">
                {dateRange(job.startDate, job.endDate, job.currentlyWorking)}
              </p>
              <h3 className="xo-role">{job.role}</h3>
              <p className="xo-where">{[job.company, job.location].filter(Boolean).join(" · ")}</p>
            </article>
          ))}
          {data.education.map((e) => (
            <article key={e.id} className="xo-entry is-school">
              <p className="xo-when">{dateRange(e.startDate, e.endDate, false)}</p>
              <h3 className="xo-role">{e.degree}</h3>
              <p className="xo-where">{e.institution}</p>
            </article>
          ))}
        </>
      )}
    </Frame>
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
