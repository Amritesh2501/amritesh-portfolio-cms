"use client";

import { useEffect, useRef, useState } from "react";
import { Minigame, GAME_META } from "./Minigames";
import type { Evidence } from "@/lib/files/cases";
import type { DossierEntry } from "@/lib/files/dossier";

/**
 * Everything that comes up over a room: the minigame, the thing it pays out,
 * and the pause menu.
 *
 * All three trap focus and close on Escape, because all three are modal in the
 * real sense — the room behind them is frozen, and a player who tabs out of
 * one into a hotspot they cannot see has been dropped out of the fiction with
 * no way to tell what happened.
 */

/** Focus trap + Escape, shared by every overlay here. */
function useModal(onClose?: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const previous = document.activeElement as HTMLElement | null;
    // Focus the panel itself rather than the first control: reading the title
    // before the options is the point of a title.
    node.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = node.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    node.addEventListener("keydown", onKey);
    return () => {
      node.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return ref;
}

/* ---------------------------------------------------------------------------
   The minigame shell
   ------------------------------------------------------------------------- */

export function MinigameShell({
  evidence,
  onSolved,
  onClose,
}: {
  evidence: Evidence;
  onSolved: () => void;
  onClose: () => void;
}) {
  const ref = useModal(onClose);
  const [denied, setDenied] = useState(false);

  const meta = evidence.game ? GAME_META[evidence.game] : null;

  const fail = () => {
    setDenied(true);
    window.setTimeout(() => setDenied(false), 700);
  };

  return (
    <div className="fg-modal">
      <div className="fg-modal-panel" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={meta?.name ?? evidence.object}>
        <header className="fg-modal-head">
          <p className="fg-modal-kicker">{evidence.object.toUpperCase()}</p>
          <h3 className="fg-modal-title">{meta?.name ?? "INSPECT"}</h3>
          <p className="fg-modal-brief">{meta?.brief}</p>
        </header>

        <div className="fg-modal-body">
          {evidence.game ? (
            <Minigame id={evidence.game} onSolved={onSolved} onFail={fail} />
          ) : (
            <button type="button" className="fg-btn fg-btn-wide" onClick={onSolved}>
              TAKE IT
            </button>
          )}
        </div>

        <footer className="fg-modal-foot">
          <button type="button" className="fg-btn fg-btn-ghost" onClick={onClose}>
            BACK OFF
          </button>
          {denied ? <span className="fg-denied">ACCESS DENIED</span> : null}
        </footer>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   The payout
   ------------------------------------------------------------------------- */

export function EvidenceCard({
  evidence,
  entry,
  found,
  total,
  onClose,
}: {
  evidence: Evidence;
  entry: DossierEntry;
  found: number;
  total: number;
  onClose: () => void;
}) {
  const ref = useModal(onClose);

  return (
    <div className="fg-modal is-reward">
      <div className="fg-modal-panel is-doc" ref={ref} tabIndex={-1} role="dialog" aria-modal="true">
        <p className="fg-reward-kicker">EVIDENCE RECOVERED</p>

        <article className={`fg-doc-card${entry.placeholder ? " is-placeholder" : ""}`}>
          <header>
            <span className="fg-doc-tag">{evidence.label.toUpperCase()}</span>
            <h3>{entry.title}</h3>
          </header>
          <div className="fg-doc-body">
            {entry.body.split("\n").filter(Boolean).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
          {entry.tags?.length ? (
            <ul className="fg-doc-tags">
              {entry.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : null}
          <span className="fg-stamp" aria-hidden>
            {entry.placeholder ? "INCOMPLETE" : "LOGGED"}
          </span>
        </article>

        <p className="fg-reward-count">
          CASE FILE UPDATED — {found} / {total}
        </p>

        <button type="button" className="fg-btn fg-btn-wide" onClick={onClose} autoFocus>
          CONTINUE INVESTIGATION
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Pause
   ------------------------------------------------------------------------- */

export type PauseAction =
  | "resume"
  | "save"
  | "load"
  | "restart"
  | "quit"
  | "leave-case";

export function PauseMenu({
  onAction,
  resumeUrl,
  inCase,
  hasSave,
  note,
}: {
  onAction: (action: PauseAction) => void;
  resumeUrl?: string | null;
  inCase: boolean;
  hasSave: boolean;
  note: string | null;
}) {
  const ref = useModal(() => onAction("resume"));
  const [panel, setPanel] = useState<"menu" | "settings" | "credits">("menu");

  return (
    <div className="fg-modal is-pause">
      <div className="fg-pause" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Paused">
        <p className="fg-pause-kicker">INVESTIGATION PAUSED</p>
        <h2 className="fg-pause-title">THE AMRITESH FILES</h2>

        {panel === "menu" ? (
          <ul className="fg-menu">
            <li>
              <button type="button" onClick={() => onAction("resume")}>RESUME</button>
            </li>
            <li>
              <button type="button" onClick={() => onAction("save")}>SAVE</button>
            </li>
            <li>
              <button type="button" onClick={() => onAction("load")} disabled={!hasSave}>
                LOAD
              </button>
            </li>
            <li>
              <button type="button" onClick={() => setPanel("settings")}>SETTINGS</button>
            </li>
            <li>
              {/* Only offered when there is actually a file behind it. A menu
                  item that opens nothing is worse than one that is absent. */}
              {resumeUrl ? (
                <a href={resumeUrl} target="_blank" rel="noreferrer">
                  VIEW RESUME
                </a>
              ) : (
                <button type="button" disabled>VIEW RESUME — NOT ON FILE</button>
              )}
            </li>
            <li>
              <button type="button" onClick={() => setPanel("credits")}>CREDITS</button>
            </li>
            {inCase ? (
              <li>
                <button type="button" onClick={() => onAction("leave-case")}>
                  RETURN TO THE OFFICE
                </button>
              </li>
            ) : null}
            <li>
              <button type="button" onClick={() => onAction("quit")}>QUIT</button>
            </li>
          </ul>
        ) : panel === "settings" ? (
          <div className="fg-panel">
            <p className="fg-panel-line">
              Camera look follows the pointer. It is disabled automatically when
              your system asks for reduced motion.
            </p>
            <p className="fg-panel-line">
              Progress is stored in this browser only. Nothing is uploaded.
            </p>
            <button type="button" className="fg-btn" onClick={() => onAction("restart")}>
              RESTART INVESTIGATION
            </button>
            <button type="button" className="fg-btn fg-btn-ghost" onClick={() => setPanel("menu")}>
              BACK
            </button>
          </div>
        ) : (
          <div className="fg-panel">
            <p className="fg-panel-line">
              An interactive case file for a developer portfolio. The mystery is
              invented. Every fact recovered from it is not.
            </p>
            <p className="fg-panel-line">
              Rooms, puzzles and camera built for this site. Case records read
              live from the portfolio CMS.
            </p>
            <button type="button" className="fg-btn fg-btn-ghost" onClick={() => setPanel("menu")}>
              BACK
            </button>
          </div>
        )}

        {note ? (
          <p className="fg-pause-note" role="status">
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}
