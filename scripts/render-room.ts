/**
 * Render the case room to a PNG, so somebody can look at it.
 *
 *   npm run room                  every lighting state
 *   npm run room -- lamps         one of them: dark, lit, lamps
 *
 * The room only exists behind a terminal, a click and a camera, which makes
 * "is the monitor standing on the chair" a question that costs a dev server and
 * four interactions to answer. This renders the drawing straight out of
 * react-dom/server, wraps it in the handful of styles the ink needs, and puts
 * it through sharp — so the answer costs one command.
 *
 * It renders the ESTABLISHING view: the whole room, flat, no camera. That is
 * deliberately not what a visitor sees, because the point is to check the
 * drawing rather than the framing.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import sharp from "sharp";
import { Room } from "../src/components/site/RoomArt";
import { BedroomRoom } from "../src/components/site/BedroomArt";
import { OfficeRoom } from "../src/components/site/OfficeArt";
import { LabRoom } from "../src/components/site/LabArt";
import { WORLD, stationById } from "../src/lib/world";
import { BEDROOM, bedStationById } from "../src/lib/bedroom";
import { OFFICE, officeStationById } from "../src/lib/office";
import { LAB, labStationById } from "../src/lib/lab";

/**
 * The ink, inlined.
 *
 * A copy of the rules in globals.css that decide what the drawing LOOKS like,
 * because that file is a Tailwind entry point and cannot be handed to a
 * rasteriser. It is a copy and it can drift; it drifts in the direction of this
 * preview looking wrong rather than the site looking wrong, which is the safe
 * direction for a script nothing ships.
 */
