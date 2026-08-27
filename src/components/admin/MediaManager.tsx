"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteMedia,
  replaceMedia,
  updateMediaAlt,
  uploadMedia,
} from "@/actions/media";
import { useToast } from "./Toast";
import { ConfirmAction } from "./Confirm";

type Item = {
  id: string;
  url: string;
  key: string;
  filename: string;
  mimeType: string;
  size: number;
  alt: string | null;
  createdAt: string;
};

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaManager({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const uploadRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  const filtered = items.filter((item) =>
    item.filename.toLowerCase().includes(query.trim().toLowerCase()),
  );

  async function handleUpload(file: File) {
    setBusy("upload");
    const data = new FormData();
    data.append("file", file);
    const result = await uploadMedia(data);
    setBusy(null);
    toast.push(result.ok ? "ok" : "error", result.message ?? result.error ?? "");
    if (result.ok) startTransition(() => router.refresh());
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <input
          className="field max-w-xs"
          placeholder="Filter by filename"
          aria-label="Filter media"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-accent"
          disabled={busy === "upload"}
          onClick={() => uploadRef.current?.click()}
        >
          {busy === "upload" ? "Uploading" : "Upload file"}
        </button>
        <input
          ref={uploadRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = "";
          }}
        />
        <span className="t-meta ml-auto tabular-nums">
          {filtered.length} of {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-[var(--line-strong)] px-6 py-16 text-center">
          <p className="t-display text-xl">No files yet</p>
          <p className="mt-3 t-meta">
            Images up to the configured limit. JPEG, PNG, WebP, AVIF, GIF, SVG, PDF.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-[var(--line-strong)] px-6 py-12 text-center">
          <p className="t-meta">Nothing matches that.</p>
        </div>
      ) : (
        <ul className="grid-hairline grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              busy={busy === item.id}
              setBusy={setBusy}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function MediaCard({
  item,
  busy,
  setBusy,
}: {
  item: Item;
  busy: boolean;
  setBusy: (id: string | null) => void;
}) {
  const [alt, setAlt] = useState(item.alt ?? "");
  const replaceRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  async function act(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setBusy(item.id);
    const result = await fn();
    setBusy(null);
    toast.push(result.ok ? "ok" : "error", result.message ?? result.error ?? "");
    if (result.ok) router.refresh();
  }

  return (
    <li className="flex flex-col p-4" style={{ opacity: busy ? 0.55 : 1 }}>
      <div className="flex aspect-video items-center justify-center overflow-hidden border border-[var(--line)] bg-[var(--surface)]">
        {item.mimeType.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.alt ?? ""} className="h-full w-full object-cover" />
        ) : (
          <span className="t-meta">{item.mimeType}</span>
        )}
      </div>

      <p className="mt-3 truncate font-mono text-[0.75rem] text-[var(--fg)]" title={item.filename}>
        {item.filename}
      </p>
      <p className="t-meta mt-1 text-[0.5625rem]">
        {humanSize(item.size)} / {item.mimeType}
      </p>

      <label className="mt-3 grid gap-1.5">
        <span className="t-meta text-[0.5625rem]">Alt text</span>
        <input
          className="field"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          onBlur={() => {
            if (alt !== (item.alt ?? "")) void act(() => updateMediaAlt(item.id, alt));
          }}
        />
      </label>

      <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            void navigator.clipboard.writeText(item.url);
            toast.push("ok", "URL copied.");
          }}
        >
          Copy URL
        </button>
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy}
          onClick={() => replaceRef.current?.click()}
        >
          Replace
        </button>
        <ConfirmAction
          label="Delete"
          title="Delete this file?"
          body="The file is removed from storage. Anything still pointing at its URL will break."
          onConfirm={() => act(() => deleteMedia(item.id))}
        />
        <input
          ref={replaceRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const data = new FormData();
              data.append("file", file);
              void act(() => replaceMedia(item.id, data));
            }
            e.target.value = "";
          }}
        />
      </div>
    </li>
  );
}
