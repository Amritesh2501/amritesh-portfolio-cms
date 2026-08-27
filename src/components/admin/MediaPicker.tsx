"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadMedia } from "@/actions/media";
import { useToast } from "./Toast";

export type MediaItem = {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  alt: string | null;
};

/**
 * A media field: shows the current value, opens the library to pick another,
 * and uploads a new file inline. Used by every `type: "media"` field and by the
 * settings screens, so there is one upload path in the whole admin.
 */
export function MediaField({
  value,
  onChange,
  label,
  describedBy,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="grid gap-2">
      <div className="flex items-start gap-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-sm)] border border-[var(--line-strong)] bg-[var(--surface)]">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span className="t-meta text-[0.5625rem]">empty</span>
          )}
        </div>

        <div className="min-w-0 flex-1 grid gap-2">
          <input
            className="field"
            value={value}
            placeholder="/uploads/file.png or https://..."
            aria-label={`${label} URL`}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
              Library
            </button>
            {value ? (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => onChange("")}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {open ? (
        <MediaLibrary
          onClose={() => setOpen(false)}
          onSelect={(item) => {
            onChange(item.url);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

export function MediaLibrary({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (item: MediaItem) => void;
}) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const load = useCallback(async (q: string) => {
    const res = await fetch(`/api/admin/media?q=${encodeURIComponent(q)}`);
    if (!res.ok) {
      setItems([]);
      return;
    }
    const data = (await res.json()) as { media: MediaItem[] };
    setItems(data.media);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(query), 200);
    return () => window.clearTimeout(t);
  }, [query, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleUpload(file: File) {
    setUploading(true);
    const data = new FormData();
    data.append("file", file);
    const result = await uploadMedia(data);
    setUploading(false);

    if (!result.ok) {
      toast.push("error", result.error ?? "Upload failed.");
      return;
    }
    toast.push("ok", result.message ?? "Uploaded.");
    await load(query);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Media library"
      className="fixed inset-0 z-[var(--z-toast)] flex items-center justify-center p-4"
      style={{ background: "color-mix(in srgb, #000 76%, transparent)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-strong)] bg-[var(--bg)] shadow-[var(--shadow-lg)]">
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
          <input
            autoFocus
            className="field flex-1"
            placeholder="Search filenames"
            aria-label="Search media"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Uploading" : "Upload"}
          </button>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Close
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
              e.target.value = "";
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items === null ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton aspect-square" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--line-strong)] px-6 py-12 text-center">
              <p className="t-meta">
                {query ? "Nothing matches that." : "No files yet. Upload one."}
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className="group block w-full overflow-hidden rounded-[var(--r-sm)] border border-[var(--line-strong)] text-left transition-colors hover:border-[var(--accent)]"
                  >
                    <span className="flex aspect-square items-center justify-center overflow-hidden bg-[var(--surface)]">
                      {item.mimeType.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt={item.alt ?? ""}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="t-meta">{item.mimeType.split("/")[1]}</span>
                      )}
                    </span>
                    <span className="block truncate border-t border-[var(--line-strong)] px-2 py-1.5 font-mono text-[0.625rem] text-[var(--muted)]">
                      {item.filename}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
