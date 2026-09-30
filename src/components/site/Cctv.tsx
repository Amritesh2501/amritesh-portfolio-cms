"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as sound from "@/lib/sound";
import { addTo, getSave } from "@/lib/save";
import { SLOT } from "@/lib/casebook";
import { caseNo } from "@/lib/secrets";
import { archiveById } from "@/lib/archives";
import type { CaseRoomData } from "@/lib/content";
import { Room } from "./RoomArt";
import { BedroomRoom } from "./BedroomArt";
import { OfficeRoom } from "./OfficeArt";
import { LabRoom } from "./LabArt";
import { ArchiveRoom } from "./ArchiveArt";

/**
 * The camera over the vault door, and the desk it feeds.
 *
 * Two things: the footage (every room in the building on a 3x3 wall, drawn
 * from the same art the rooms use and showing the progress already made in
 * them), and the visitor's own camera, framed as a booking photo. The second
 * never leaves the browser: nothing is uploaded, and the stream is stopped the
 * moment that screen closes.
 */

const none = () => {};

type Feed = { id: string; name: string; draw?: () => React.ReactNode; bulb?: string };

function feeds(): Feed[] {
  const s = getSave();
  const list = (k: string) => (Array.isArray(s[k]) ? (s[k] as string[]) : []);
  const office = list(SLOT.office);
  const bedroom = list(SLOT.bedroom);
  const arch = (id: "college" | "vault" | "training") => {
    const room = archiveById(id);
    const used = list(SLOT.archiveUsed(id));
    return {
      bulb: room.bulb,
      draw: () => (
        <ArchiveRoom
          room={room}
          at={null}
          on={Object.fromEntries(used.map((u) => [u, true]))}
          lights
          shelfLights
          blindOpen={false}
          onStation={none}
          onProp={none}
          onLights={none}
          onShelfLights={none}
          onBlind={none}
        />
      ),
    };
  };

  return [
    {
      id: "case",
      name: "CASE ROOM",
      bulb: "#ffc178",
      draw: () => (
        <Room
          read={list(SLOT.read)}
          at={null}
          blindDown
          ceiling
          lamp
          taken={null}
          onStation={none}
          onFile={none}
          onBoard={none}
          onDesk={none}
          onCord={none}
          onCeiling={none}
          onLamp={none}
        />
      ),
    },
    {
      id: "bedroom",
      name: "BEDROOM",
      bulb: "#ffc178",
      draw: () => (
        <BedroomRoom
          at={null}
          lamp
          ceiling={false}
          blindDown
          drawerOpen={bedroom.includes("drawer")}
          posterDone={bedroom.includes("poster")}
          onStation={none}
          onPuzzle={none}
          onLamp={none}
          onCeiling={none}
          onCord={none}
        />
      ),
    },
    {
      id: "office",
      name: "OFFICE",
      bulb: "#e6f0ff",
      draw: () => (
        <OfficeRoom
          at={null}
          lights
          blindOpen={false}
          bloom={0}
          solved={office}
          onStation={none}
          onPuzzle={none}
          onLights={none}
          onBlind={none}
          onBloom={none}
        />
      ),
    },
    {
      id: "lab",
      name: "LAB",
      bulb: "#cfe6ff",
      draw: () => (
        <LabRoom
          at={null}
          lights
          blindOpen={false}
          rigOpen={s[SLOT.labRig] === true}
          onStation={none}
          onPuzzle={none}
          onLights={none}
          onBlind={none}
        />
      ),
    },
    { id: "college", name: "COLLEGE ARCHIVE", ...arch("college") },
    { id: "vault", name: "LOCKED ARCHIVES", ...arch("vault") },
    { id: "training", name: "TRAINING FLOOR", ...arch("training") },
    { id: "corridor", name: "CORRIDOR" },
  ];
}

/** HH:MM:SS, ticking. The one thing that makes a still drawing read as live. */
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

const stamp = (d: Date) =>
  `${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 8)}`;

