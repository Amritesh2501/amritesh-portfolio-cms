/**
 * Every class the case room's markup uses has a rule behind it.
 *
 *   npm run check:styles
 *
 * This exists because it has already gone wrong. Deleting a dead block of CSS
 * by character range took forty-one live selectors out with it — both lamps,
 * the daylight, the skyline, the monitor and every rule the file pages use —
 * and nothing failed. TypeScript does not know about CSS, the build does not
 * know about CSS, and a class with no rule behind it renders as an unstyled
 * element rather than as an error. The first report of it was somebody saying
 * the lights had stopped working.
 *
 * Only the room's own prefixes are checked. Tailwind generates its utilities
 * on demand, so asking this question of every class in the codebase would be
 * all false positives; asking it of the hand-written namespaces is exact.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * The hand-written namespaces. Everything else on an element is Tailwind.
 *
 * Adding a namespace and forgetting to add it here is the one way this check
 * can be wrong, and it is quiet when it is: the run still passes, it just
 * stops looking at the new code. It happened once already — two namespaces
 * went in and the count did not move.
 */
const PREFIXES = [
  "xw-", // the case room
  "xp-", // the terminal gate in front of it
  "xb-", // the evidence board
  "xd-", // the machine on the case-room desk
  "xk-", // a file off the shelf
  "xf-", // what is written on its pages
  "xr-", // his room, through the book
  "xc-", // the cipher terminal in it
  "mg-", // the minigames
  "wi-", // selected work on the front page
];

const SRC = path.join(import.meta.dirname, "..", "src");
const CSS = path.join(SRC, "app", "globals.css");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const css = readFileSync(CSS, "utf8");

/**
 * Defined as a rule anywhere in the stylesheet.
 *
 * A plain substring search for `.name` rather than a parse: the question is
 * "does anything in here style this", and a selector can be nested, combined
 * or inside any at-rule. The word boundary is what stops `.xw-file` matching
 * `.xw-file-name`.
 */
const defined = new Set(
  [...css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)].map((m) => m[1]),
);

const used = new Map<string, string>();
for (const file of walk(SRC)) {
  const body = readFileSync(file, "utf8");
  // Every quoted or backticked run that sits in a className, plus the class
  // strings built into template literals alongside them.
  for (const m of body.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g)) {
    const raw = m[1] ?? m[2] ?? m[3] ?? "";
    for (const token of raw.split(/[\s${}?:()|&'"]+/)) {
      if (!token) continue;
      if (!PREFIXES.some((p) => token.startsWith(p))) continue;
      if (!used.has(token)) used.set(token, path.relative(SRC, file));
    }
  }
}

const orphans = [...used].filter(([name]) => !defined.has(name));

if (orphans.length > 0) {
  console.error("\ncheck-styles: classes used with no rule behind them\n");
  for (const [name, file] of orphans) console.error(`  .${name}  (${file})`);
  console.error("");
}

assert.equal(
  orphans.length,
  0,
  `${orphans.length} class${orphans.length === 1 ? "" : "es"} used in markup with no CSS rule`,
);

console.log(
  `check-styles: OK — ${used.size} room classes used, every one of them styled.`,
);
