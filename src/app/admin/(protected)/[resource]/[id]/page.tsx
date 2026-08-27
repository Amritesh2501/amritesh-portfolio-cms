import { notFound } from "next/navigation";
import { getResource } from "@/lib/resources";
import { findRecord, loadRelationOptions, toFormValues } from "@/lib/admin-data";
import { timestamp } from "@/lib/utils";
import { ResourceForm } from "@/components/admin/ResourceForm";

export const dynamic = "force-dynamic";

export default async function ResourceEditPage({
  params,
}: {
  params: Promise<{ resource: string; id: string }>;
}) {
  const { resource: key, id } = await params;
  const resource = getResource(key);
  if (!resource) notFound();

  const isNew = id === "new";
  const record = isNew ? null : await findRecord(resource, id);
  if (!isNew && !record) notFound();

  const [relationOptions] = await Promise.all([loadRelationOptions(resource)]);
  const defaultValues = toFormValues(resource, record);

  const previewHref =
    record && resource.previewPath ? resource.previewPath(record) : null;

  const title = record
    ? String(record.title ?? record.name ?? record.label ?? resource.singular)
    : `New ${resource.singular.toLowerCase()}`;

  return (
    <div>
      <header className="border-b border-[var(--line)] pb-5">
        <p className="t-meta">
          {resource.label}
          {record?.status ? (
            <>
              <span className="text-[var(--accent)]"> / </span>
              {String(record.status).toLowerCase()}
            </>
          ) : null}
        </p>
        <h1 className="t-display mt-3 text-[clamp(1.5rem,4.5vw,2.5rem)]">{title}</h1>
        {record ? (
          <p className="mt-3 t-meta text-[0.5625rem]">
            Created {timestamp(record.createdAt as Date)}
            {" / "}Updated {timestamp(record.updatedAt as Date)}
            {record.publishedAt
              ? ` / Published ${timestamp(record.publishedAt as Date)}`
              : ""}
            {record.updatedBy ? ` / by ${String(record.updatedBy)}` : ""}
          </p>
        ) : null}
      </header>

      <div className="mt-8">
        <ResourceForm
          resourceKey={key}
          singular={resource.singular}
          fields={resource.fields}
          defaultValues={defaultValues}
          recordId={record ? String(record.id) : null}
          relationOptions={relationOptions}
          listHref={resource.singleton ? "/admin" : `/admin/${key}`}
          previewHref={previewHref}
        />
      </div>
    </div>
  );
}
