"use client";

import { useEffect, useState } from "react";
import * as sound from "@/lib/sound";
import { addTo } from "@/lib/save";
import { SLOT, type Facts } from "@/lib/casebook";
import { makeCombo } from "@/lib/dial";
import { dailyRnd } from "@/lib/games";

/**
 * The answering machine on the office desk. Three messages, read aloud by the
 * browser's own speech voice, with a transcript for anyone who cannot or would
 * rather not listen. One of them gives away today's vault combination, which
 * is the whole reason to pick up the phone in one room before the safe in
 * another.
 */

function messages(f: Facts): string[] {
  const p = f.profile;
  const [a, b, c] = makeCombo(dailyRnd("safe"));
  return [
    `Message one. ${p?.name ? `This is for ${p.name}.` : "Hello?"} ${
      p?.availabilityText ?? "Call me back when you get this."
    }`,
    `Message two. Facilities. We reset the vault in the locked archives today. Right to ${a}, left to ${b}, right to ${c}. Please do not write it down.`,
    `Message three. ${
      p?.currentFocus ? `Heard you're working on ${p.currentFocus.replace(/\.$/, "")}. ` : ""
    }Anyway. The lamp in the college reading room has a torch in it, if you need one. Bye.`,
  ];
}

export function Voicemail({ facts, onClose }: { facts: Facts; onClose: () => void }) {
  const [list] = useState(() => messages(facts));
  const [heard, setHeard] = useState<number[]>([]);
  const [playing, setPlaying] = useState<number | null>(null);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => () => {
    if (canSpeak) window.speechSynthesis.cancel();
  }, [canSpeak]);

  const play = (i: number) => {
    sound.beep();
    setHeard((h) => (h.includes(i) ? h : [...h, i]));
    addTo(SLOT.flags, "voicemail");
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(list[i]);
    u.rate = 0.95;
    u.pitch = i === 1 ? 0.8 : 1.05;
    u.onend = () => setPlaying(null);
    setPlaying(i);
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="xa xn" role="dialog" aria-modal="true" aria-label="Answering machine">
      <article className="xa-card">
        <header className="xa-head">
          <p className="xa-kicker">THE DESK PHONE</p>
          <h2 className="xa-title">
            {list.length - heard.length ? `${list.length - heard.length} new messages` : "No new messages"}
          </h2>
        </header>
        <div className="xa-body">
          <ol className="xn-tape">
            {list.map((m, i) => (
              <li key={i} className={playing === i ? "is-playing" : ""}>
                <button type="button" className="btn btn-sm" onClick={() => play(i)}>
                  {playing === i ? "▮▮ Playing" : `▶ Message ${i + 1}`}
                </button>
                {heard.includes(i) ? <p className="xn-transcript">{m}</p> : null}
              </li>
            ))}
          </ol>
          {!canSpeak ? (
            <p className="xa-empty">This browser has no speech voice, so the messages show as text.</p>
          ) : null}
        </div>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          Hang up
        </button>
      </article>
    </div>
  );
}
