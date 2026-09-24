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
import { WORLD } from "../src/lib/world";

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
  .xw-day-shaft { fill: #e4ddcb; stroke: none; opacity: .055; }
  .xw-day { opacity: 0; }
  .xw-day.is-on { opacity: 1; }
  .xw-outside { opacity: 0; }
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
  .xw-crt-led { fill: #d9a05b; }
  .xw-crt-glow { opacity: .9; }
  .xw-crt-scan { fill: #d9a05b; stroke: none; opacity: .22; }
`;

const noop = () => {};

type Shot = {
  blindDown: boolean;
  ceiling: boolean;
  lamp: boolean;
  at: string | null;
};

async function shoot(name: string, shot: Shot) {
  const body = renderToStaticMarkup(
    createElement(Room, {
      read: [],
      pulling: null,
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

  // The component renders <svg class="xw-svg" viewBox=...> with no width or
  // height, which a browser is happy with and a rasteriser is not.
  const svg = body
    .replace(
      "<svg ",
      `<svg width="${WORLD.w}" height="${WORLD.h}" `,
    )
    
    .replace(/(<svg[^>]*>)/, `$1<style>${INK}</style>`);

  const out = `scratch-room-${name}.png`;
  // Flattened onto the room's own ground. Without it the transparent areas come
  // out white, which inverts the whole drawing and makes a 5% light wash read
  // as a solid slab — the two things this script exists to let somebody judge.
  await sharp(Buffer.from(svg), { density: 96 })
    .resize(WORLD.w, WORLD.h)
    .flatten({ background: "#05060a" })
    .png()
    .toFile(out);
  console.log(`  ${out}`);
}

/** One per lighting state, because each one is a different set of shapes. */
const SHOTS: Record<string, Shot> = {
  dark: { blindDown: true, ceiling: false, lamp: false, at: null },
  lit: { blindDown: false, ceiling: false, lamp: false, at: "window" },
  lamps: { blindDown: true, ceiling: true, lamp: true, at: "desk" },
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
