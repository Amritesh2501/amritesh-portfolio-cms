import "server-only";
import { prisma } from "@/lib/db";
import {
  getResource,
  scalarFields,
  type FieldDef,
  type ResourceDef,
} from "@/lib/resources";

/**
 * Shared server-side plumbing between the generic admin list page and the
 * generic admin form page. Nothing here is exported to the client: it produces
 * plain serialisable objects for the client components to render.
 */

function prismaDelegate(model: string) {
  return (prisma as unknown as Record<string, Record<string, Function>>)[model];
}

export async function listRecords(resource: ResourceDef) {
  return prismaDelegate(resource.model).findMany({
    orderBy: resource.orderBy,
    include: resource.include as never,
  }) as Promise<Record<string, unknown>[]>;
}

export async function findRecord(resource: ResourceDef, id: string) {
  return prismaDelegate(resource.model).findUnique({
    where: { id },
    include: resource.include as never,
  }) as Promise<Record<string, unknown> | null>;
}

/** Resolves the label for a relation column so the table shows a name, not a cuid. */
export function relationLabel(
  row: Record<string, unknown>,
  field: string,
): string | null {
  if (field === "categoryId") {
    const category = row.category as { name?: string } | null | undefined;
    return category?.name ?? null;
  }
  return null;
}

/** Reads "a.b" paths so list columns can show `_count.projects`. */
export function readPath(row: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      row,
    );
}

/** Every option a `type: "relation"` field can offer, keyed by field name. */
export async function loadRelationOptions(resource: ResourceDef) {
  const options: Record<string, { value: string; label: string }[]> = {};

  for (const field of resource.fields) {
    if (field.type !== "relation" || !field.relation) continue;
    const target = getResource(field.relation.resource);
    if (!target) continue;

    const rows = (await prismaDelegate(target.model).findMany({
      orderBy: target.orderBy,
    })) as Record<string, unknown>[];

    options[field.name] = rows.map((row) => ({
      value: String(row.id),
      label: String(row[field.relation!.labelField] ?? row.id),
    }));
  }

  return options;
}

function toDateInput(value: unknown): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/** Turns a DB row (or nothing, for a create form) into RHF default values. */
export function toFormValues(
  resource: ResourceDef,
  record: Record<string, unknown> | null,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const field of resource.fields) {
    if (field.type === "rows") {
      const rows = (record?.[field.name] as Record<string, unknown>[] | undefined) ?? [];
      values[field.name] = rows.map((row) => {
        const copy: Record<string, unknown> = {};
        for (const child of field.rows!.fields) {
          copy[child.name] = normalise(child, row[child.name]);
        }
        return copy;
      });
      continue;
    }
    values[field.name] = normalise(field, record?.[field.name]);
  }

  return values;
}

function normalise(field: FieldDef, raw: unknown): unknown {
  if (field.type === "boolean") return Boolean(raw ?? false);
  if (field.type === "date") return toDateInput(raw);
  if (field.type === "list") return Array.isArray(raw) ? raw : [];
  if (field.type === "number") return raw == null ? "" : raw;
  if (field.type === "select") {
    return raw == null ? (field.options?.[0]?.value ?? "") : String(raw);
  }
  return raw == null ? "" : String(raw);
}

export { scalarFields };
