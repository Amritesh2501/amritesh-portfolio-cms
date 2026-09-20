/**
 * THE AMRITESH FILES — the case structure.
 *
 * What a case is, what evidence sits inside it, where that evidence is in the
 * scene, and which minigame guards it. Pure data and pure functions: no React,
 * no database, no browser. That is deliberate, and it is the same reasoning as
 * lib/world — every failure mode in here (a hotspot nobody can reach, a case
 * whose counter can never fill, a lock whose combination is not derivable from
 * the clues on the wall) shows up as a player quietly giving up rather than as
 * an error anyone would ever see in a log.
 *
 * scripts/check-files.ts asserts those properties.
 *
 * The professional content is NOT here. Evidence entries name a `slot`, and
 * lib/files/dossier fills the slots from the database. This file knows the
 * SHAPE of the investigation; it does not know a single fact about the
 * subject, which is what keeps the game layer fictional and the portfolio
 * layer accurate.
 */

export type CaseId =
  | "about"
  | "experience"
  | "projects"
  | "education"
  | "skills"
  | "certificates";

export type GameId =
  | "timing"
  | "memory"
  | "lock"
  | "search"
  | "sort"
  | "rebuild";

/** The keys lib/files/dossier knows how to fill from the CMS. */
export type SlotId =
  | "identity"
  | "interests"
  | "ethic"
  | "personality"
  | "goals"
  | "method"
  | "toolkit"
  | "secret";

/**
 * A layer's parallax weight. 0 is painted at infinity and never moves; 1 moves
 * exactly with the camera; above 1 is foreground clutter that swings past the
 * lens faster than the room behind it.
 */
export type Depth = number;

/**
 * The three planes every room is drawn on.
 *
 * A hotspot has to sit on one of these exactly, because a hotspot and the
 * object it marks only stay together if they are parallaxed by the same
 * weight. Give a marker a depth of its own and it tracks correctly at the
 * centre of the room and slides off its object everywhere else — which reads
 * as the room being slightly haunted, and is invisible until someone tries to
 * click the thing and misses. check-files asserts membership.
 */
export const LAYERS = { BACK: 0.35, MID: 0.72, NEAR: 1.16 } as const;

export const LAYER_DEPTHS: number[] = Object.values(LAYERS);

export type Hotspot = {
  /** Scene-space centre, in the same units as the scene's WORLD box. */
  x: number;
  y: number;
  /** Hit area. Generous: this is a dark room, not a precision test. */
  w: number;
  h: number;
  depth: Depth;
};

export type Evidence = {
  id: string;
  case: CaseId;
  /** The object in the room, e.g. "Laptop". Shown on the interact prompt. */
  object: string;
  /** The HUD checklist label, e.g. "Identity". Short enough for the rail. */
  label: string;
  /** One line shown while hovering, before the player commits. */
  tease: string;
  /** Which minigame guards it. null means it hands itself over on click. */
  game: GameId | null;
  /** Which piece of the real portfolio it gives back. */
  slot: SlotId;
  where: Hotspot;
  /**
   * Only interactable once the camera is parked at this station. Section 11
   * asks for evidence that is hidden until you look from the right angle;
   * this is that, and it is the whole reason the room is worth panning across
   * rather than clicking through.
   */
  seenFrom?: string;
  /** Optional: needs another evidence collected first. */
  needs?: string;
};

export type Station = {
  id: string;
  name: string;
  /** One line in the HUD while the camera is parked here. */
  blurb: string;
  /** Where the camera sits: scene-space centre plus zoom. */
  cam: { x: number; y: number; z: number };
};

export type Scene = {
  id: string;
  /** The HUD location line, e.g. "SUBJECT'S RESIDENCE". */
  location: string;
  /** Scene-space box every hotspot and camera shot is expressed in. */
  world: { w: number; h: number };
  /** The opening shot, before the player scrolls. */
  establish: { x: number; y: number; z: number };
  stations: Station[];
};

export type Case = {
  id: CaseId;
  /** "01", "02" — the number on the binder spine. */
  index: string;
  /** "ABOUT" — the spine label. */
  name: string;
  /** "CASE AMR-001". */
  code: string;
  /** The environment name, e.g. "THE SUBJECT'S RESIDENCE". */
  place: string;
  /** Key into SCENES: the room this case is investigated in. */
  scene: string;
  /** Shown on the folder face before it opens. */
  synopsis: string;
  /** The HUD objective checklist. */
  objectives: string[];
  /** Cases that must be SOLVED before this binder comes off the shelf. */
  needs?: CaseId;
  /** False while the environment is still being built. */
  playable: boolean;
};

