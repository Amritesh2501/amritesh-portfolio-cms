/**
 * The experiments world: an officer's room drawn in ink, the shelf in it, and
 * the files on that shelf.
 *
 * This lives outside the "use client" components for the same reason
 * lib/untangle does: a file nothing can reach, a camera that frames the wrong
 * thing, or a generated puzzle that comes out already solved is not a hard
 * game, it is a broken one, and every one of those shows up as a player giving
 * up rather than as an error anyone would ever see. See scripts/check-world.ts.
 *
 * Nothing here touches the database, but the page above it now does: the files
 * on the shelf are the portfolio's own sections and the pins on the board are
 * CMS rows. What stays in this file is the part that is true whatever the rows
 * say — where the camera stands, where a spine is drawn, which file is sealed,
 * and how a list of pins becomes a graph that a force simulation will not
 * divide by zero on.
 */

export type GameId = "untangle" | "order" | "recall";

/** Where the camera stands and how far in it is. */
export type Shot = { x: number; y: number; z: number };

/** The SVG coordinate space the room is drawn in. */
export const WORLD = { w: 2400, h: 1350 } as const;

/* ---------------------------------------------------------------------------
   Where the camera stands
   ------------------------------------------------------------------------- */

export type Station = {
  id: string;
  /** HUD label. */
  name: string;
  /** One line, shown while the camera is parked here. */
  blurb: string;
  /** The world-space point the camera centres, and how far in it goes. */
  cam: Shot;
};

/**
 * The opening shot: the whole room, square on, before the camera is handed
 * over. A zoom of 0.8 is exactly the room's own height against a 16:9 screen,
 * so nothing is cropped and nothing is letterboxed.
 */
export const ESTABLISH: Shot = { x: 1200, y: 675, z: 0.8 };

/**
 * Where the camera lands out of the black.
 *
 * Not the establishing shot. It arrives close on the desk, in the dark, and
 * pulls back to find the room — which is the difference between a room being
 * revealed and a picture being shown.
 */
export const ARRIVAL: Shot = { x: 1080, y: 960, z: 1.6 };

export const STATIONS: Station[] = [
  {
    id: "board",
    // Framed on the board and nothing else. The drawn board is 412 x 512 and
    // this puts a 1920-wide frame about 640 units across it, so it fills the
    // height and most of the width instead of sitting in the middle of a wall
    // — which is what it did at 1.7, and is why walking over to it read as
    // stopping short of it.
    name: "The board",
    blurb: "Photographs, a map, and string between them. Somebody was working.",
    cam: { x: 252, y: 548, z: 3.2 },
  },
  {
    id: "window",
    name: "The window",
    blurb: "A blind, down. The cord is still hanging there.",
    cam: { x: 760, y: 520, z: 1.7 },
  },
  {
    id: "desk",
    name: "The desk",
    blurb: "A lamp still on, a cold cup, and a machine nobody shut down.",
    cam: { x: 1120, y: 940, z: 1.45 },
  },
  {
    id: "shelf",
    name: "The shelf",
    blurb: "Six files, standing upright. Names down the spines.",
    cam: { x: 1440, y: 620, z: 2.3 },
  },
];

export const stationById = (id: string) => STATIONS.find((s) => s.id === id);

/* ---------------------------------------------------------------------------
   The files on the shelf
   ------------------------------------------------------------------------- */

/**
 * Which part of the portfolio a file holds.
 *
 * The room does not carry its own copy of any of this. A topic is a pointer at
 * a table that the CMS already fills, so a file cannot go stale against the
 * site it is a file about — and the one file that is not a topic, `dossier`,
 * is the index over the other five.
 */
export type FileTopic =
  | "about"
  | "experience"
  | "projects"
  | "stack"
  | "certifications"
  | "dossier";

export type CaseFile = {
  id: string;
  /** The number inked on the spine. */
  index: string;
  /** The name down the spine, and the title on the cover. */
  name: string;
  /** The line under the title on the cover. */
  subject: string;
  /** What the cover says is inside, before you open it. */
  brief: string;
  /** Which part of the portfolio the pages hold. */
  topic: FileTopic;
  /** Files that must be read before this one comes off the shelf. */
  needs?: string[];
  /**
   * Where the spine stands, in world units, on the upper shelf board.
   *
   * Explicit per file rather than a pitch, because they lean: a row of
   * perfectly upright files is the fastest way to make a drawing look
   * generated. The lean is drawn from `tilt`.
   */
  spine: { x: number; y: number; w: number; h: number; tilt: number };
};