export function Cctv({ data, onClose }: { data: CaseRoomData; onClose: () => void }) {
  const [mode, setMode] = useState<"menu" | "footage" | "live">("menu");

  useEffect(() => {
    sound.beep();
  }, [mode]);

  return (
    <div className="xa xv" role="dialog" aria-modal="true" aria-label="Security camera">
      <article className="xa-card xv-card">
        <header className="xa-head">
          <p className="xa-kicker">SECURITY CAMERA · VAULT DOOR</p>
          <h2 className="xa-title">
            {mode === "menu" ? "Monitoring desk" : mode === "footage" ? "Camera footage" : "Live camera"}
          </h2>
        </header>
        <div className="xa-body">
          {mode === "menu" ? (
            <div className="xv-menu">
              <button type="button" className="xv-choice" onClick={() => setMode("footage")}>
                <span className="xv-choice-k">▦ FOOTAGE</span>
                <span>Every camera in the building, on one wall.</span>
              </button>
              <button type="button" className="xv-choice" onClick={() => setMode("live")}>
                <span className="xv-choice-k">● OPEN CAMERA</span>
                <span>Your own camera, as a booking photo. Nothing leaves your browser.</span>
              </button>
            </div>
          ) : mode === "footage" ? (
            <Footage />
          ) : (
            <Live caseId={caseNo(data.profile?.name)} />
          )}
        </div>
        <div className="xv-foot">
          {mode !== "menu" ? (
            <button type="button" className="btn btn-sm" onClick={() => setMode("menu")}>
              ◀ Monitoring desk
            </button>
          ) : null}
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Step back
          </button>
        </div>
      </article>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Footage: nine feeds, and one of them full screen
   ------------------------------------------------------------------------- */

function Footage() {
  const [list] = useState(feeds);
  const [big, setBig] = useState<Feed | null>(null);
  const now = useClock();

  if (big) {
    const i = list.indexOf(big);
    return (
      <div className="xv-big">
        <Screen feed={big} n={i + 1} now={now} big />
        <div className="xv-nav">
          <button type="button" className="btn btn-sm" onClick={() => setBig(list[(i - 1 + list.length) % list.length])}>
            ◀ Previous camera
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setBig(null)}>
            All cameras
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setBig(list[(i + 1) % list.length])}>
            Next camera ▶
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="xv-grid">
      {list.map((f, i) => (
        <button
          key={f.id}
          type="button"
          className="xv-cell"
          onClick={() => {
            setBig(f);
            sound.flick();
          }}
          aria-label={`Camera ${i + 1}, ${f.name}`}
        >
          <Screen feed={f} n={i + 1} now={now} />
        </button>
      ))}
      <div className="xv-cell is-dead" aria-hidden>
        <span className="xv-static" />
        <span className="xv-label">CAM 09 · NO SIGNAL</span>
      </div>
    </div>
  );
}

function Screen({ feed, n, now, big }: { feed: Feed; n: number; now: Date; big?: boolean }) {
  return (
    <span className={`xv-screen ${big ? "is-big" : ""}`}>
      {feed.draw ? (
        <span className="xw is-lit xv-art" style={{ ["--xw-bulb" as string]: feed.bulb }}>
          {feed.draw()}
        </span>
      ) : (
        <span className="xv-static" />
      )}
      <span className="xv-scan" />
      <span className="xv-label">
        CAM {String(n).padStart(2, "0")} · {feed.name}
      </span>
      <span className="xv-rec">● REC</span>
      <span className="xv-time">{stamp(now)}</span>
    </span>
  );
}

/* ---------------------------------------------------------------------------
   Live: the visitor's camera, as a booking photo
   ------------------------------------------------------------------------- */

const FILTERS = [
  { id: "plain", name: "Normal", css: "none" },
  { id: "night", name: "Night vision", css: "grayscale(1) sepia(1) hue-rotate(60deg) saturate(3) brightness(1.1) contrast(1.2)" },
  { id: "cctv", name: "CCTV", css: "grayscale(1) contrast(1.4) brightness(0.95)" },
  { id: "ir", name: "Infrared", css: "invert(1) hue-rotate(180deg) saturate(2)" },
] as const;

function Live({ caseId }: { caseId: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(FILTERS[0]);
  const [shot, setShot] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);
  const [since] = useState(() => Date.now());
  const now = useClock();

  useEffect(() => {
    let dead = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't reach a camera here. It needs a secure (https) page and a camera.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((s) => {
        if (dead) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        if (video.current) video.current.srcObject = s;
        setReady(true);
      })
      .catch((e: DOMException) => {
        setError(
          e.name === "NotAllowedError"
            ? "Camera access was refused. Nothing was recorded. Allow it in the address bar to try again."
            : e.name === "NotFoundError"
              ? "No camera was found on this device."
              : "The camera could not be started. Another app may be using it.",
        );
      });
    return () => {
      dead = true;
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
  }, []);

  const snap = useCallback(() => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.filter = filter.css;
    // Mirrored, the way the preview is, so the photo matches what was seen.
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = "none";

    // The height chart and the placard, burned in.
    const u = c.height / 12;
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = `${Math.round(u * 0.32)}px monospace`;
    for (let i = 1; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * u);
      ctx.lineTo(i % 2 ? c.width * 0.04 : c.width * 0.08, i * u);
      ctx.stroke();
      if (i % 2 === 0) ctx.fillText(`${7 - i / 2}'`, c.width * 0.09, i * u + u * 0.1);
    }
    const ph = u * 1.8;
    ctx.fillStyle = "rgba(10,10,10,0.85)";
    ctx.fillRect(c.width * 0.25, c.height - ph - u * 0.3, c.width * 0.5, ph);
    ctx.fillStyle = "#f4efe4";
    ctx.font = `bold ${Math.round(u * 0.5)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(`CASE ${caseId}`, c.width / 2, c.height - ph + u * 0.35);
    ctx.font = `${Math.round(u * 0.36)}px monospace`;
    ctx.fillText(`VISITOR · ${stamp(new Date())}`, c.width / 2, c.height - ph + u * 1.05);

    setShot(c.toDataURL("image/png"));
    addTo(SLOT.flags, "mugshot");
    setFlash((n) => n + 1);
    sound.shutter();
  }, [filter, caseId]);

  if (error) {
    return (
      <div className="xv-live is-error">
        <p className="xa-empty">{error}</p>
      </div>
    );
  }

  const secs = Math.floor((now.getTime() - since) / 1000);

  return (
    <div className="xv-live">
      <div className="xv-view">
        <video
          ref={video}
          autoPlay
          playsInline
          muted
          style={{ filter: filter.css }}
          aria-label="Your camera"
        />
        <span className="xv-scan" />
        <span className="xv-chart" aria-hidden>
          {[6.5, 6, 5.5, 5, 4.5, 4].map((h) => (
            <span key={h}>{Number.isInteger(h) ? `${h}'` : ""}</span>
          ))}
        </span>
        <span className="xv-corners" aria-hidden />
        <span className="xv-rec">
          ● REC {String(Math.floor(secs / 60)).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")}
        </span>
        <span className="xv-label">CAM 10 · VISITOR</span>
        <span className="xv-time">{stamp(now)}</span>
        <span className="xv-placard">
          CASE {caseId}
          <small>VISITOR · BOOKED {now.toISOString().slice(0, 10)}</small>
        </span>
        {!ready ? <span className="xv-wait">Waiting for the camera…</span> : null}
        <span key={flash} className={flash ? "xv-flash" : ""} aria-hidden />
      </div>

      <div className="xv-tools">
        <div className="xv-filters" role="group" aria-label="Filter">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`xr2-tab ${filter.id === f.id ? "is-on" : ""}`}
              aria-pressed={filter.id === f.id}
              onClick={() => {
                setFilter(f);
                sound.flick();
              }}
            >
              {f.name}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-solid" onClick={snap} disabled={!ready}>
          ◉ Take booking photo
        </button>
      </div>

      {shot ? (
        <div className="xv-shot">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shot} alt="Your booking photo" />
          <a className="btn btn-sm" href={shot} download={`mugshot-${caseId}.png`}>
            Download photo
          </a>
        </div>
      ) : null}
    </div>
  );
}
