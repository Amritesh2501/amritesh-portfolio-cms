"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult } from "@/actions/crud";

/**
 * SiteSetting is a key/value table so new settings never need a migration.
 * The admin renders whatever rows exist in a given `group`, which means adding
 * a setting is a seed line, not a code change.
 */
export async function saveSettings(
  group: string,
  values: Record<string, string>,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();

    const known = await prisma.siteSetting.findMany({
      where: { group },
      select: { key: true, type: true, label: true },
    });
    const knownMap = new Map(known.map((k) => [k.key, k]));

    const updates = Object.entries(values).filter(([key]) => knownMap.has(key));
    if (!updates.length) return { ok: false, error: "Nothing to save." };

    for (const [key, raw] of updates) {
      const def = knownMap.get(key)!;
      let value = String(raw ?? "").slice(0, 5000);
      if (def.type === "boolean") value = value === "true" ? "true" : "false";
      if (def.type === "color" && value && !/^#[0-9a-fA-F]{3,8}$/.test(value)) {
        return { ok: false, error: `"${def.label}" must be a hex color.` };
      }
      await prisma.siteSetting.update({
        where: { key },
        data: { value, updatedBy: user.email ?? user.id },
      });
    }

    revalidatePath("/", "layout");
    return { ok: true, message: "Settings saved." };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not save settings.",
    };
  }
}
