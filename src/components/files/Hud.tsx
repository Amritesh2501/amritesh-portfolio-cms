"use client";

import type { Case, Evidence, Scene } from "@/lib/files/cases";
import { CASES } from "@/lib/files/cases";
import { allCaseProgress, percent, type Progress } from "@/lib/files/progress";

/**
 * The investigation interface.
 *
 * Laid out the way the reference frame is: what you are investigating pinned
 * top-left, what you have recovered top-right, how to operate the room
 * bottom-left. It answers the five questions section 1 insists the visitor can
 * always answer, and it answers them without ever covering the middle of the
 * screen, which is where the room is.
 *
 * Everything here is presentational. It reads progress and renders it; it
 * never decides anything, which is why there is only ever one version of the
 * truth to keep in sync.
 */

/* ---------------------------------------------------------------------------
   In-case HUD
   ------------------------------------------------------------------------- */

export function CaseHud({
  file,
  scene,
  evidence,
  progress,
  station,
}: {
  file: Case;
  scene: Scene;
  evidence: Evidence[];
  progress: Progress;
  station: number;
}) {
  const found = evidence.filter((e) => progress.collected.includes(e.id)).length;
  const here = scene.stations[station];

  return (
    <div className="fg-hud" aria-live="polite">
      <div className="fg-hud-tl">
        <p className="fg-hud-code">{file.code}</p>
        <h2 className="fg-hud-title">{file.name}</h2>

        <p className="fg-hud-key">LOCATION</p>
        <p className="fg-hud-val">{scene.location}</p>

        <p className="fg-hud-key">OBJECTIVE</p>
        <ul className="fg-hud-objectives">
          {file.objectives.map((o, i) => (
            // Ticked in order as the case fills: four objectives over eight
            // pieces, so each tick is two finds and the list actually moves.
            <li key={o} className={found >= (i + 1) * (evidence.length / 4) ? "is-done" : ""}>
              <span aria-hidden>{found >= (i + 1) * (evidence.length / 4) ? "☑" : "☐"}</span>
              {o}
            </li>
          ))}
        </ul>

        <p className="fg-hud-quote">
          Same Person.
          <br />
          Different Stories.
          <span>— A.T.</span>
        </p>
      </div>

      <div className="fg-hud-tr">
        <p className="fg-hud-key">EVIDENCE COLLECTED</p>
        <p className="fg-hud-count">
          {found} / {evidence.length}
        </p>
        <ul className="fg-hud-list">
          {evidence.map((e) => {
            const got = progress.collected.includes(e.id);
            return (
              <li key={e.id} className={got ? "is-got" : ""}>
                <span aria-hidden>{got ? "☑" : "☐"}</span>
                {got ? e.label : <span className="fg-redact">{e.label}</span>}
              </li>
            );
          })}
        </ul>
      </div>

      {here ? (
        <div className="fg-hud-station">
          <p className="fg-hud-station-name">{here.name}</p>
          <p className="fg-hud-station-blurb">{here.blurb}</p>
        </div>
      ) : null}

      <Controls />
    </div>
  );
}

function Controls() {
  return (
    <div className="fg-hud-controls" aria-hidden>
      <p>SCROLL OR ← → TO MOVE THROUGH THE ROOM</p>
      <p>CLICK AN OBJECT TO INVESTIGATE</p>
      <p>ESC FOR THE CASE MENU</p>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Hub HUD: the whole investigation at a glance
   ------------------------------------------------------------------------- */

export function HubHud({
  progress,
  station,
  scene,
}: {
  progress: Progress;
  station: number;
  scene: Scene;
}) {
  const pct = percent(progress);
  const cases = allCaseProgress(progress);
  const here = scene.stations[station];

  return (
    <div className="fg-hud" aria-live="polite">
      <div className="fg-hud-tl">
        <p className="fg-hud-code">CASE AMR-001</p>
        <h2 className="fg-hud-title">THE AMRITESH FILES</h2>
        <p className="fg-hud-key">PORTFOLIO EVIDENCE</p>

        <div className="fg-meter" role="img" aria-label={`${pct} per cent recovered`}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="fg-hud-count">{pct}%</p>

        <ul className="fg-hud-cases">
          {cases.map((c) => {
            const file = CASES.find((f) => f.id === c.id)!;
            return (
              <li key={c.id} className={c.solved ? "is-solved" : c.sealed ? "is-sealed" : ""}>
                <span className="fg-hud-case-name">
                  {file.index} {file.name}
                </span>
                <span className="fg-hud-case-count">
                  {c.sealed ? "SEALED" : `${c.found} / ${c.total}`}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {here ? (
        <div className="fg-hud-station">
          <p className="fg-hud-station-name">{here.name}</p>
          <p className="fg-hud-station-blurb">{here.blurb}</p>
        </div>
      ) : null}

      <Controls />
    </div>
  );
}
