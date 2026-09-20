"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LAYERS,
  OFFICE,
  RESIDENCE,
  SCENES,
  caseById,
  evidenceFor,
  isAvailable,
  type Case,
  type Evidence,
} from "@/lib/files/cases";
import {
  caseProgress,
  clearProgress,
  collect,
  emptyProgress,
  isInvestigationComplete,
  loadProgress,
  saveProgress,
  type Progress,
} from "@/lib/files/progress";
import type { Dossier } from "@/lib/files/dossier";
import { Boot } from "./Boot";
import { CaseHud, HubHud } from "./Hud";
import { EvidenceCard, MinigameShell, PauseMenu, type PauseAction } from "./Overlays";
import { FolderCard, FolderPicker, PageTurn } from "./Shelf";
import { Hotspot, Stage, type Layer } from "./Stage";
import { ResidenceBack, ResidenceMid, ResidenceNear } from "./SceneArt";
import { OfficeForeground, OfficeLens, OfficePlate } from "./OfficeRoom";

/**
 * THE AMRITESH FILES — the state machine.
 *
 * Every screen in the experience is one value of `mode`, and every one of them
 * reads the same `progress` object. That is the whole architecture, and it is
 * what section 20 is really asking for: progress cannot reset when you change
 * environment, because changing environment is a mode change and the progress
 * is not stored in the mode.
 *
 * What lives here is sequencing — which screen, which room, which piece of
 * evidence is open. What does not live here is rules: whether a hotspot can be
 * clicked, whether a case is finished, what a percentage is. Those are in
 * lib/files, where they are checked.
 */

type Mode =
  | "boot"
  | "office"
  | "folder"
  | "turn"
  | "case"
  | "solved";

