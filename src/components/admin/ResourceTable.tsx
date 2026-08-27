"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  deleteResource,
  duplicateResource,
  moveResource,
  setStatus,
} from "@/actions/crud";
import { useToast } from "./Toast";
import { ConfirmAction } from "./Confirm";
import type { ListColumn } from "@/lib/resources";

export type TableRow = {
  id: string;
  cells: Record<string, string | number | boolean | null>;
  previewHref: string | null;
  status: string | null;
};

export function ResourceTable({
  resourceKey,
  singular,
  columns,
  rows,
  hasStatus,
  hasOrder,
  duplicable,
  searchable,
}: {
  resourceKey: string;
  singular: string;
  columns: ListColumn[];
  rows: TableRow[];
  hasStatus: boolean;
  hasOrder: boolean;
  duplicable: boolean;
  searchable: boolean;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
      if (!q) return true;
      return Object.values(row.cells).some((value) =>
        String(value ?? "").toLowerCase().includes(q),
      );
    });
  }, [rows, query, statusFilter]);

  function run(label: string, fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        toast.push("error", result.error ?? `${label} failed.`);
        return;
      }
      toast.push("ok", result.message ?? `${label} done.`);
      router.refresh();
    });
  }

  return (
    <div>
      {(searchable || hasStatus) && rows.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {searchable ? (
            <input
              className="field max-w-xs"
              placeholder="Filter"
              aria-label={`Filter ${singular.toLowerCase()} list`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          ) : null}
          {hasStatus ? (
            <select
              className="field max-w-[10rem]"
              aria-label="Filter by publish state"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All states</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          ) : null}
          <span className="t-meta ml-auto tabular-nums">
            {filtered.length} of {rows.length}
          </span>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--line-strong)] px-6 py-16 text-center">
          <p className="t-display text-xl">Nothing here yet</p>
          <p className="mt-3 t-meta">Create the first {singular.toLowerCase()}.</p>
          <Link href={`/admin/${resourceKey}/new`} className="btn btn-accent mt-6">
            New {singular.toLowerCase()}
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--line-strong)] px-6 py-12 text-center">
          <p className="t-meta">Nothing matches that filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--r-md)] border border-[var(--line)]">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--line)]">
                {columns.map((column) => (
                  <th
                    key={column.field}
                    scope="col"
                    className="t-meta px-3 py-2.5 text-left text-[0.5625rem]"
                    style={{ width: column.width }}
                  >
                    {column.label}
                  </th>
                ))}
                <th scope="col" className="t-meta px-3 py-2.5 text-right text-[0.5625rem]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--line)] transition-colors last:border-0 hover:bg-[var(--surface)]"
                  style={{ opacity: pending ? 0.6 : 1 }}
                >
                  {columns.map((column, ci) => (
                    <td key={column.field} className="px-3 py-2.5 align-middle">
                      <Cell
                        column={column}
                        value={row.cells[column.field]}
                        href={ci === 0 || column.type === "image" ? undefined : undefined}
                        rowId={row.id}
                        resourceKey={resourceKey}
                        first={
                          ci ===
                          columns.findIndex(
                            (c) => c.type !== "image" && c.type !== "order",
                          )
                        }
                        canMoveUp={hasOrder && index > 0}
                        canMoveDown={hasOrder && index < filtered.length - 1}
                        onMove={(direction) =>
                          run("Reorder", () => moveResource(resourceKey, row.id, direction))
                        }
                      />
                    </td>
                  ))}

                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {hasStatus ? (
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={pending}
                          onClick={() =>
                            run("Publish", () =>
                              setStatus(
                                resourceKey,
                                row.id,
                                row.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                              ),
                            )
                          }
                        >
                          {row.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        </button>
                      ) : null}

                      {hasStatus && row.status !== "ARCHIVED" ? (
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={pending}
                          onClick={() =>
                            run("Archive", () => setStatus(resourceKey, row.id, "ARCHIVED"))
                          }
                        >
                          Archive
                        </button>
                      ) : null}

                      {row.previewHref ? (
                        <a
                          href={row.previewHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm"
                        >
                          Preview
                        </a>
                      ) : null}

                      {duplicable ? (
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={pending}
                          onClick={() =>
                            run("Duplicate", () => duplicateResource(resourceKey, row.id))
                          }
                        >
                          Duplicate
                        </button>
                      ) : null}

                      <Link href={`/admin/${resourceKey}/${row.id}`} className="btn btn-sm">
                        Edit
                      </Link>

                      <ConfirmAction
                        label="Delete"
                        title={`Delete this ${singular.toLowerCase()}?`}
                        body="This cannot be undone."
                        onConfirm={async () => {
                          const result = await deleteResource(resourceKey, row.id);
                          if (!result.ok) {
                            toast.push("error", result.error ?? "Delete failed.");
                            return;
                          }
                          toast.push("ok", result.message ?? "Deleted.");
                          router.refresh();
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Cell({
  column,
  value,
  rowId,
  resourceKey,
  first,
  canMoveUp,
  canMoveDown,
  onMove,
}: {
  column: ListColumn;
  value: string | number | boolean | null;
  href?: string;
  rowId: string;
  resourceKey: string;
  first: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  if (column.type === "image") {
    return (
      <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[var(--r-xs)] border border-[var(--line)] bg-[var(--surface)]">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={String(value)} alt="" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden className="t-meta text-[0.5rem]">
            {"--"}
          </span>
        )}
      </span>
    );
  }

  if (column.type === "order") {
    return (
      <span className="flex items-center gap-1">
        <button
          type="button"
          className="btn btn-sm px-1.5 py-0.5"
          aria-label="Move up"
          disabled={!canMoveUp}
          onClick={() => onMove("up")}
        >
          ↑
        </button>
        <button
          type="button"
          className="btn btn-sm px-1.5 py-0.5"
          aria-label="Move down"
          disabled={!canMoveDown}
          onClick={() => onMove("down")}
        >
          ↓
        </button>
      </span>
    );
  }

  if (column.type === "boolean") {
    return (
      <span className="t-meta text-[0.625rem]" style={{ color: value ? "var(--fg)" : undefined }}>
        {value ? "yes" : "no"}
      </span>
    );
  }

  if (column.type === "badge") {
    const isLive = value === "PUBLISHED" || value === "LIVE";
    return (
      <span
        className="inline-block rounded-[var(--r-full)] border px-2 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.1em]"
        style={{
          borderColor: isLive ? "var(--accent)" : "var(--line-strong)",
          color: isLive ? "var(--accent)" : "var(--muted)",
        }}
      >
        {String(value ?? "").toLowerCase().replace(/_/g, " ") || "-"}
      </span>
    );
  }

  const text = value == null || value === "" ? "-" : String(value);

  if (first) {
    return (
      <Link
        href={`/admin/${resourceKey}/${rowId}`}
        className="block max-w-[26ch] truncate font-mono text-[0.8125rem] text-[var(--fg)] underline-offset-4 hover:underline"
        title={text}
      >
        {text}
      </Link>
    );
  }

  return (
    <span
      className="block max-w-[26ch] truncate font-mono text-[0.75rem] text-[var(--muted)]"
      title={text}
    >
      {text}
    </span>
  );
}