const INK = `
  .xw-svg { background: #05060a; }
  .xw-line { fill: none; stroke: #e4ddcb; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; opacity: .82; }
  .xw-thin { stroke-width: 1.3; }
  .xw-solid { fill: #05060a; }
  .xw-faint { opacity: .38; }
  .xw-fill { fill: #e4ddcb; stroke: none; }
  .xw-hatch { stroke: #e4ddcb; stroke-width: 1; stroke-linecap: round; opacity: .22; fill: none; }
  .xw-hot-line { fill: none; stroke: #d9a05b; stroke-width: 1.6; opacity: .55; }
  .xw-glow { opacity: .4; }
  .xw-hit { fill: transparent; stroke: none; }
  .xw-file-index, .xw-file-name { fill: #e4ddcb; stroke: none; font-family: monospace; font-size: 22px; letter-spacing: .12em; opacity: .75; }
  .xw-file-name { font-size: 14px; letter-spacing: .16em; }
  .xw-file.is-locked .xw-line, .xw-file.is-locked .xw-file-index, .xw-file.is-locked .xw-file-name { opacity: .3; }
  .xw-blind-face { fill: #1a1c22; stroke: none; }
  .xw-day-shaft { fill: #cfe0ff; stroke: none; opacity: .06; }
  .xw-day { opacity: 0; }
  .xw-day.is-on { opacity: 1; }
  .xw-outside { opacity: 0; }
  .xw-day-pool { fill: #cfe0ff; stroke: none; opacity: .05; }
  .xw-day-glow { fill: #cfe0ff; stroke: none; opacity: .09; }
  .xw-city { opacity: 0; }
  .xw-outside.is-open .xw-city, .xw-bed-out .xw-city { opacity: 1; }
  .xw-city-lit { fill: #cfe0ff; stroke: none; opacity: .32; }
  .xw-city-lit.is-warm { fill: #ffcf8a; opacity: .5; }
  .xw-outside.is-open { opacity: 1; }
  .xw-cord-bead { fill: #d9a05b; stroke: none; }
  .xw-bulb-light, .xw-lamp-light { opacity: 0; }
  .xw-pendant.is-on .xw-bulb-light, .xw-lamp.is-on .xw-lamp-light { opacity: 1; }
  .xw-bulb-cone, .xw-lamp-cone { fill: #ffc178; stroke: none; opacity: .09; }
  .xw-bulb-pool, .xw-lamp-pool { fill: #ffc178; stroke: none; opacity: .14; }
  .xw-lamp-cone { fill: #ffbe5c; }
  .xw-lamp-pool { fill: #ffbe5c; opacity: .18; }
  .xw-bulb-core, .xw-lamp-core { fill: #e4ddcb; stroke: none; opacity: .18; }
  .xw-pendant.is-on .xw-bulb-core { fill: #ffc178; opacity: 1; }
  .xw-lamp.is-on .xw-lamp-core { fill: #ffbe5c; opacity: 1; }
  .xw-key { fill: none; stroke: #e4ddcb; stroke-width: .8; opacity: .3; }
  .xw-pen { fill: none; stroke: #e4ddcb; stroke-width: 2.4; stroke-linecap: round; opacity: .8; }
  .xw-steam path { fill: none; stroke: #e4ddcb; stroke-width: 1.6; opacity: 0; }
  .xw-crt-led { fill: #d9a05b; }
  .xw-crt-glow { opacity: .9; }
  .xw-crt-scan { fill: #d9a05b; stroke: none; opacity: .22; }
  .xw-bed-sky-fill { fill: #cfe0ff; opacity: .1; }
  .xw-bed-sun { fill: #ffcf8a; opacity: .3; }
  .xw-bed-poster-live .xw-line { stroke: #d9a05b; }
  .xw-bed-sum { fill: #d9a05b; stroke: none; font-family: monospace; font-size: 22px; }
  .xw-bed-term-glow .xw-line { stroke: #7fe0a8; opacity: .85; }
  .xw-bed-term-caret { fill: #7fe0a8; }
  .xw-office-tubes .xw-bulb-core { fill: #dff1f5; opacity: .14; }
  .xw-pendant.is-on .xw-office-tubes .xw-bulb-core { fill: #dff1f5; opacity: .9; }
  .xw-office-diagram rect { fill: none; stroke: #e4ddcb; opacity: .5; }
  .xw-office-edge path { fill: none; stroke: #d9a05b; stroke-width: 1.6; opacity: .55; }
  .xw-office-ports circle { fill: none; stroke: #e4ddcb; opacity: .6; }
  .xw-office-cable path { fill: none; stroke: #d9a05b; stroke-width: 2; stroke-linecap: round; opacity: .6; }
  .xw-office-tile { stroke: none; opacity: .55; }
  .xw-office-tile.is-k0 { fill: #e2564a; }
  .xw-office-tile.is-k1 { fill: #e0a33c; }
  .xw-office-tile.is-k2 { fill: #4fb477; }
  .xw-office-tile.is-k3 { fill: #4a86d8; }
  .xw-office-tile.is-k4 { fill: #9a6fd0; }
  .xw-office-slats rect { fill: #1a1c22; stroke: none; }
  .xw-office-slats.is-open rect { fill: #101218; }
  .xw-office-bloom ellipse, .xw-office-bloom-eye { fill: #e0a33c; stroke: none; opacity: .62; }
  .xw-office-bloom-eye { opacity: .95; }
  .xw-lab-note { fill: #16171d; stroke: #8b8578; stroke-width: 1; }
  .xw-lab-pin { fill: #d9a05b; stroke: none; opacity: .8; }
  .xw-lab-crt-glass { fill: #071016; stroke: #6b7076; stroke-width: 1.4; }
  .xw-lab-crt-art path, .xw-lab-crt-art rect { fill: #7fe0d8; stroke: none; opacity: .72; }
  .xw-lab-glass rect { fill: #14161c; stroke: none; }
  .xw-lab-rig.is-open .xw-lab-glass rect { fill: #101a26; }
  .xw-lab-lock rect { fill: none; stroke: #4a4f55; stroke-width: .8; }
  .xw-lab-bar { fill: #4fb477; stroke: none; opacity: .75; }
  .xw-lab-chip { fill: #d9a05b; stroke: none; opacity: .8; }
  .xw-lab-row { fill: none; stroke: #e4ddcb; stroke-width: 3; opacity: .45; }
  .xw-lab-play path, .xw-lab-play rect { fill: #7fe0d8; stroke: none; opacity: .8; }
`;