export function TheFiles({
  dossier,
  resumeUrl,
}: {
  dossier: Dossier;
  resumeUrl?: string | null;
}) {
  const [mode, setMode] = useState<Mode>("boot");
  const [progress, setProgress] = useState<Progress>(() => emptyProgress());
  const [hasSave, setHasSave] = useState(false);

  const [station, setStation] = useState(-1);
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [openEvidence, setOpenEvidence] = useState<Evidence | null>(null);
  const [reward, setReward] = useState<Evidence | null>(null);

  const [paused, setPaused] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);

  /* Save state ------------------------------------------------------------ */

  // Only a probe on mount: the save is not applied until the player asks for
  // it. Auto-resuming would drop someone who came back for a second look
  // straight into a half-finished room with no memory of why.
  useEffect(() => {
    setHasSave(loadProgress() !== null);
  }, []);

  const flash = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((t) => (t === message ? null : t)), 2600);
  }, []);

  /* Escape ---------------------------------------------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // The boot screen has nothing to pause, and the overlays close
      // themselves — their own handler stops the event before it reaches here.
      if (mode === "boot" || mode === "turn") return;
      e.preventDefault();
      setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  /* Entering the office --------------------------------------------------- */

  const enterOffice = useCallback(() => {
    setMode("office");
    setActiveCase(null);
    // Section 4: do not reveal the whole room at once. The camera starts
    // parked tight on the desk under a black plate, then pulls back to the
    // establishing shot as the plate lifts.
    setStation(5);
    setRevealing(true);
    window.setTimeout(() => setStation(-1), 900);
    window.setTimeout(() => setRevealing(false), 2400);
  }, []);

  /* Opening a case -------------------------------------------------------- */

  const openCase = useCallback((file: Case) => {
    setActiveCase(file);
    setMode("folder");
  }, []);

  const enterCase = useCallback(() => {
    setMode("turn");
  }, []);

  const caseArrived = useCallback(() => {
    setMode("case");
    setStation(-1);
    setRevealing(true);
    // Matches the plate's own fade, so it is fully gone before it unmounts
    // rather than popping off at four-fifths opacity.
    window.setTimeout(() => setRevealing(false), 2400);
  }, []);

  const leaveCase = useCallback(() => {
    setPaused(false);
    enterOffice();
  }, [enterOffice]);

  /* Evidence -------------------------------------------------------------- */

  const solve = useCallback(() => {
    const piece = openEvidence;
    if (!piece) return;
    setProgress((prev) => collect(prev, piece.id));
    setOpenEvidence(null);
    setReward(piece);
  }, [openEvidence]);

  /**
   * Persist on every find rather than only on SAVE. Losing an hour of
   * investigation to a closed tab is not a lesson anybody needs, and the
   * explicit SAVE in the menu stays meaningful as a named checkpoint.
   *
   * An effect rather than a write inside the state updater: an updater has to
   * be pure, and React is entitled to run it twice.
   */
  useEffect(() => {
    if (progress.collected.length === 0 && progress.flags.length === 0) return;
    if (saveProgress(progress)) setHasSave(true);
  }, [progress]);

  const closeReward = useCallback(() => {
    const piece = reward;
    setReward(null);
    if (!piece || !activeCase) return;

    // Did that finish the case? `progress` is a render behind here, so ask the
    // rules rather than the state: the piece just collected is the one the
    // stale copy is missing.
    const done = evidenceFor(activeCase.id).every(
      (e) => e.id === piece.id || progress.collected.includes(e.id),
    );
    if (done) {
      setMode("solved");
    } else {
      flash("CASE FILE UPDATED");
    }
  }, [reward, activeCase, progress.collected, flash]);

  /* Pause menu ------------------------------------------------------------ */

  const onPauseAction = useCallback(
    (action: PauseAction) => {
      switch (action) {
        case "resume":
          setPaused(false);
          break;
        case "save":
          setNote(
            saveProgress(progress)
              ? "Progress saved to this browser."
              : "This browser refused to store the save.",
          );
          setHasSave(true);
          break;
        case "load": {
          const saved = loadProgress();
          if (!saved) {
            setNote("No saved investigation found.");
            break;
          }
          setProgress(saved);
          setNote("Investigation restored.");
          break;
        }
        case "restart":
          clearProgress();
          setProgress(emptyProgress());
          setHasSave(false);
          setNote("Investigation reset.");
          break;
        case "leave-case":
          leaveCase();
          break;
        case "quit":
          window.location.href = "/";
          break;
      }
    },
    [progress, leaveCase],
  );

  // A note in the pause menu should not outlive the menu.
  useEffect(() => {
    if (!paused) setNote(null);
  }, [paused]);

  /* Rooms ----------------------------------------------------------------- */

  const inRoom = mode === "case" || mode === "solved";
  const hereId = inRoom
    ? SCENES[(activeCase ?? caseById("about")!).scene]?.stations[station]?.id ?? null
    : OFFICE.stations[station]?.id ?? null;

  const officeLayers: Layer[] = useMemo(() => {
    const atShelf = OFFICE.stations[station]?.id === "shelf";
    return [
      {
        // The photograph, and the binder targets registered to it. Same plane,
        // because the targets have to stay on the binders they belong to.
        depth: 1,
        node: <OfficePlate />,
        hot: atShelf && mode === "office" ? (
          <FolderPicker progress={progress} onPick={openCase} />
        ) : null,
      },
      // The front edge of the desk, tracking faster than the room behind it.
      { depth: 1.12, node: <OfficeForeground /> },
    ];
  }, [station, mode, progress, openCase]);

  const residenceLayers: Layer[] = useMemo(() => {
    const file = activeCase ?? caseById("about")!;
    const pieces = evidenceFor(file.id);

    const markers = (depth: number) =>
      pieces
        .filter((piece) => piece.where.depth === depth)
        .map((piece) => {
          const got = progress.collected.includes(piece.id);
          const open = isAvailable(piece, progress.collected, hereId);
          // A piece gated to another camera angle is not drawn at all: the
          // point of section 11 is that you find it by looking, and a greyed
          // marker sitting there would have already found it for you.
          if (!got && !open && piece.seenFrom && piece.seenFrom !== hereId) {
            return null;
          }
          return (
            <Hotspot
              key={piece.id}
              {...piece.where}
              label={piece.object}
              tease={piece.tease}
              state={got ? "done" : open ? "open" : "locked"}
              onPick={() => setOpenEvidence(piece)}
            />
          );
        });

    const w = RESIDENCE.world.w;
    const h = RESIDENCE.world.h;
    return [
      { depth: LAYERS.BACK, node: <ResidenceBack w={w} h={h} />, hot: markers(LAYERS.BACK) },
      { depth: LAYERS.MID, node: <ResidenceMid w={w} h={h} />, hot: markers(LAYERS.MID) },
      { depth: LAYERS.NEAR, node: <ResidenceNear w={w} h={h} />, hot: markers(LAYERS.NEAR) },
    ];
  }, [activeCase, progress, hereId]);

  /* ---------------------------------------------------------------------- */

  if (mode === "boot") {
    return <Boot onEnter={enterOffice} />;
  }

  // The room stops taking input whenever something is on top of it.
  const frozen =
    paused ||
    Boolean(openEvidence) ||
    Boolean(reward) ||
    (mode !== "office" && mode !== "case");

  /* The office ------------------------------------------------------------ */

  if (mode === "office" || mode === "folder" || mode === "turn") {
    const atShelf = OFFICE.stations[station]?.id === "shelf";

    return (
      <div className="fg-root">
        <Stage
          scene={OFFICE}
          layers={officeLayers}
          station={station}
          onStation={setStation}
          frozen={frozen}
        />

        <OfficeLens />

        <HubHud progress={progress} station={station} scene={OFFICE} />

        {!atShelf && mode === "office" ? (
          <button type="button" className="fg-nudge" onClick={() => setStation(2)}>
            GO TO THE FILE SHELF
          </button>
        ) : null}

        {mode === "folder" && activeCase ? (
          <FolderCard
            file={activeCase}
            progress={progress}
            onOpen={enterCase}
            onBack={() => setMode("office")}
          />
        ) : null}

        {mode === "turn" ? <PageTurn onDone={caseArrived} /> : null}

        {revealing ? <div className="fg-plate" aria-hidden /> : null}
        {paused ? (
          <PauseMenu
            onAction={onPauseAction}
            resumeUrl={resumeUrl}
            inCase={false}
            hasSave={hasSave}
            note={note}
          />
        ) : null}
        {toast ? <p className="fg-toast" role="status">{toast}</p> : null}
      </div>
    );
  }

  /* Inside a case --------------------------------------------------------- */

  const file = activeCase ?? caseById("about")!;
  const scene = SCENES[file.scene];
  const pieces = evidenceFor(file.id);
  const prog = caseProgress(progress, file.id);

  return (
    <div className="fg-root">
      <Stage
        scene={scene}
        layers={residenceLayers}
        station={station}
        onStation={setStation}
        frozen={frozen}
      />

      <CaseHud
        file={file}
        scene={scene}
        evidence={pieces}
        progress={progress}
        station={station}
      />

      {openEvidence ? (
        <MinigameShell
          evidence={openEvidence}
          onSolved={solve}
          onClose={() => setOpenEvidence(null)}
        />
      ) : null}

      {reward ? (
        <EvidenceCard
          evidence={reward}
          entry={dossier[reward.slot]}
          found={prog.found}
          total={prog.total}
          onClose={closeReward}
        />
      ) : null}

      {mode === "solved" ? (
        <CaseSolved
          file={file}
          progress={progress}
          finale={isInvestigationComplete(progress)}
          onBack={leaveCase}
        />
      ) : null}

      {revealing ? <div className="fg-plate" aria-hidden /> : null}
      {paused ? (
        <PauseMenu
          onAction={onPauseAction}
          resumeUrl={resumeUrl}
          inCase
          hasSave={hasSave}
          note={note}
        />
      ) : null}
      {toast ? <p className="fg-toast" role="status">{toast}</p> : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Case closed
   ------------------------------------------------------------------------- */

/**
 * The end of a case.
 *
 * Section 24 asks for the recovered evidence to assemble before anything
 * opens, so the pieces fly in and stack before the verdict lands. The full
 * CASE SOLVED / EXPLORE PORTFOLIO ending is gated on every case being built
 * and solved; while five rooms are still unbuilt this closes the section and
 * sends you back to the shelf, which is the truthful version of where the
 * investigation stands.
 */
function CaseSolved({
  file,
  progress,
  finale,
  onBack,
}: {
  file: Case;
  progress: Progress;
  finale: boolean;
  onBack: () => void;
}) {
  const pieces = evidenceFor(file.id);
  const [shown, setShown] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    pieces.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setShown(i + 1), 260 + i * 200));
    });
    const t = timers.current;
    return () => t.forEach(window.clearTimeout);
  }, [pieces]);

  const assembled = shown >= pieces.length;

  return (
    <div className="fg-modal is-solved">
      <div className="fg-solved" role="dialog" aria-modal="true" aria-label="Case section solved">
        <p className="fg-solved-kicker">{file.code}</p>

        <ul className="fg-solved-stack">
          {pieces.map((piece, i) => (
            <li key={piece.id} className={i < shown ? "is-in" : ""} style={{ ["--i" as string]: i }}>
              {piece.label}
            </li>
          ))}
        </ul>

        {assembled ? (
          <>
            <h2 className="fg-solved-title">
              {finale ? "ALL EVIDENCE RECOVERED" : "CASE SECTION SOLVED"}
            </h2>
            <p className="fg-solved-line">
              {finale
                ? "CASE AMR-001 — STATUS: SOLVED"
                : `${file.name} reconstructed. ${progress.collected.length} pieces on file.`}
            </p>
            <button type="button" className="fg-btn fg-btn-wide" onClick={onBack} autoFocus>
              {finale ? "EXPLORE PORTFOLIO" : "RETURN TO THE OFFICE"}
            </button>
          </>
        ) : (
          <p className="fg-solved-line" role="status">
            Assembling recovered evidence…
          </p>
        )}
      </div>
    </div>
  );
}
