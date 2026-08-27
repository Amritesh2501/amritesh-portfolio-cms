"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  buildSchema,
  getResource,
  rowFields,
  type ResourceDef,
} from "@/lib/resources";

export type ActionResult = {
  ok: boolean;
  id?: string;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/** Prisma has no public index signature for delegates; this is the one cast. */
function delegate(model: string) {
  return (prisma as unknown as Record<string, Record<string, Function>>)[model];
}

function requireResource(key: string): ResourceDef {
  const resource = getResource(key);
  if (!resource) throw new Error(`Unknown resource "${key}".`);
  return resource;
}

function friendlyError(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      const target = (e.meta?.target as string[] | undefined)?.join(", ");
      return `That ${target ?? "value"} is already taken. Pick another one.`;
    }
    if (e.code === "P2025") return "That record no longer exists.";
    if (e.code === "P2003") return "Another record still references this one.";
  }
  if (e instanceof Error && e.message === "UNAUTHORIZED") {
    return "Your session expired. Sign in again.";
  }
  if (e instanceof Error && e.message.includes("Can't reach database")) {
    return "The database is unreachable. Is Postgres running?";
  }
  return e instanceof Error ? e.message : "Something went wrong.";
}

/** Public site + admin lists both need refreshing after any write. */
function revalidateEverything() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------

