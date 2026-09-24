/**
 * The CMS field definitions agree with the columns they write to.
 *
 *   npm run check:resources
 *
 * This exists because of one bug, and the bug was invisible until somebody
 * tried to create a row. A blank optional number parses to null; Prisma sends
 * an explicit null rather than omitting the key; a column declared
 * `Int @default(0)` never sees its default and rejects the write on NOT NULL.
 * Every one of the twelve resources that share the display-order field had it,
 * and nothing anywhere would have said so — not TypeScript, which does not
 * know what a column is, and not the build, which does not talk to a database.
 *
 * So the check reads both sides and compares them: the field definitions in
 * lib/resources, and the actual column declarations in the Prisma schema.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { RESOURCES, buildSchema } from "../src/lib/resources";

const schema = readFileSync(
  path.join(import.meta.dirname, "..", "prisma", "schema.prisma"),
  "utf8",
);

/**
 * Every column of a model, as `name -> declaration`.
 *
 * A text scan rather than a parse. The question is only "is this column
 * nullable", which is a `?` on the type, and that is one regex either way.
 */
function columnsOf(model: string): Map<string, string> {
  // `model` on a ResourceDef is the Prisma client's camelCase accessor.
  const pascal = model[0].toUpperCase() + model.slice(1);
  const block = new RegExp(`^model ${pascal} \\{([\\s\\S]*?)^\\}`, "m").exec(schema);
  assert.ok(block, `no model ${pascal} in schema.prisma`);

  const out = new Map<string, string>();
  for (const line of block[1].split("\n")) {
    const m = /^\s{2}(\w+)\s+(\S+)/.exec(line);
    if (m) out.set(m[1], m[2]);
  }
  return out;
}

let checked = 0;

for (const resource of RESOURCES) {
  const columns = columnsOf(resource.model);

  for (const field of resource.fields) {
    if (field.type !== "number" || field.required) continue;

    const column = columns.get(field.name);
    assert.ok(
      column,
      `${resource.key}.${field.name} is a form field with no column behind it`,
    );

    // `Int?` takes a null and clearing the field should clear the column.
    // `Int` does not, so the field has to say what blank means.
    if (!column.endsWith("?")) {
      assert.notEqual(
        field.whenEmpty,
        undefined,
        `${resource.key}.${field.name} writes to a non-nullable ${column} but has no whenEmpty — ` +
          `a blank field will send null and the write will fail`,
      );
    }
    checked++;
  }

  // And prove it end to end: an otherwise-empty payload must not put a null
  // into any column that cannot hold one.
  const blank: Record<string, unknown> = {};
  for (const field of resource.fields) blank[field.name] = "";
  const parsed = buildSchema(resource).safeParse(blank);

  if (parsed.success) {
    for (const [key, value] of Object.entries(parsed.data as Record<string, unknown>)) {
      const column = columns.get(key);
      if (!column || column.endsWith("?")) continue;
      assert.notEqual(
        value,
        null,
        `${resource.key}: a blank form sends ${key} = null into a non-nullable ${column}`,
      );
    }
  }
}

console.log(
  `check-resources: OK — ${RESOURCES.length} resources, ` +
    `${checked} optional number field${checked === 1 ? "" : "s"} matched to their columns.`,
);