/**
 * Six files: the portfolio, taken apart and put on a shelf.
 *
 * The shelf used to hold four puzzles. It does not any more — a visitor who
 * has come this far wants the work, not a second lock — and the puzzles moved
 * intact to the machine on the desk, where being optional is the point. What
 * is left here is the site itself, one section per spine, in the order the
 * page reads.
 *
 * Only the last one is gated, and on having READ the others rather than on
 * having solved anything: it is the summary, and a summary handed over before
 * the thing it summarises is just the site with extra steps.
 */
export const FILES: CaseFile[] = [
  {
    id: "about",
    index: "01",
    name: "ABOUT",
    subject: "Who the room belongs to",
    brief: "The short version, the long version, and what he is currently into.",
    topic: "about",
    spine: { x: 1188, y: 492, w: 62, h: 178, tilt: -1.6 },
  },
  {
    id: "experience",
    index: "02",
    name: "EXPERIENCE",
    subject: "Where the time went",
    brief: "Roles, dates, and what each one was actually for. Education at the back.",
    topic: "experience",
    spine: { x: 1272, y: 488, w: 64, h: 184, tilt: 0.9 },
  },
  {
    id: "projects",
    index: "03",
    name: "PROJECTS",
    subject: "The things that shipped",
    brief: "Everything published, with what it was built out of and where it lives.",
    topic: "projects",
    spine: { x: 1358, y: 494, w: 60, h: 176, tilt: -0.7 },
  },
  {
    id: "stack",
    index: "04",
    name: "STACK",
    subject: "The tools, by how often they are reached for",
    brief: "Languages, frameworks and infrastructure, grouped the way they are used.",
    topic: "stack",
    spine: { x: 1442, y: 490, w: 58, h: 180, tilt: 1.4 },
  },
  {
    id: "certifications",
    index: "05",
    name: "CERTIFICATIONS",
    subject: "Paper, and who issued it",
    brief: "The credentials, with the issuer and the date on each one.",
    topic: "certifications",
    spine: { x: 1522, y: 492, w: 62, h: 178, tilt: -1.1 },
  },
  {
    id: "dossier",
    index: "06",
    name: "THE FILE",
    subject: "Everything above, in one place",
    brief:
      "Sealed until the other five have been read. It is the index, and an index is no use before the thing it indexes.",
    topic: "dossier",
    needs: ["about", "experience", "projects", "stack", "certifications"],
    spine: { x: 1608, y: 488, w: 60, h: 182, tilt: 1.8 },
  },
];

export const fileById = (id: string) => FILES.find((f) => f.id === id);

/** What the HUD counts: the files that are content rather than the index. */
export const FILE_COUNT = FILES.filter((f) => f.topic !== "dossier").length;

/** Can this file be taken off the shelf yet? */
export function isUnlocked(file: CaseFile, solved: readonly string[]) {
  return (file.needs ?? []).every((id) => solved.includes(id));
}

/**
 * Every file is eventually openable by solving what is already open.
 *
 * This is what rules out a cycle, or a file waiting on something that is not
 * on the shelf. Neither would throw: the file would simply sit there refusing
 * to come out, with nothing on screen to say why.
 */
export function allFilesReachable(): boolean {
  const solved: string[] = [];
  for (;;) {
    const next = FILES.filter(
      (f) => !solved.includes(f.id) && isUnlocked(f, solved),
    );
    if (next.length === 0) break;
    solved.push(...next.map((f) => f.id));
  }
  return solved.length === FILES.length;
}

/* ---------------------------------------------------------------------------
   Order: put the page back together
   ------------------------------------------------------------------------- */

/** The site's own section order, which is the answer. */
export const PAGE_ORDER = [
  "Hero",
  "Selected work",
  "About",
  "Experience",
  "Stack",
  "Contact",
] as const;

/**
 * A shuffle that is never already the answer.
 *
 * A Fisher-Yates on six items lands on the sorted order about once in every
 * seven hundred and twenty boards. Rare is not never, and a puzzle that opens
 * solved reads as broken rather than lucky, so a shuffle that comes out sorted
 * is rotated by one, which cannot be sorted.
 */
export function shuffleOrder<T>(items: readonly T[], rnd: () => number = Math.random): T[] {
  if (items.length < 2) return [...items];

  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }

  const sorted = out.every((v, i) => v === items[i]);
  return sorted ? [...out.slice(1), out[0]] : out;
}

export function isOrdered<T>(current: readonly T[], answer: readonly T[]) {
  return current.length === answer.length && current.every((v, i) => v === answer[i]);
}

/** Swap two neighbours. Out-of-range is a no-op rather than a throw: it is the
 *  arrow key at the top of the list, not a bug. */