export async function saveResource(
  key: string,
  id: string | null,
  values: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const resource = requireResource(key);

    const parsed = buildSchema(resource).safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (typeof path === "string") {
          (fieldErrors[path] ??= []).push(issue.message);
        }
      }
      return {
        ok: false,
        error: "Fix the highlighted fields.",
        fieldErrors,
      };
    }

    const data = { ...parsed.data } as Record<string, unknown>;
    const children = rowFields(resource);
    const childPayloads: Record<string, Record<string, unknown>[]> = {};
    for (const field of children) {
      childPayloads[field.name] =
        (data[field.name] as Record<string, unknown>[]) ?? [];
      delete data[field.name];
    }

    // Every content model carries updatedBy, so this is unconditional.
    data.updatedBy = user.email ?? user.id;

    if (resource.hasStatus) {
      const existing = id
        ? await delegate(resource.model).findUnique({ where: { id } })
        : null;
      // publishedAt records the FIRST publish and is never rewritten by later
      // edits. Unpublished records keep it null.
      const alreadyPublished = existing?.publishedAt != null;
      if (!alreadyPublished) {
        data.publishedAt = data.status === "PUBLISHED" ? new Date() : null;
      }
    }

    const recordId = await prisma.$transaction(async (tx) => {
      const txDelegate = (tx as unknown as Record<string, Record<string, Function>>)[
        resource.model
      ];

      const record = id
        ? await txDelegate.update({ where: { id }, data })
        : await txDelegate.create({ data });

      for (const field of children) {
        const childDelegate = (
          tx as unknown as Record<string, Record<string, Function>>
        )[field.rows!.model];
        await childDelegate.deleteMany({
          where: { [field.rows!.foreignKey]: record.id },
        });
        const rows = childPayloads[field.name];
        if (rows.length) {
          await childDelegate.createMany({
            data: rows.map((row, index) => ({
              ...row,
              displayOrder: index,
              [field.rows!.foreignKey]: record.id,
            })),
          });
        }
      }

      return record.id as string;
    });

    revalidateEverything();
    return {
      ok: true,
      id: recordId,
      message: id
        ? `${resource.singular} updated.`
        : `${resource.singular} created.`,
    };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function deleteResource(
  key: string,
  id: string,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const resource = requireResource(key);
    await delegate(resource.model).delete({ where: { id } });
    revalidateEverything();
    return { ok: true, message: `${resource.singular} deleted.` };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function setStatus(
  key: string,
  id: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const resource = requireResource(key);
    if (!resource.hasStatus) {
      return { ok: false, error: `${resource.label} has no publish state.` };
    }
    const existing = await delegate(resource.model).findUnique({ where: { id } });
    await delegate(resource.model).update({
      where: { id },
      data: {
        status,
        publishedAt:
          status === "PUBLISHED" && !existing?.publishedAt
            ? new Date()
            : existing?.publishedAt,
        updatedBy: user.email ?? user.id,
      },
    });
    revalidateEverything();
    return {
      ok: true,
      message:
        status === "PUBLISHED"
          ? `${resource.singular} is live.`
          : `${resource.singular} moved to ${status.toLowerCase()}.`,
    };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function duplicateResource(
  key: string,
  id: string,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const resource = requireResource(key);

    const source = await delegate(resource.model).findUnique({
      where: { id },
      include: resource.include as never,
    });
    if (!source) return { ok: false, error: "That record no longer exists." };

    const children = rowFields(resource);
    const data: Record<string, unknown> = {};

    for (const field of resource.fields) {
      if (field.type === "rows") continue;
      data[field.name] = source[field.name];
    }

    if ("title" in data && typeof data.title === "string") {
      data.title = `${data.title} (copy)`;
    }
    if ("name" in data && typeof data.name === "string" && !("title" in data)) {
      data.name = `${data.name} (copy)`;
    }
    if ("slug" in data && typeof data.slug === "string") {
      data.slug = `${data.slug}-copy-${Date.now().toString(36).slice(-4)}`;
    }
    if (resource.hasStatus) {
      data.status = "DRAFT";
      data.publishedAt = null;
      data.updatedBy = user.email ?? user.id;
    }
    if (resource.hasOrder) {
      data.displayOrder = ((source.displayOrder as number) ?? 0) + 1;
    }

    const newId = await prisma.$transaction(async (tx) => {
      const txDelegate = (tx as unknown as Record<string, Record<string, Function>>)[
        resource.model
      ];
      const created = await txDelegate.create({ data });

      for (const field of children) {
        const rows = (source[field.name] as Record<string, unknown>[]) ?? [];
        if (!rows.length) continue;
        const childDelegate = (
          tx as unknown as Record<string, Record<string, Function>>
        )[field.rows!.model];
        await childDelegate.createMany({
          data: rows.map((row, index) => {
            const copy: Record<string, unknown> = {};
            for (const child of field.rows!.fields) copy[child.name] = row[child.name];
            copy.displayOrder = index;
            copy[field.rows!.foreignKey] = created.id;
            return copy;
          }),
        });
      }

      return created.id as string;
    });

    revalidateEverything();
    return {
      ok: true,
      id: newId,
      message: `${resource.singular} duplicated as a draft.`,
    };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

/**
 * Reorder by swapping displayOrder with the neighbour in the requested
 * direction. Uses the same ordering the list page renders with, so what the
 * user sees is what moves.
 */
export async function moveResource(
  key: string,
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const resource = requireResource(key);
    if (!resource.hasOrder) {
      return { ok: false, error: `${resource.label} is not orderable.` };
    }

    const rows: Array<{ id: string; displayOrder: number }> = await delegate(
      resource.model,
    ).findMany({
      orderBy: resource.orderBy,
      select: { id: true, displayOrder: true },
    });

    const index = rows.findIndex((r) => r.id === id);
    if (index === -1) return { ok: false, error: "That record no longer exists." };
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= rows.length) {
      return { ok: true, message: "Already at the end." };
    }

    // Normalise to the rendered order first, otherwise duplicate/zero
    // displayOrder values make swapping a no-op.
    const reordered = [...rows];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);

    await prisma.$transaction(
      reordered.map((row, i) =>
        delegate(resource.model).update({
          where: { id: row.id },
          data: { displayOrder: i },
        }),
      ),
    );

    revalidateEverything();
    return { ok: true, message: "Order updated." };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function markMessageRead(
  id: string,
  read: boolean,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.contactMessage.update({
      where: { id },
      data: { read, readAt: read ? new Date() : null },
    });
    revalidatePath("/admin/messages");
    revalidatePath("/admin");
    return { ok: true, message: read ? "Marked as read." : "Marked as unread." };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function deleteMessage(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.contactMessage.delete({ where: { id } });
    revalidatePath("/admin/messages");
    revalidatePath("/admin");
    return { ok: true, message: "Message deleted." };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}
