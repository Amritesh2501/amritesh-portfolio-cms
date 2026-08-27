"use client";

import { useEffect, useRef, useState, useTransition } from "react";

/**
 * Destructive actions get a real dialog, not a window.confirm and not a
 * one-click delete. Escape and the backdrop both cancel.
 */
export function ConfirmAction({
  label,
  title,
  body,
  confirmLabel = "Delete",
  onConfirm,
  className = "btn btn-sm btn-danger",
}: {
  label: React.ReactNode;
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="fixed inset-0 z-[var(--z-toast)] flex items-center justify-center p-4"
          style={{ background: "color-mix(in srgb, #000 70%, transparent)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md border border-[var(--accent)] bg-[var(--surface)]">
            <div className="border-b border-[var(--line-strong)] px-5 py-3">
              <p id="confirm-title" className="t-label text-[var(--accent)]">
                {title}
              </p>
            </div>
            <p className="px-5 py-6 text-sm leading-relaxed text-[var(--muted)]">
              {body}
            </p>
            <div className="flex justify-end gap-2 border-t border-[var(--line-strong)] px-5 py-3">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </button>
              <button
                ref={confirmRef}
                type="button"
                className="btn btn-sm btn-accent"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await onConfirm();
                    setOpen(false);
                  })
                }
              >
                {pending ? "Working" : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