/* ---------------------------------------------------------------------------
   The six binders
   ------------------------------------------------------------------------- */

export const CASES: Case[] = [
  {
    id: "about",
    index: "01",
    name: "ABOUT",
    code: "CASE AMR-001",
    place: "THE SUBJECT'S RESIDENCE",
    scene: "residence",
    synopsis:
      "Personal effects, private notes and an unfiled document. Establish who the subject is before anything he has built is admissible.",
    objectives: [
      "FIND PERSONAL CLUES",
      "SOLVE MINI-GAMES",
      "COLLECT EVIDENCE",
      "LEARN THE STORY",
    ],
    playable: true,
  },
  {
    id: "experience",
    index: "02",
    name: "EXPERIENCE",
    code: "CASE AMR-002",
    place: "THE CORPORATE OFFICE",
    scene: "corporate",
    synopsis:
      "Employment records, badges and handover notes. Establish where the subject has worked and what he was responsible for.",
    objectives: [
      "FIND EMPLOYMENT RECORDS",
      "VERIFY RESPONSIBILITIES",
      "COLLECT EVIDENCE",
      "BUILD THE TIMELINE",
    ],
    needs: "about",
    playable: false,
  },
  {
    id: "projects",
    index: "03",
    name: "PROJECTS",
    code: "CASE AMR-003",
    place: "THE DEVELOPER'S LAB",
    scene: "lab",
    synopsis:
      "Running systems, architecture diagrams and deployment logs. Establish what the subject has actually shipped.",
    objectives: [
      "LOCATE RUNNING SYSTEMS",
      "TRACE THE ARCHITECTURE",
      "COLLECT EVIDENCE",
      "IDENTIFY EACH BUILD",
    ],
    needs: "about",
    playable: false,
  },
  {
    id: "education",
    index: "04",
    name: "EDUCATION",
    code: "CASE AMR-004",
    place: "THE COLLEGE ARCHIVES",
    scene: "college",
    synopsis:
      "Academic records and coursework. Establish the subject's formal training.",
    objectives: [
      "RECOVER ACADEMIC RECORDS",
      "CONFIRM THE INSTITUTION",
      "COLLECT EVIDENCE",
      "ORDER THE TIMELINE",
    ],
    needs: "about",
    playable: false,
  },
  {
    id: "skills",
    index: "05",
    name: "SKILLS",
    code: "CASE AMR-005",
    place: "THE TRAINING FACILITY",
    scene: "training",
    synopsis:
      "Six stations, each testing one discipline. Establish what the subject can do under instruction.",
    objectives: [
      "CLEAR EACH STATION",
      "TEST UNDER INSTRUCTION",
      "COLLECT EVIDENCE",
      "VERIFY THE TOOLKIT",
    ],
    needs: "about",
    playable: false,
  },
  {
    id: "certificates",
    index: "06",
    name: "CERTIFICATES",
    code: "CASE AMR-006",
    place: "THE LOCKED ARCHIVE",
    scene: "archive",
    synopsis:
      "Sealed drawers. Nothing in here opens without evidence carried in from the other five cases.",
    objectives: [
      "OPEN THE SEALED DRAWERS",
      "MATCH ISSUING BODIES",
      "COLLECT EVIDENCE",
      "CLOSE THE ARCHIVE",
    ],
    needs: "about",
    playable: false,
  },
];

export const caseById = (id: string) => CASES.find((c) => c.id === id);

/* ---------------------------------------------------------------------------
   The hub: the officer's room
   ------------------------------------------------------------------------- */

/**
 * Laid out west to east exactly as the reference photograph reads: the case
 * whiteboard and the evidence boxes on the left wall, the binder shelf dead
 * centre as the one thing the room is really about, then the window, the
 * corkboard and the detective's own desk on the right.
 */
/**
 * The hub is a photograph, so every number in here is a pixel in that
 * photograph. The scene box IS the image, which is what keeps the camera, the
 * hotspots and the art in one coordinate system: move something in the
 * picture and you move it here, with no mapping in between to get wrong.
 *
 * Stations run left to right across the frame, so scrolling reads as one
 * continuous sweep of the room rather than as jumping around it.
 */
