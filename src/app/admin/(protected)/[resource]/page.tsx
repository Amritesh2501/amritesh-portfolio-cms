import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getResource } from "@/lib/resources";
import { listRecords, readPath, relationLabel } from "@/lib/admin-data";
import { timestamp } from "@/lib/utils";
import { ResourceTable, type TableRow } from "@/components/admin/ResourceTable";

export const dynamic = "force-dynamic";

export default async function ResourceListPage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource: key } = await params;
  const resource = getResource(key);
  if (!resource) notFound();

  const records = await listRecords(resource);

  // A singleton has no list. Jump straight to its editor, creating the row on
  // first visit so the form always has something to edit.
  if (resource.singleton) {
    if (records.length > 0) redirect(`/admin/${key}/${String(records[0].id)}`);
    redirect(`/admin/${key}/new`);
  }

  const rows: TableRow[] = records.map((record) => {
    const cells: TableRow["cells"] = {};
    for (const column of resource.listColumns) {
      const relation = relationLabel(record, column.field);
      if (relation !== null) {
        cells[column.field] = relation;
        continue;
      }
      const raw = readPath(record, column.field);
      cells[column.field] =
        column.type === "date"
          ? timestamp(raw as Date)
          : raw instanceof Date
            ? timestamp(raw)
            : (raw as string | number | boolean | null | undefined) ?? null;
    }

    return {
      id: String(record.id),
      cells,
      previewHref:
        resource.previewPath && record.status === "PUBLISHED"
          ? resource.previewPath(record)
          : null,
      status: (record.status as string | undefined) ?? null,
    };
  });

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <p className="t-meta">Content</p>
          <h1 className="t-display mt-3 text-[clamp(1.75rem,5vw,2.75rem)]">
            {resource.label}
          </h1>
          <p className="mt-3 max-w-[60ch] text-[0.8125rem] text-[var(--muted)]">
            {resource.description}
          </p>
        </div>
        <Link href={`/admin/${key}/new`} className="btn btn-accent">
          New {resource.singular.toLowerCase()}
        </Link>
      </header>

      <div className="mt-8">
        <ResourceTable
          resourceKey={key}
          singular={resource.singular}
          columns={resource.listColumns}
          rows={rows}
          hasStatus={resource.hasStatus}
          hasOrder={resource.hasOrder}
          duplicable={Boolean(resource.duplicable)}
          searchable={resource.searchFields.length > 0}
        />
      </div>
    </div>
  );
}