export function swapAt<T>(items: readonly T[], i: number, j: number): T[] {
  if (i < 0 || j < 0 || i >= items.length || j >= items.length) return [...items];
  const out = [...items];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/* ---------------------------------------------------------------------------
   Recall: repeat the beacon
   ------------------------------------------------------------------------- */

/** The four pads the signal transmits on. */
export const SIGNALS = ["WORK", "ABOUT", "STACK", "SAY HI"] as const;

/** How long the sequence runs at each round. Four rounds, then it is yours. */
export const RECALL_ROUNDS = 4;

/**
 * A sequence of pad indices, with no pad used three times running.
 *
 * Not for difficulty: a triple flash is ambiguous to watch, because the gap
 * between two repeats of the same pad is the only thing telling you it was two
 * and not one. Ruling it out removes the one failure that is the animation's
 * fault rather than the player's.
 */
export function buildSequence(
  length: number,
  rnd: () => number = Math.random,
  pads: number = SIGNALS.length,
): number[] {
  // With one pad there is no sequence to get wrong and the no-triples rule can
  // never be satisfied, so the loop below would spin forever. Not a case the
  // game reaches; it is here so the function cannot hang whatever it is given.
  if (pads < 2) return Array.from({ length }, () => 0);

  const out: number[] = [];
  while (out.length < length) {
    const next = Math.floor(rnd() * pads);
    const n = out.length;
    if (n >= 2 && out[n - 1] === next && out[n - 2] === next) continue;
    out.push(next);
  }
  return out;
}

/* ---------------------------------------------------------------------------
   The window
   ------------------------------------------------------------------------- */

/**
 * How far the blind is pulled down, as a fraction of the opening.
 *
 * Two named positions rather than a free slider: the cord is a switch, and the
 * whole point of pulling it is that the room changes. Halfway would change
 * nothing anybody could see.
 */
export const BLIND = { down: 0.96, up: 0.08 } as const;

/** The opening the blind covers, in world units. Shared by the drawing and the
 *  cord, so a blind can never be drawn stopping somewhere the cord did not. */
export const WINDOW_GLASS = { x: 606, y: 376, w: 290, h: 268 } as const;

/**
 * How far the blind travels when the cord is pulled, in world units.
 *
 * Derived rather than typed, so the drawing and the animation cannot drift:
 * moving the window moves both.
 */
export const blindHeight = (down: boolean) =>
  WINDOW_GLASS.h * (down ? BLIND.down : BLIND.up);

/* ---------------------------------------------------------------------------
   The machine on the desk
   ------------------------------------------------------------------------- */

export type AppId =
  | "gallery"
  | "reviews"
  | "suggestions"
  | "diagnostics"
  | "readme";

export type DesktopApp = {
  id: AppId;
  /** Under the icon, and in the title bar of the window it opens. */
  name: string;
  /** One line in the status bar while the icon is selected. */
  hint: string;
};

/**
 * What is on the machine.
 *
 * Five, which is as many as a desktop can hold before it stops reading as
 * somebody's actual computer and starts reading as a menu. The order is the
 * order they sit in down the left edge of the screen.
 */
export const DESKTOP_APPS: DesktopApp[] = [
  {
    id: "gallery",
    name: "Gallery",
    hint: "Every screenshot from every project, at full size.",
  },
  {
    id: "reviews",
    name: "Reviews",
    hint: "What the work was measured on, and what it measured.",
  },
  {
    id: "suggestions",
    name: "Suggestions",
    hint: "Leave a note. It goes to the same inbox as the contact form.",
  },
  {
    id: "diagnostics",
    name: "Diagnostics",
    hint: "Three things that are broken. Whether you fix them is up to you.",
  },
  {
    id: "readme",
    name: "Readme",
    hint: "How this room was built, and why it is not the portfolio.",
  },
];

export const appById = (id: string) => DESKTOP_APPS.find((a) => a.id === id);

/** The three puzzles, now behind the Diagnostics icon rather than on the shelf. */
export const DIAGNOSTICS: { id: GameId; name: string; brief: string }[] = [
  {
    id: "untangle",
    name: "ROUTING",
    brief: "The panel was opened once and put back badly. Pull the nodes apart until no two lines cross.",
  },
  {
    id: "order",
    name: "PAGINATION",
    brief: "Somebody photocopied the portfolio and dropped it down the stairs. Put the sections back in the order the page reads.",
  },
  {
    id: "recall",
    name: "BEACON",
    brief: "Something in this building is still sending. Watch what it plays and repeat it back.",
  },
];

export const PUZZLE_COUNT = DIAGNOSTICS.length;

/* ---------------------------------------------------------------------------
   The evidence board
   ------------------------------------------------------------------------- */

/** One pin, as the board needs it: the CMS row with the noise taken off. */
export type Pin = {
  id: string;
  code: string;
  title: string;
  description: string;
  image: string | null;
  kind: string;
};

/** One thread, by pin index. Undirected: a thread has no arrow on it. */
export type Thread = { source: number; target: number };

/**
 * Turn what the CMS holds into what the simulation runs on.
 *
 * Three things happen here and all three are the difference between a board
 * and a crash:
 *
 *  - a code that names nothing is dropped, because deleting a pin must not
 *    take the board down with it;
 *  - a thread from a pin to itself is dropped, because a force link with the
 *    same node at both ends has zero length and the simulation divides by it;
 *  - A→B and B→A are the same thread and are drawn once, because two threads
 *    between the same pair pull twice as hard and the pair collapses together.
 */
export function buildBoard(
  rows: readonly {
    id: string;
    code: string;
    title: string;
    description?: string | null;
    image?: string | null;
    kind?: string | null;
    linksTo?: readonly string[] | null;
  }[],
): { pins: Pin[]; threads: Thread[] } {
  const pins: Pin[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    description: r.description ?? "",
    image: r.image ?? null,
    kind: (r.kind ?? "PHOTO").toUpperCase(),
  }));

  const indexOf = new Map(pins.map((p, i) => [p.code, i]));
  const seen = new Set<string>();
  const threads: Thread[] = [];

  rows.forEach((row, from) => {
    for (const code of row.linksTo ?? []) {
      const to = indexOf.get(code);
      if (to === undefined || to === from) continue;
      const key = from < to ? `${from}-${to}` : `${to}-${from}`;
      if (seen.has(key)) continue;
      seen.add(key);
      threads.push({ source: from, target: to });
    }
  });

  return { pins, threads };
}

