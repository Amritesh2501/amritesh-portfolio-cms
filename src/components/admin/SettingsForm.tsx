"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSettings } from "@/actions/settings";
import { useToast } from "./Toast";
import { MediaField } from "./MediaPicker";

export type SettingRow = {
  key: string;
  value: string;
  label: string;
  description: string | null;
  type: string;
  options: string | null;
};

export function SettingsForm({
  group,
  settings,
}: {
  group: string;
  settings: SettingRow[];
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value])),
  );
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const dirty = settings.some((s) => values[s.key] !== s.value);

  function set(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveSettings(group, values);
      if (!result.ok) {
        toast.push("error", result.error ?? "Could not save.");
        return;
      }
      toast.push("ok", result.message ?? "Saved.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="sticky top-0 z-[var(--z-nav)] -mx-4 mb-8 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--bg)] px-4 py-3 sm:-mx-6 sm:px-6">
        {dirty ? (
          <span className="t-meta text-[var(--accent)]">Unsaved changes</span>
        ) : (
          <span className="t-meta">All saved</span>
        )}
        <button type="submit" className="btn btn-sm btn-accent" disabled={pending || !dirty}>
          {pending ? "Saving" : "Save settings"}
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {settings.map((setting) => {
          const id = `s-${setting.key.replace(/[^a-zA-Z0-9]/g, "-")}`;
          const value = values[setting.key] ?? "";
          const wide =
            setting.type === "textarea" || setting.type === "media";

          return (
            <div key={setting.key} className={`grid gap-2 ${wide ? "sm:col-span-2" : ""}`}>
              {setting.type !== "boolean" ? (
                <label htmlFor={id} className="t-label text-[var(--fg)]">
                  {setting.label}
                </label>
              ) : null}

              {setting.type === "boolean" ? (
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    id={id}
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--accent)]"
                    checked={value === "true"}
                    onChange={(e) => set(setting.key, String(e.target.checked))}
                  />
                  <span className="t-label text-[var(--fg)]">{setting.label}</span>
                </label>
              ) : setting.type === "textarea" ? (
                <textarea
                  id={id}
                  className="field"
                  rows={3}
                  value={value}
                  aria-describedby={setting.description ? `${id}-help` : undefined}
                  onChange={(e) => set(setting.key, e.target.value)}
                />
              ) : setting.type === "select" ? (
                <select
                  id={id}
                  className="field"
                  value={value}
                  onChange={(e) => set(setting.key, e.target.value)}
                >
                  {(setting.options ?? "").split("|").filter(Boolean).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : setting.type === "color" ? (
                <div className="flex gap-2">
                  <input
                    type="color"
                    aria-label={`${setting.label} swatch`}
                    className="h-10 w-14 cursor-pointer border border-[var(--line-strong)] bg-[var(--surface)] p-1"
                    value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
                    onChange={(e) => set(setting.key, e.target.value)}
                  />
                  <input
                    id={id}
                    className="field"
                    value={value}
                    onChange={(e) => set(setting.key, e.target.value)}
                  />
                </div>
              ) : setting.type === "media" ? (
                <MediaField
                  label={setting.label}
                  value={value}
                  describedBy={setting.description ? `${id}-help` : undefined}
                  onChange={(url) => set(setting.key, url)}
                />
              ) : (
                <input
                  id={id}
                  className="field"
                  value={value}
                  aria-describedby={setting.description ? `${id}-help` : undefined}
                  onChange={(e) => set(setting.key, e.target.value)}
                />
              )}

              {setting.description ? (
                <p id={`${id}-help`} className="t-meta text-[0.5625rem] leading-relaxed">
                  {setting.description}
                </p>
              ) : null}
              <p className="t-meta text-[0.5rem] opacity-50">{setting.key}</p>
            </div>
          );
        })}
      </div>
    </form>
  );
}
