/**
 * WCAG contrast check for the two palettes in globals.css.
 *
 * Light mode was added long after the dark one, and the whole risk of a second
 * palette is text that is technically themed but not actually readable. This
 * reads the real token values out of the stylesheet rather than a copy of
 * them, resolves the color-mix() derivations, and fails on anything under AA.
 *
 *   node scripts/check-contrast.mjs
 */
import { readFileSync } from "node:fs";

const CSS = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

/** Pulls a `:root`-level block out of the stylesheet by its selector. */
function block(selector) {
  const i = CSS.indexOf(selector + " {");
  if (i === -1) throw new Error(`no ${selector} block`);
  return CSS.slice(i, CSS.indexOf("\n}", i));
}

function tokens(selector) {
  const out = {};
  for (const [, k, v] of block(selector).matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
    out[k] = v.trim();
  }
  return out;
}

const hex = (h) => {
  const s = h.replace("#", "");
  const n = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
};

/** Resolves a token value to rgb, following var() and one color-mix() level. */
function resolve(value, vars, seen = 0) {
  if (seen > 6) throw new Error("var cycle");
  const v = value.trim();
  if (v.startsWith("#")) return hex(v);

  const varMatch = v.match(/^var\((--[\w-]+)\)$/);
  if (varMatch) return resolve(vars[varMatch[1]], vars, seen + 1);

  const mix = v.match(/^color-mix\(in srgb,\s*(.+?)\s+(\d+)%,\s*(.+?)\)$/);
  if (mix) {
    const [, aRaw, pct, bRaw] = mix;
    const a = resolve(aRaw, vars, seen + 1);
    const w = Number(pct) / 100;
    // `transparent` over an opaque backdrop is handled by the caller, which
    // passes the backdrop in as the second colour instead.
    if (bRaw.trim() === "transparent") return a;
    const b = resolve(bRaw, vars, seen + 1);
    return a.map((c, i) => Math.round(c * w + b[i] * (1 - w)));
  }
  throw new Error(`cannot resolve: ${v}`);
}

const lum = (rgb) => {
  const [r, g, b] = rgb.map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const dark = tokens(":root");
const light = { ...dark, ...tokens(':root[data-mode="light"]') };

// [label, foreground token, background token, minimum]
// 4.5 is AA for body text; 3.0 is AA for large text (18px+ or 14px bold).
const CASES = [
  ["body text", "--fg", "--bg", 4.5],
  ["body text on card", "--fg", "--surface", 4.5],
  ["muted text", "--muted", "--bg", 4.5],
  ["muted text on card", "--muted", "--surface", 4.5],
  ["secondary headline", "--fg-soft", "--bg", 4.5],
  ["accent text", "--accent-ink", "--bg", 4.5],
  ["accent text on card", "--accent-ink", "--surface", 4.5],
  ["availability green", "--ok", "--bg", 3.0],
  ["hero copy on water", "--river-fg", "--river-core", 4.5],
  ["hero muted on water", "--river-muted", "--river-core", 4.5],
  ["poster title", "--fg", "--scene-ink", 4.5],
];

let failed = 0;
for (const [mode, vars] of [["dark", dark], ["light", light]]) {
  console.log(`\n${mode}`);
  for (const [label, fg, bg, min] of CASES) {
    const r = ratio(resolve(vars[fg], vars), resolve(vars[bg], vars));
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`  ${ok ? "pass" : "FAIL"}  ${r.toFixed(2)} (min ${min})  ${label}`);
  }
}

console.log(failed ? `\n${failed} pair(s) below AA` : "\nall pairs pass AA");
process.exit(failed ? 1 : 0);
