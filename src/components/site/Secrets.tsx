"use client";

import { useEffect, useRef, useState } from "react";
import * as sound from "@/lib/sound";
import { useSaved } from "@/lib/save";
import { SLOT } from "@/lib/casebook";
import {
  CONSOLE_WORD,
  HIDDEN,
  KONAMI,
  caseNo,
  endsWith,
  uvNotes,
  type Hidden,
  type Subject,
} from "@/lib/secrets";

/**
 * The case room's easter eggs: hidden evidence in the drawing, a blacklight on
 * the Konami code, and a word the DevTools console gives away.
 *
 * State lives in one hook so World only has to place two things: the hiding
 * spots inside the camera's stage (so they move with the room) and the cards
 * above it.
 */
export function useSecrets() {
  const [found, setFound] = useSaved<string[]>(SLOT.hidden, []);
  const [shown, setShown] = useState<Hidden | null>(null);
  const [uv, setUv] = useState(false);
  const [pin, setPin] = useState(false);
  const keys = useRef<string[]>([]);

  useEffect(() => {
    // For whoever opens DevTools. Printed once per visit to the room.
    console.log(
      "%cCASE ROOM — EVIDENCE LOG",
      "background:#f2c200;color:#000;font:700 14px monospace;padding:4px 10px;letter-spacing:.2em",
    );
    console.log(
      `%cYou're looking in the right places. Back in the room, type the word investigators dust for.\n(${CONSOLE_WORD.length} letters, starts with "${CONSOLE_WORD[0]}")`,
      "color:#d9a05b;font:12px monospace",
    );
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // ponytail: 16-key buffer, enough for the longest sequence.
      keys.current = [...keys.current, e.key].slice(-16);
      if (endsWith(keys.current, KONAMI)) {
        keys.current = [];
        setUv((v) => !v);
        sound.latch();
      } else if (endsWith(keys.current, [...CONSOLE_WORD])) {
        keys.current = [];
        setPin(true);
        sound.recovered();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const find = (h: Hidden) => {
    setShown(h);
    setFound((f) => {
      if (f.includes(h.id)) return f;
      sound.recovered();
      return [...f, h.id];
    });
  };

  return { found, shown, setShown, uv, setUv, pin, setPin, find };
}

type Secrets = ReturnType<typeof useSecrets>;

/** The hiding spots, in world units. Rendered inside .xw-stage. */
export function Hideouts({ s }: { s: Secrets }) {
  return (
    <div className="xs-layer">
      {HIDDEN.map((h) => {
        const got = s.found.includes(h.id);
        return (
          <button
            key={h.id}
            type="button"
            className={`xs-spot ${got ? "is-found" : ""}`}
            style={{
              left: h.at.x - h.at.r,
              top: h.at.y - h.at.r,
              width: h.at.r * 2,
              height: h.at.r * 2,
            }}
            onClick={() => s.find(h)}
            aria-label={got ? `Evidence ${h.tag}: ${h.label}` : "Something here"}
          >
            {got ? <span className="xs-tent">{h.tag}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Cards over the room: found evidence, the UV notes, the secret pin. */
export function SecretCards({ s, profile }: { s: Secrets; profile: Subject | null }) {
  const notes = uvNotes(profile);

  return (
    <>
      {s.uv ? (
        <div className="xs-uv" role="status">
          <p className="xs-uv-head">UV LIGHT ON: written in ink you weren't supposed to see</p>
          {notes.length ? (
            notes.map((n, i) => (
              <p key={i} className="xs-uv-note" style={{ rotate: `${(i % 2 ? 1 : -1) * (1 + i)}deg` }}>
                {n}
              </p>
            ))
          ) : (
            <p className="xs-uv-note">Nothing glows. Philosophy, focus and interests are empty in the CMS.</p>
          )}
          <button type="button" className="xw-station" onClick={() => s.setUv(false)}>
            Lights off
          </button>
        </div>
      ) : null}

      {s.shown ? (
        <Card onClose={() => s.setShown(null)} stamp={`EVIDENCE #${s.shown.tag}`}>
          <p className="xs-card-title">{s.shown.label}</p>
          <p>{s.shown.text(profile)}</p>
          <p className="xs-card-foot">
            {s.found.length} / {HIDDEN.length} hidden items recovered
            {s.found.length === HIDDEN.length ? ". Scene fully processed." : ""}
          </p>
        </Card>
      ) : null}

      {s.pin ? (
        <Card onClose={() => s.setPin(false)} stamp="EX-00 · CLASSIFIED">
          <p className="xs-card-title">The pin nobody put on the board</p>
          <p>
            Case {caseNo(profile?.name)}. The subject is{" "}
            <strong>{profile?.name ?? "unknown"}</strong>
            {profile?.headline ? `, ${profile.headline}` : ""}.
          </p>
          <p className="xs-card-links">
            {profile?.email ? <a href={`mailto:${profile.email}`}>Make contact</a> : null}
            {profile?.resumeUrl ? (
              <a href={profile.resumeUrl} target="_blank" rel="noreferrer">
                Full record (résumé)
              </a>
            ) : null}
          </p>
        </Card>
      ) : null}
    </>
  );
}

function Card({
  stamp,
  onClose,
  children,
}: {
  stamp: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Capture phase, so the room's own Escape doesn't also walk you out.
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div className="xs-card" role="dialog" aria-label={stamp}>
      <span className="xs-stamp">{stamp}</span>
      {children}
      <button type="button" className="xw-station" onClick={onClose} autoFocus>
        Bag it
      </button>
    </div>
  );
}