const noop = () => {};

type Shot = {
  /** Which room. A different drawing each, the same camera maths, so one
   *  script shoots all three. */
  bed?: boolean;
  office?: boolean;
  lab?: boolean;
  blindDown: boolean;
  ceiling: boolean;
  lamp: boolean;
  at: string | null;
  /** Render through this stations camera instead of flat. Answers the only
   *  question a flat render cannot: what is actually IN frame when the
   *  player walks over to a thing. */
  through?: string;
};

async function shoot(name: string, shot: Shot) {
  const world = shot.lab ? LAB : shot.office ? OFFICE : shot.bed ? BEDROOM : WORLD;
  const body = shot.lab
    ? renderToStaticMarkup(
        createElement(LabRoom, {
          at: shot.at,
          lights: shot.ceiling,
          blindOpen: !shot.blindDown,
          rigOpen: shot.lamp,
          onStation: noop,
          onPuzzle: noop,
          onLights: noop,
          onBlind: noop,
        }),
      )
    : shot.office
    ? renderToStaticMarkup(
        createElement(OfficeRoom, {
          at: shot.at,
          lights: shot.ceiling,
          // The office's louvres stand in for the other two rooms' blinds, so
          // one flag shoots the shut and the open state of all three.
          blindOpen: !shot.blindDown,
          bloom: 0,
          solved: [],
          onStation: noop,
          onPuzzle: noop,
          onLights: noop,
          onBlind: noop,
          onBloom: noop,
        }),
      )
    : shot.bed
    ? renderToStaticMarkup(
        createElement(BedroomRoom, {
          at: shot.at,
          lamp: shot.lamp,
          ceiling: shot.ceiling,
          blindDown: shot.blindDown,
          drawerOpen: false,
          posterDone: false,
          onStation: noop,
          onPuzzle: noop,
          onLamp: noop,
          onCeiling: noop,
          onCord: noop,
        }),
      )
    : renderToStaticMarkup(
    createElement(Room, {
      read: [],
      taken: null,
      ...shot,
      onStation: noop,
      onFile: noop,
      onBoard: noop,
      onDesk: noop,
      onCord: noop,
      onCeiling: noop,
      onLamp: noop,
    }),
  );

  /**
   * The frame, in world units.
   *
   * Flat, that is the whole room. Through a station it is the rectangle that
   * station's camera actually shows, worked out with the same fit, zoom and
   * clamp World uses — so what comes out is what a player at 1920x1080 sees,
   * not an approximation of it.
   */
  const VIEW = { w: 1920, h: 1080 };
  let box: { x: number; y: number; w: number; h: number } = {
    x: 0,
    y: 0,
    w: world.w,
    h: world.h,
  };
  const station = shot.through
    ? shot.lab
      ? labStationById(shot.through)
      : shot.office
      ? officeStationById(shot.through)
      : shot.bed
        ? bedStationById(shot.through)
        : stationById(shot.through)
    : null;
  if (station) {
    const cam = station.cam;
    const fit = Math.max(Math.min(1, VIEW.w / 1400), 0.45);
    const z = Math.max(cam.z * fit, VIEW.h / world.h);
    const w = VIEW.w / z;
    const h = VIEW.h / z;
    const clamp = (v: number, a: number, b: number) =>
      a > b ? (a + b) / 2 : Math.min(b, Math.max(a, v));
    box = {
      x: clamp(cam.x, w / 2, world.w - w / 2) - w / 2,
      y: clamp(cam.y, h / 2, world.h - h / 2) - h / 2,
      w,
      h,
    };
  }

  // The component renders <svg class="xw-svg" viewBox=...> with no width or
  // height, which a browser is happy with and a rasteriser is not.
  const out = `scratch-room-${name}.png`;
  const px = station ? VIEW : { w: world.w, h: world.h };
  const svg = body
    .replace(
      /<svg [^>]*viewBox="[^"]*"/,
      `<svg width="${px.w}" height="${px.h}" viewBox="${box.x} ${box.y} ${box.w} ${box.h}"`,
    )
    .replace(/(<svg[^>]*>)/, `$1<style>${INK}</style>`);

  // Flattened onto the room's own ground. Without it the transparent areas come
  // out white, which inverts the whole drawing and makes a 5% light wash read
  // as a solid slab — the two things this script exists to let somebody judge.
  await sharp(Buffer.from(svg), { density: 96 })
    .resize(px.w, px.h)
    .flatten({ background: "#05060a" })
    .png()
    .toFile(out);
  console.log(`  ${out}${station ? `  (through ${shot.through})` : ""}`);
}

