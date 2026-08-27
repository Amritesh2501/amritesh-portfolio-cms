"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useFieldArray,
  useForm,
  type Control,
  type FieldValues,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { buildSchemaFromFields, type FieldDef } from "@/lib/resources";
import { slugify } from "@/lib/utils";
import { saveResource, deleteResource } from "@/actions/crud";
import { useToast } from "./Toast";
import { ConfirmAction } from "./Confirm";
import { MediaField } from "./MediaPicker";

export type RelationOptions = Record<string, { value: string; label: string }[]>;

/**
 * One form for every content type. It renders from the field definitions in
 * `lib/resources.ts` and validates with the schema those same definitions
 * generate, so a new entity needs zero new form code.
 */
export function ResourceForm({
  resourceKey,
  singular,
  fields,
  defaultValues,
  recordId,
  relationOptions,
  listHref,
  previewHref,
}: {
  resourceKey: string;
  singular: string;
  fields: FieldDef[];
  defaultValues: Record<string, unknown>;
  recordId: string | null;
  relationOptions: RelationOptions;
  listHref: string;
  previewHref: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = useMemo(() => buildSchemaFromFields(fields), [fields]);

  const form = useForm<FieldValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = form;

  const sections = useMemo(() => {
    const grouped = new Map<string, FieldDef[]>();
    for (const field of fields) {
      const key = field.section ?? "Details";
      const list = grouped.get(key) ?? [];
      list.push(field);
      grouped.set(key, list);
    }
    return [...grouped.entries()];
  }, [fields]);

  async function onSubmit(values: FieldValues) {
    setServerError(null);
    const result = await saveResource(resourceKey, recordId, values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [name, messages] of Object.entries(result.fieldErrors)) {
          setError(name, { message: messages[0] });
        }
      }
      setServerError(result.error ?? "Could not save.");
      toast.push("error", result.error ?? "Could not save.");
      return;
    }

    toast.push("ok", result.message ?? "Saved.");
    if (recordId) {
      form.reset(values);
      router.refresh();
    } else {
      router.push(`${listHref}/${result.id}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="sticky top-0 z-[var(--z-nav)] -mx-4 mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--bg)] px-4 py-3 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href={listHref} className="btn btn-sm">
            <span aria-hidden>{"<<"}</span> Back
          </Link>
          {isDirty ? (
            <span className="t-meta text-[var(--accent)]">Unsaved changes</span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {previewHref ? (
            <a
              href={previewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm"
            >
              Preview
            </a>
          ) : null}

          {recordId ? (
            <ConfirmAction
              label="Delete"
              title={`Delete this ${singular.toLowerCase()}?`}
              body="This cannot be undone. Any content linked to it will lose the link."
              onConfirm={async () => {
                const result = await deleteResource(resourceKey, recordId);
                if (!result.ok) {
                  toast.push("error", result.error ?? "Delete failed.");
                  return;
                }
                toast.push("ok", result.message ?? "Deleted.");
                router.push(listHref);
                router.refresh();
              }}
            />
          ) : null}

          <button type="submit" className="btn btn-sm btn-accent" disabled={isSubmitting}>
            {isSubmitting ? "Saving" : recordId ? "Save changes" : `Create ${singular.toLowerCase()}`}
          </button>
        </div>
      </div>

      {serverError ? (
        <p
          role="alert"
          className="mb-6 rounded-[var(--r-sm)] border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-[0.875rem] text-[var(--accent)]"
        >
          {serverError}
        </p>
      ) : null}

      <div className="grid gap-10">
        {sections.map(([title, sectionFields]) => (
          <fieldset key={title} className="rounded-[var(--r-lg)] border border-[var(--line)]">
            <legend className="t-meta mx-3 px-2 text-[var(--fg)]">{title}</legend>
            <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
              {sectionFields.map((field) => (
                <FieldRenderer
                  key={field.name}
                  field={field}
                  register={register}
                  control={control}
                  watch={watch}
                  setValue={setValue}
                  error={errors[field.name]?.message as string | undefined}
                  options={relationOptions[field.name] ?? []}
                />
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

function FieldRenderer({
  field,
  register,
  control,
  watch,
  setValue,
  error,
  options,
  namePrefix = "",
}: {
  field: FieldDef;
  register: UseFormRegister<FieldValues>;
  control: Control<FieldValues>;
  watch: UseFormWatch<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  error?: string;
  options: { value: string; label: string }[];
  namePrefix?: string;
}) {
  const name = `${namePrefix}${field.name}`;
  const id = `f-${name.replace(/[^a-zA-Z0-9]/g, "-")}`;
  const describedBy = [
    field.help ? `${id}-help` : null,
    error ? `${id}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const wrapperClass = field.wide || field.type === "rows" ? "sm:col-span-2" : "";

  const labelEl = (
    <label htmlFor={id} className="t-label text-[var(--fg)]">
      {field.label}
      {field.required ? <span className="text-[var(--accent)]"> *</span> : null}
    </label>
  );

  const helpEl = field.help ? (
    <p id={`${id}-help`} className="t-meta text-[0.625rem] leading-relaxed">
      {field.help}
    </p>
  ) : null;

  const errorEl = error ? (
    <p id={`${id}-error`} role="alert" className="t-meta text-[var(--accent)]">
      {error}
    </p>
  ) : null;

  const shared = {
    id,
    className: "field",
    "aria-invalid": error ? ("true" as const) : ("false" as const),
    "aria-describedby": describedBy || undefined,
    placeholder: field.placeholder,
  };

  if (field.type === "boolean") {
    return (
      <div className={`grid gap-2 ${wrapperClass}`}>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            id={id}
            type="checkbox"
            className="h-4 w-4 accent-[var(--accent)]"
            {...register(name)}
          />
          <span className="t-label text-[var(--fg)]">{field.label}</span>
        </label>
        {helpEl}
        {errorEl}
      </div>
    );
  }

  if (field.type === "rows") {
    return (
      <div className={`grid gap-2 ${wrapperClass}`}>
        {labelEl}
        {helpEl}
        <RowsEditor field={field} control={control} register={register} watch={watch} setValue={setValue} />
        {errorEl}
      </div>
    );
  }

  if (field.type === "media") {
    const value = (watch(name) as string) ?? "";
    return (
      <div className={`grid gap-2 ${wrapperClass}`}>
        {labelEl}
        <MediaField
          label={field.label}
          value={value}
          describedBy={describedBy || undefined}
          onChange={(url) => setValue(name, url, { shouldDirty: true })}
        />
        {helpEl}
        {errorEl}
      </div>
    );
  }

  if (field.type === "list") {
    const value = (watch(name) as string[]) ?? [];
    return (
      <div className={`grid gap-2 ${wrapperClass}`}>
        {labelEl}
        <textarea
          {...shared}
          rows={5}
          value={value.join("\n")}
          onChange={(e) =>
            setValue(
              name,
              e.target.value.split("\n").map((line) => line.trim()).filter(Boolean),
              { shouldDirty: true },
            )
          }
        />
        {helpEl}
        {errorEl}
      </div>
    );
  }

  if (field.type === "select" || field.type === "relation") {
    const choices =
      field.type === "relation" ? options : (field.options ?? []);
    return (
      <div className={`grid gap-2 ${wrapperClass}`}>
        {labelEl}
        <select {...shared} {...register(name)}>
          {!field.required ? <option value="">Not set</option> : null}
          {choices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
        {helpEl}
        {errorEl}
      </div>
    );
  }

  if (field.type === "slug") {
    const source = field.from ? (watch(`${namePrefix}${field.from}`) as string) : "";
    return (
      <div className={`grid gap-2 ${wrapperClass}`}>
        {labelEl}
        <div className="flex gap-2">
          <input {...shared} {...register(name)} />
          {field.from ? (
            <button
              type="button"
              className="btn btn-sm shrink-0"
              disabled={!source}
              onClick={() =>
                setValue(name, slugify(source ?? ""), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              From {field.from}
            </button>
          ) : null}
        </div>
        {helpEl}
        {errorEl}
      </div>
    );
  }

  if (field.type === "textarea" || field.type === "markdown") {
    return (
      <div className={`grid gap-2 ${wrapperClass}`}>
        {labelEl}
        <textarea
          {...shared}
          rows={field.type === "markdown" ? 10 : 4}
          {...register(name)}
        />
        {field.type === "markdown" ? (
          <p className="t-meta text-[0.5625rem]">
            Markdown: ## heading, **bold**, *italic*, `code`, - bullet, [link](url)
          </p>
        ) : null}
        {helpEl}
        {errorEl}
      </div>
    );
  }

  return (
    <div className={`grid gap-2 ${wrapperClass}`}>
      {labelEl}
      <input
        {...shared}
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        step={field.step}
        min={field.min}
        max={field.max}
        {...register(name)}
      />
      {helpEl}
      {errorEl}
    </div>
  );
}

function RowsEditor({
  field,
  control,
  register,
  watch,
  setValue,
}: {
  field: FieldDef;
  control: Control<FieldValues>;
  register: UseFormRegister<FieldValues>;
  watch: UseFormWatch<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
}) {
  const { fields: rows, append, remove, move } = useFieldArray({
    control,
    name: field.name,
  });

  const blank = Object.fromEntries(
    field.rows!.fields.map((child) => [child.name, ""]),
  );

  return (
    <div className="rounded-[var(--r-sm)] border border-[var(--line)]">
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center t-meta">Nothing added yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {rows.map((row, index) => (
            <li key={row.id} className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="grid gap-3 sm:grid-cols-2">
                {field.rows!.fields.map((child) => (
                  <FieldRenderer
                    key={child.name}
                    field={child}
                    namePrefix={`${field.name}.${index}.`}
                    register={register}
                    control={control}
                    watch={watch}
                    setValue={setValue}
                    options={[]}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label={`Move row ${index + 1} up`}
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label={`Move row ${index + 1} down`}
                  disabled={index === rows.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  aria-label={`Remove row ${index + 1}`}
                  onClick={() => remove(index)}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-[var(--line)] p-3">
        <button type="button" className="btn btn-sm" onClick={() => append(blank)}>
          Add row
        </button>
      </div>
    </div>
  );
}