export const OFFICE: Scene = {
  id: "office",
  location: "INVESTIGATION ROOM",
  world: { w: 1672, h: 941 },
  // Slightly over the cover ratio, so the establishing shot crops the edges
  // instead of showing them.
  establish: { x: 836, y: 470, z: 1.02 },
  stations: [
    {
      id: "board",
      name: "Active cases",
      blurb: "Six open cases. One subject. Only the first is ticked.",
      cam: { x: 150, y: 335, z: 2.05 },
    },
    {
      id: "boxes",
      name: "Evidence boxes",
      blurb: "Recovered evidence ends up in here. Both of them are empty.",
      cam: { x: 200, y: 725, z: 2.9 },
    },
    {
      id: "shelf",
      name: "The file shelf",
      blurb: "Six binders, numbered and labelled. Pull one to open the case.",
      cam: { x: 727, y: 300, z: 2.8 },
    },
    {
      id: "window",
      name: "The window",
      blurb: "Third floor, and the city has not gone to bed either.",
      cam: { x: 1232, y: 365, z: 2.45 },
    },
    {
      id: "desk",
      name: "The desk",
      blurb: "Somebody was working this case before you got here.",
      cam: { x: 1400, y: 660, z: 2.55 },
    },
    {
      id: "corkboard",
      name: "Connections",
      blurb: "People, places, connections. Every file has a story.",
      cam: { x: 1495, y: 300, z: 2.25 },
    },
  ],
};

/**
 * Where the six binders sit in the photograph, one rectangle each.
 *
 * Explicit rather than a start plus a pitch, because the shelf recedes: the
 * binders get narrower and closer together toward the right, and a constant
 * pitch drifts about a third of a spine out of register by the middle of the
 * row. Measured off the frame, in the order CASES lists them, so the lift and
 * the glow land on the binder the player is actually reaching for.
 */
export const OFFICE_BINDERS: ReadonlyArray<Hotspot2D> = [
  { x: 588, y: 214, w: 46, h: 156 },
  { x: 643, y: 215, w: 43, h: 155 },
  { x: 694, y: 216, w: 40, h: 153 },
  { x: 740, y: 217, w: 38, h: 170 },
  { x: 783, y: 218, w: 38, h: 172 },
  { x: 827, y: 219, w: 39, h: 170 },
];

/** A plain rectangle in scene space. */
export type Hotspot2D = { x: number; y: number; w: number; h: number };
/* ---------------------------------------------------------------------------
   Case 01: the residence
   ------------------------------------------------------------------------- */

export const RESIDENCE: Scene = {
  id: "residence",
  location: "SUBJECT'S RESIDENCE",
  world: { w: 3000, h: 1200 },
  // At or above 1.0, or the shot is wider than the room it is establishing and
  // the drawing runs out at the edges of the frame.
  establish: { x: 1500, y: 620, z: 1.06 },
  stations: [
    {
      id: "wall",
      name: "The photo wall",
      blurb: "Pinned photographs, a map, and a poster he clearly meant.",
      cam: { x: 520, y: 380, z: 1.5 },
    },
    {
      id: "bed",
      name: "The bed",
      blurb: "Slept in. A camera and a notebook left on the covers.",
      cam: { x: 760, y: 720, z: 1.45 },
    },
    {
      id: "table",
      name: "The low table",
      blurb: "Where he actually works, whatever the desk is for.",
      cam: { x: 1050, y: 900, z: 1.5 },
    },
    {
      id: "desk",
      name: "The desk",
      blurb: "Two monitors, still on. Something is compiling.",
      cam: { x: 1920, y: 640, z: 1.5 },
    },
    {
      id: "ideas",
      name: "The ideas board",
      blurb: "A list of builds in his own handwriting.",
      cam: { x: 2080, y: 300, z: 1.65 },
    },
    {
      id: "shelf",
      name: "The bookshelf",
      blurb: "Reference, mostly. One shelf is not books at all.",
      cam: { x: 2620, y: 620, z: 1.5 },
    },
    {
      id: "folder",
      name: "The unfiled document",
      blurb: "Stamped CONFIDENTIAL, and it is not police stationery.",
      cam: { x: 2180, y: 1040, z: 1.6 },
    },
  ],
};

export const SCENES: Record<string, Scene> = {
  office: OFFICE,
  residence: RESIDENCE,
};

/* ---------------------------------------------------------------------------
   Case 01 evidence
   ------------------------------------------------------------------------- */

/**
 * Eight pieces, as the reference HUD promises, and every one of them hands
 * back a real field from the CMS rather than a point score.
 *
 * The games are deliberately all different. Two of them lean on the room:
 * `lock` wants a combination that is only written on the walls, and `search`
 * wants an object you have to have actually looked at. That is the difference
 * between a puzzle in a portfolio and a puzzle about one.
 */