/* ---------------------------------------------------------------------------
   The lights
   ------------------------------------------------------------------------- */

export type Bulb = { id: string; name: string; value: string };

/**
 * What the ceiling fitting can be made to burn.
 *
 * Five, and the first one is the one it starts on. They are real bulb colours
 * rather than a rainbow: a pen drawing lit magenta stops being a room, so the
 * range runs from tungsten to cold white and only then gets strange. The value
 * goes straight into a CSS custom property on the room, so every glow in the
 * drawing follows it without any of them knowing what colour is set.
 */
export const BULBS: Bulb[] = [
  { id: "tungsten", name: "Tungsten", value: "#ffc178" },
  { id: "cold", name: "Cold", value: "#cfe6ff" },
  { id: "amber", name: "Amber", value: "#ff9d3d" },
  { id: "green", name: "Green", value: "#8fe0a6" },
  { id: "rose", name: "Rose", value: "#ff8fb1" },
];

export const bulbById = (id: string) => BULBS.find((b) => b.id === id);

/** The desk lamp does not change colour. A gooseneck lamp burns tungsten. */
export const DESK_BULB = "#ffbe5c";

/* ---------------------------------------------------------------------------
   The camera
   ------------------------------------------------------------------------- */

/**
 * The rectangle of world a camera actually shows, resolved against a viewport.
 *
 * Four things need this answer and until now each one worked it out again:
 * World, to place the stage; check-world, to assert a shot frames what it is
 * supposed to; render-room, to shoot through a station; and now the bedroom.
 * Four copies of a fit-and-clamp is four chances for the check to be asserting
 * something the room does not do.
 *
 * The zoom is scaled down on a narrow screen — a shot framed for a desktop
 * shows three hundred pixels of shelf upright on a phone — and raised again if
 * that would leave the room short of the top and bottom of the screen. Then
 * the centre is clamped so the frame stays inside the room: a station composed
 * on something near an edge wants to centre on it, and centring on it puts a
 * slab of empty stage in shot.
 */
export function frameFor(
  cam: Shot,
  view: { w: number; h: number },
  world: { w: number; h: number },
) {
  const fit = Math.max(Math.min(1, view.w / 1400), 0.45);
  const z = Math.max(cam.z * fit, view.h / world.h);
  const halfW = view.w / (2 * z);
  const halfH = view.h / (2 * z);
  // When the frame is wider than the room there is nothing to clamp to, so it
  // centres instead of snapping to an edge.
  const clamp = (v: number, min: number, max: number) =>
    min > max ? (min + max) / 2 : Math.min(max, Math.max(min, v));
  return {
    z,
    x: clamp(cam.x, halfW, world.w - halfW),
    y: clamp(cam.y, halfH, world.h - halfH),
  };
}
