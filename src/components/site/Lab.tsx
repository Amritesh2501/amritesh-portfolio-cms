"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  LAB,
  LAB_ARRIVAL,
  LAB_ESTABLISH,
  LAB_PUZZLES,
  LAB_SCREENS,
  LAB_STATIONS,
  labPuzzleById,
  labStationById,
  type LabPuzzleId,
  type LabScreen,
} from "@/lib/lab";
import { frameFor } from "@/lib/world";
import type { CaseRoomData } from "@/lib/content";
import * as sound from "@/lib/sound";
import { LabRoom } from "./LabArt";
import { PathLock } from "./PathLock";
import { Arcade } from "./Arcade";

/**
 * The room through the PROJECTS book.
 *
 * The fourth of the same screen: one CSS transform for the camera, stations
 * rather than a free camera, `frameFor` shared with the other three so a shot
 * behaves identically everywhere.
 *
 * Written out rather than abstracted with the office and the bedroom, for the
 * reason the office already gives: the shared part is a dozen lines of camera
 * effects, and the parts that differ are the parts a shared component would
 * have to take as props anyway.
 */
export function Lab({ data, onBack }: { data: CaseRoomData; onBack: () => void }) {
  const reduce = useReducedMotion();
  const view = useViewport();

  const [at, setAt] = useState<string | null>(null);
  const [cam, setCam] = useState(LAB_ARRIVAL);
  const [camMs, setCamMs] = useState(0);
  const [black, setBlack] = useState(true);
  const [ready, setReady] = useState(false);

  const [open, setOpen] = useState<LabPuzzleId | null>(null);
  /** The machine, once the route has been walked. */
  const [rigOpen, setRigOpen] = useState(false);
  const [lights, setLights] = useState(false);
  const [blindOpen, setBlindOpen] = useState(false);

  const timers = useRef<number[]>([]);
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(window.clearTimeout);
  }, []);

  /* Arriving ---------------------------------------------------------------- */

  useEffect(() => {
    if (reduce) {
      setCam(LAB_ESTABLISH);
      setBlack(false);
      setReady(true);
      return;
    }
    const t1 = window.setTimeout(() => {
      setCamMs(3000);
      setCam(LAB_ESTABLISH);
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
      const station = labStationById(id);
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
    setCam(LAB_ESTABLISH);
    sound.settle();
  }, [reduce]);

  /** Clicking a thing is using the thing: from across the floor this walks over
   *  first and opens on arrival. */
  const reach = useCallback(
    (id: LabPuzzleId) => {
      const puzzle = labPuzzleById(id);
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

  /* Keyboard ---------------------------------------------------------------- */

  const order = useMemo(() => LAB_STATIONS.map((s) => s.id), []);
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

  const shot = useMemo(() => frameFor(cam, view, LAB), [cam, view]);
  const here = at ? labStationById(at) : null;

  return (
    <div className={`xw xl3 ${lights ? "is-lit" : ""}`}>
      <div className="xw-viewport">
        <div
          className="xw-stage"
          style={{
            width: LAB.w,
            height: LAB.h,
            transform: `scale(${shot.z}) translate(${-shot.x}px, ${-shot.y}px)`,
            transitionDuration: `${camMs}ms`,
          }}
        >
          <LabRoom
            at={at}
            lights={lights}
            blindOpen={blindOpen}
            rigOpen={rigOpen}
            onStation={goto}
            onPuzzle={reach}
            onLights={() => {
              setLights((on) => !on);
              sound.latch();
            }}
            onBlind={() => {
              setBlindOpen((on) => !on);
              sound.latch();
            }}
          />
        </div>
      </div>

      <div aria-hidden className={`xw-black ${black ? "is-on" : ""}`} />

      <div className={`xw-hud ${ready ? "is-in" : ""}`}>
        <div className="xw-hud-top">
          <p className="xw-title">WHERE IT GOT MADE</p>
          <p className="xw-count">{rigOpen ? "machine open" : "machine locked"}</p>
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
            {here ? here.blurb : "Somebody's lab, at the hour nobody chooses."}
          </p>

          <div className="xw-stations">
            <button
              type="button"
              className={`xw-station ${at === null ? "is-here" : ""}`}
              onClick={toRoom}
            >
              The floor
            </button>
            {LAB_STATIONS.map((s) => (
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

          {LAB_PUZZLES.filter((p) => p.at === at).map((p) => (
            <div className="xw-files" key={p.id}>
              <button
                type="button"
                className={`xw-file-btn ${p.id === "rig" && rigOpen ? "is-done" : ""}`}
                onClick={() => reach(p.id)}
              >
                <span>{p.name.toUpperCase()}</span>
                <span className="xw-file-s">
                  {p.id !== "rig" ? "OPEN" : rigOpen ? "OPEN" : "LOCKED"}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {open === "rig" ? (
        rigOpen ? (
          <Rig data={data} onClose={() => setOpen(null)} />
        ) : (
          <PathLock onSolved={() => setRigOpen(true)} onClose={() => setOpen(null)} />
        )
      ) : open === "board" ? (
        <Planned data={data} onClose={() => setOpen(null)} />
      ) : open === "arcade" ? (
        <Arcade onClose={() => setOpen(null)} />
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   The machine
   ------------------------------------------------------------------------- */

/**
 * Three screens, and a real switch between them.
 *
 * Not a tab bar dressed as a desktop: the rig in the drawing has three panels
 * and so does this, and the one you are reading is the one lit. The other two
 * stay on screen as the things they are, because the whole reason the room has
 * three monitors is that he is looking at three things at once.
 */
function Rig({ data, onClose }: { data: CaseRoomData; onClose: () => void }) {
  const [screen, setScreen] = useState<LabScreen>("work");
  const here = LAB_SCREENS.find((s) => s.id === screen)!;

  return (
    <div className="xr2" role="dialog" aria-modal="true" aria-label="The machine">
      <div className="xr2-card">
        <header className="xr2-head">
          <p className="xr2-kicker">HIS MACHINE</p>
          <div className="xr2-tabs" role="tablist">
            {LAB_SCREENS.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={s.id === screen}
                className={`xr2-tab ${s.id === screen ? "is-on" : ""}`}
                onClick={() => {
                  setScreen(s.id);
                  sound.keypress();
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
          <p className="xr2-note">{here.note}</p>
        </header>

        <div className="xr2-body" role="tabpanel">
          {screen === "work" ? (
            <Work data={data} />
          ) : screen === "dash" ? (
            <Dash data={data} />
          ) : (
            <Play />
          )}
        </div>

        <button type="button" className="btn btn-sm" onClick={onClose}>
          Step back
        </button>
      </div>
    </div>
  );
}

/** Screen one: everything published. */
function Work({ data }: { data: CaseRoomData }) {
  if (data.projects.length === 0) {
    return (
      <p className="xa-empty">
        No project is published. <strong>Projects</strong> in the CMS.
      </p>
    );
  }
  return (
    <div className="xr2-list">
      {data.projects.map((p) => (
        <article key={p.id} className="xr2-item">
          <p className="xr2-when">{p.year ?? ""}</p>
          <h3 className="xr2-name">
            {p.slug ? <Link href={`/projects/${p.slug}`}>{p.title}</Link> : p.title}
          </h3>
          {p.shortDescription ? <p className="xr2-sub">{p.shortDescription}</p> : null}
          {p.technologies.length > 0 ? (
            <ul className="xr2-chips">
              {p.technologies.map((t) => (
                <li key={t.id}>{t.name}</li>
              ))}
            </ul>
          ) : null}
        </article>
      ))}
    </div>
  );
}

/**
 * Screen two: what the machine is doing.
 *
 * Counted off the same rows the rest of the site reads, so it cannot drift.
 * A dashboard with numbers typed into it is a dashboard that is wrong the first
 * time somebody publishes anything.
 */
function Dash({ data }: { data: CaseRoomData }) {
  const tech = new Set<string>();
  for (const p of data.projects) for (const t of p.technologies) tech.add(t.name);
  for (const j of data.experience) for (const t of j.technologies) tech.add(t.name);

  const years = data.projects.map((p) => p.year).filter((y): y is number => typeof y === "number");

  const tiles = [
    { k: "projects published", v: data.projects.length },
    { k: "distinct technologies", v: tech.size },
    { k: "roles on record", v: data.experience.length },
    { k: "certifications", v: data.certifications.length },
    {
      k: "years covered",
      v: years.length > 0 ? `${Math.min(...years)}–${Math.max(...years)}` : "—",
    },
  ];

  return (
    <div className="xr2-dash">
      {tiles.map((t) => (
        <div key={t.k} className="xr2-tile">
          <p className="xr2-tile-v">{t.v}</p>
          <p className="xr2-tile-k">{t.k}</p>
        </div>
      ))}
    </div>
  );
}

/** Screen three: the cabinet, on a monitor. */
function Play() {
  const [on, setOn] = useState(false);
  if (on) return <Arcade inline onClose={() => setOn(false)} />;
  return (
    <div className="xr2-play">
      <p className="xr2-play-note">
        Two of them, written in an evening each. The cabinet in the corner runs the
        same two.
      </p>
      <button type="button" className="btn btn-solid" onClick={() => setOn(true)}>
        Insert credit
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   The board
   ------------------------------------------------------------------------- */

/** What was planned, in the order it was thought of. The same rows as the
 *  machine, read as intentions rather than as a record. */
function Planned({ data, onClose }: { data: CaseRoomData; onClose: () => void }) {
  return (
    <div className="xa" role="dialog" aria-modal="true" aria-label="The board">
      <article className="xa-card">
        <header className="xa-head">
          <p className="xa-kicker">THE BOARD</p>
          <h2 className="xa-title">Everything that was going to get built</h2>
        </header>
        <div className="xa-body">
          {data.projects.length === 0 ? (
            <p className="xa-empty">
              Nothing pinned yet. <strong>Projects</strong> in the CMS.
            </p>
          ) : (
            <ul className="xr2-notes">
              {data.projects.map((p) => (
                <li key={p.id}>
                  <span className="xr2-notes-n">{p.year ?? "—"}</span>
                  <span>{p.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          Step back
        </button>
      </article>
    </div>
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