export const EVIDENCE: Evidence[] = [
  {
    id: "about-monitors",
    case: "about",
    object: "The monitors",
    label: "Identity",
    tease: "Still logged in. Whoever lives here did not expect company.",
    game: "timing",
    slot: "identity",
    where: { x: 1920, y: 640, w: 420, h: 260, depth: LAYERS.MID },
  },
  {
    id: "about-books",
    case: "about",
    object: "The bookshelf",
    label: "Interests",
    tease: "Not a decorative shelf. These have been opened.",
    game: "memory",
    slot: "interests",
    where: { x: 2620, y: 600, w: 300, h: 420, depth: LAYERS.MID },
  },
  {
    id: "about-wall",
    case: "about",
    object: "The wall text",
    label: "Work Ethic",
    tease: "Four words, written straight onto the paint.",
    game: "sort",
    slot: "ethic",
    where: { x: 1750, y: 250, w: 300, h: 200, depth: LAYERS.BACK },
  },
  {
    id: "about-mug",
    case: "about",
    object: "The mug",
    label: "Personality",
    tease: "Cold. It has been sitting here a while.",
    game: "search",
    slot: "personality",
    where: { x: 1156, y: 876, w: 120, h: 130, depth: LAYERS.NEAR },
  },
  {
    id: "about-ideas",
    case: "about",
    object: "The ideas board",
    label: "Goals",
    tease: "A build list. Some of the boxes are ticked.",
    game: "rebuild",
    slot: "goals",
    where: { x: 2090, y: 300, w: 360, h: 240, depth: LAYERS.BACK },
  },
  {
    id: "about-notebook",
    case: "about",
    object: "The open notebook",
    label: "Method",
    tease: "Left open mid-sentence.",
    game: "sort",
    slot: "method",
    where: { x: 925, y: 880, w: 330, h: 120, depth: LAYERS.NEAR },
  },
  {
    id: "about-backpack",
    case: "about",
    object: "The backpack",
    label: "Toolkit",
    tease: "Packed, not unpacked. He works somewhere else too.",
    game: "timing",
    slot: "toolkit",
    where: { x: 370, y: 905, w: 220, h: 250, depth: LAYERS.NEAR },
  },
  {
    id: "about-folder",
    case: "about",
    object: "The CONFIDENTIAL folder",
    label: "Hidden File",
    tease: "Locked. The combination is somewhere in this room.",
    game: "lock",
    slot: "secret",
    // The payoff. It stays shut until the room has been read, which is what
    // stops it being the first thing a player clicks and the last thing they
    // need to care about.
    needs: "about-ideas",
    seenFrom: "folder",
    where: { x: 2200, y: 1070, w: 420, h: 220, depth: LAYERS.NEAR },
  },
];

export const evidenceById = (id: string) => EVIDENCE.find((e) => e.id === id);

export const evidenceFor = (caseId: CaseId) =>
  EVIDENCE.filter((e) => e.case === caseId);

/** How many pieces a case is worth. Drives every counter in the HUD. */
export const caseTotal = (caseId: CaseId) => evidenceFor(caseId).length;

/**
 * Whether a piece can be interacted with right now.
 *
 * Kept as one predicate rather than scattered `if`s in the scene, because the
 * HUD, the hotspot and the check script all have to agree on it. If they
 * disagree the player sees a prompt that does nothing, which is the single
 * most corrosive bug this kind of game has.
 */
export function isAvailable(
  evidence: Evidence,
  collected: string[],
  station: string | null,
): boolean {
  if (collected.includes(evidence.id)) return false;
  if (evidence.needs && !collected.includes(evidence.needs)) return false;
  if (evidence.seenFrom && evidence.seenFrom !== station) return false;
  return true;
}

/**
 * Every piece of a case is eventually collectable by looking in the right
 * place and solving what is there.
 *
 * This is the property that a cycle in `needs` would break, and it is not
 * observable by playing: a piece that never becomes available simply sits in
 * the HUD unticked while the player re-searches a room that has nothing left
 * in it.
 */
export function isCaseCompletable(caseId: CaseId): boolean {
  const pieces = evidenceFor(caseId);
  const collected: string[] = [];

  // Fixed point: keep taking whatever is currently reachable until a full pass
  // adds nothing. Station gating is satisfiable by definition — the camera can
  // always park anywhere — so only `needs` can actually deadlock.
  for (;;) {
    const next = pieces.filter(
      (e) =>
        !collected.includes(e.id) &&
        (!e.needs || collected.includes(e.needs)),
    );
    if (next.length === 0) break;
    collected.push(...next.map((e) => e.id));
  }

  return collected.length === pieces.length;
}