/** One per lighting state, because each one is a different set of shapes. */
const SHOTS: Record<string, Shot> = {
  dark: { blindDown: true, ceiling: false, lamp: false, at: null },
  lit: { blindDown: false, ceiling: false, lamp: false, at: "window" },
  lamps: { blindDown: true, ceiling: true, lamp: true, at: "desk" },
  // What the player actually sees on arriving at each thing. These are the
  // shots that decide whether walking over to something feels like arriving
  // at it or stopping short of it.
  board: { blindDown: true, ceiling: true, lamp: false, at: "board", through: "board" },
  shelf: { blindDown: true, ceiling: true, lamp: false, at: "shelf", through: "shelf" },
  desk: { blindDown: true, ceiling: false, lamp: true, at: "desk", through: "desk" },
  window: { blindDown: false, ceiling: false, lamp: false, at: "window", through: "window" },

  // The room through the book.
  bed: { bed: true, blindDown: false, ceiling: false, lamp: false, at: null },
  "bed-lamp": { bed: true, blindDown: false, ceiling: false, lamp: true, at: null },
  "bed-posters": { bed: true, blindDown: false, ceiling: false, lamp: false, at: "posters", through: "posters" },
  "bed-side": { bed: true, blindDown: false, ceiling: false, lamp: true, at: "side", through: "side" },
  "bed-desk": { bed: true, blindDown: false, ceiling: false, lamp: false, at: "desk", through: "desk" },

  // The office, through the EXPERIENCE book.
  office: { office: true, blindDown: false, ceiling: true, lamp: false, at: null },
  "office-shut": { office: true, blindDown: true, ceiling: true, lamp: false, at: null },
  "office-dark": { office: true, blindDown: false, ceiling: false, lamp: false, at: null },
  "office-board": { office: true, blindDown: false, ceiling: true, lamp: false, at: "board", through: "board" },
  "office-rack": { office: true, blindDown: false, ceiling: true, lamp: false, at: "rack", through: "rack" },
  "office-desk": { office: true, blindDown: false, ceiling: true, lamp: false, at: "desk", through: "desk" },
  // The lab, through the PROJECTS book.
  lab: { lab: true, blindDown: false, ceiling: false, lamp: true, at: null },
  "lab-dark": { lab: true, blindDown: true, ceiling: false, lamp: false, at: null },
  "lab-rig": { lab: true, blindDown: false, ceiling: false, lamp: true, at: "rig", through: "rig" },
  "lab-arcade": { lab: true, blindDown: false, ceiling: false, lamp: false, at: "arcade", through: "arcade" },
  "lab-board": { lab: true, blindDown: false, ceiling: false, lamp: false, at: "board", through: "board" },
};

async function main() {
  const only = process.argv[2];
  const names = only ? [only] : Object.keys(SHOTS);
  console.log("\nRendering the case room\n");
  for (const name of names) {
    const shot = SHOTS[name];
    if (!shot) {
      console.error(`  no shot called "${name}". Try: ${Object.keys(SHOTS).join(", ")}`);
      process.exitCode = 1;
      continue;
    }
    await shoot(name, shot);
  }
  console.log("\nDone.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
