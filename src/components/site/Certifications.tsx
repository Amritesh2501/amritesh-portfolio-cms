"use client";

import { useEffect, useRef, useState } from "react";
import type { HomeData } from "@/lib/content";
import { Reveal, RevealGroup, RevealItem } from "./Reveal";

type Cert = HomeData["certifications"][number];

// How far the preview closes the gap to the pointer each frame. Lower trails
// more; 1 sticks to the pointer.
const FOLLOW = 0.16;

/**
 * Certifications as large index rows. Hovering a row floats its certificate
 * image beside the pointer, trailing it slightly and leaning into the motion.
 *
 * One preview element for the whole list, positioned with transform from a
 * rAF loop that only runs while the pointer is over the list. Touch screens
 * have no hover, so they get a small thumbnail in each row instead (CSS).
 */
export function Certifications({ certifications }: { certifications: Cert[] }) {
  const floatRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const raf = useRef(0);
  const [src, setSrc] = useState<string | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const tick = () => {
    const el = floatRef.current;
    if (el) {
      const dx = target.current.x - pos.current.x;
      pos.current.x += dx * FOLLOW;
      pos.current.y += (target.current.y - pos.current.y) * FOLLOW;
      const lean = Math.max(-12, Math.min(12, dx * 0.06));
      el.style.transform = `translate3d(${pos.current.x.toFixed(1)}px, ${pos.current.y.toFixed(1)}px, 0) rotate(${lean.toFixed(2)}deg)`;
    }
    raf.current = requestAnimationFrame(tick);
  };

  const onMove = (e: React.PointerEvent) => {
    target.current = { x: e.clientX, y: e.clientY };
  };

  const enterRow = (cert: Cert, e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !cert.certificateImage) {
      setShown(false);
      return;
    }
    if (!shown) {
      // Appear under the pointer rather than flying in from the last spot.
      target.current = { x: e.clientX, y: e.clientY };
      pos.current = { ...target.current };
    }
    setSrc(cert.certificateImage);
    setShown(true);
    if (!raf.current) raf.current = requestAnimationFrame(tick);
  };

  const leaveList = () => {
    setShown(false);
    cancelAnimationFrame(raf.current);
    raf.current = 0;
  };

  return (
    <div className="mt-24">
      <Reveal>
        <div className="flex items-end justify-between gap-6">
          <p className="t-display text-[clamp(2rem,4.5vw,3.5rem)] text-[var(--fg)]">Certifications</p>
          <span className="chip mb-2">{certifications.length}</span>
        </div>
      </Reveal>

      <RevealGroup
        as="ul"
        className="mt-10 border-t border-[var(--line-strong)]"
        stagger={0.05}
      >
        {certifications.map((cert, i) => {
          const year = cert.issueDate ? new Date(cert.issueDate).getFullYear() : null;
          const body = (
            <>
              <span className="t-meta hidden text-[0.625rem] tabular-nums sm:block">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">
                <span className="cert-name t-display block text-[clamp(1.25rem,2.6vw,2rem)] text-[var(--fg)]">
                  {cert.name}
                </span>
                <span className="t-meta mt-2 block text-[0.6875rem]">{cert.issuer}</span>
              </span>
              <span className="flex items-center gap-5">
                {cert.certificateImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cert.certificateImage}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="cert-thumb"
                  />
                ) : null}
                {year ? (
                  <span className="t-meta hidden text-[0.625rem] tabular-nums sm:block">{year}</span>
                ) : null}
                <span
                  aria-hidden
                  className={`cert-arrow grid h-10 w-10 place-items-center rounded-full border border-[var(--line-strong)] text-[var(--accent-ink)] ${cert.credentialUrl ? "" : "invisible"}`}
                >
                  &#8599;
                </span>
              </span>
            </>
          );
          const row =
            "cert-row grid grid-cols-[1fr_auto] items-center gap-6 border-b border-[var(--line-strong)] py-7 sm:grid-cols-[3rem_1fr_auto]";
          return (
            <RevealItem as="li" key={cert.id}>
              <div
                onPointerEnter={(e) => enterRow(cert, e)}
                onPointerMove={onMove}
                onPointerLeave={leaveList}
              >
                {cert.credentialUrl ? (
                  <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className={row}>
                    {body}
                  </a>
                ) : (
                  <div className={row}>{body}</div>
                )}
              </div>
            </RevealItem>
          );
        })}
      </RevealGroup>

      <div ref={floatRef} aria-hidden className="cert-float">
        <div className={`cert-float-card ${shown ? "is-shown" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {src ? <img src={src} alt="" decoding="async" /> : null}
        </div>
      </div>
    </div>
  );
}
