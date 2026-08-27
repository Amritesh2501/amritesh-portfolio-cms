"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMessage, markMessageRead } from "@/actions/crud";
import { relativeTime, timestamp } from "@/lib/utils";
import { useToast } from "./Toast";
import { ConfirmAction } from "./Confirm";

type Message = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  ip: string | null;
  createdAt: string;
};

export function MessageList({
  messages,
  unread,
}: {
  messages: Message[];
  unread: number;
}) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const visible = filter === "unread" ? messages.filter((m) => !m.read) : messages;

  function act(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const result = await fn();
      toast.push(result.ok ? "ok" : "error", result.message ?? result.error ?? "");
      if (result.ok) router.refresh();
    });
  }

  if (messages.length === 0) {
    return (
      <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--line-strong)] px-6 py-16 text-center">
        <p className="t-display text-xl">No messages</p>
        <p className="mt-3 t-meta">
          Submissions from the contact form land here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-sm"
          aria-pressed={filter === "all"}
          style={
            filter === "all"
              ? { background: "var(--fg)", color: "var(--bg)", borderColor: "var(--fg)" }
              : undefined
          }
          onClick={() => setFilter("all")}
        >
          All {messages.length}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          aria-pressed={filter === "unread"}
          style={
            filter === "unread"
              ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
              : undefined
          }
          onClick={() => setFilter("unread")}
        >
          Unread {unread}
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--line-strong)] px-6 py-12 text-center">
          <p className="t-meta">Nothing unread.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[var(--r-md)] border border-[var(--line)]" style={{ opacity: pending ? 0.6 : 1 }}>
          {visible.map((message) => {
            const open = openId === message.id;
            return (
              <li key={message.id} className="border-b border-[var(--line)] last:border-0">
                <button
                  type="button"
                  className="flex w-full items-baseline gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface)]"
                  aria-expanded={open}
                  onClick={() => {
                    setOpenId(open ? null : message.id);
                    if (!open && !message.read) {
                      act(() => markMessageRead(message.id, true));
                    }
                  }}
                >
                  <span
                    aria-hidden
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-[var(--r-full)]"
                    style={{
                      background: message.read ? "var(--line-strong)" : "var(--accent)",
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[0.8125rem] text-[var(--fg)]">
                      {message.subject}
                    </span>
                    <span className="t-meta mt-1 block truncate text-[0.5625rem]">
                      {message.name} / {message.email}
                    </span>
                  </span>
                  <span className="t-meta shrink-0 text-[0.5625rem]">
                    {relativeTime(message.createdAt)}
                  </span>
                </button>

                {open ? (
                  <div className="border-t border-[var(--line)] bg-[var(--surface)] px-4 py-4">
                    <p className="whitespace-pre-wrap text-[0.8125rem] leading-relaxed text-[var(--fg)]">
                      {message.message}
                    </p>
                    <p className="t-meta mt-4 text-[0.5625rem]">
                      {timestamp(message.createdAt)}
                      {message.ip ? ` / ${message.ip}` : ""}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={`mailto:${message.email}?subject=${encodeURIComponent(
                          `Re: ${message.subject}`,
                        )}`}
                        className="btn btn-sm btn-accent"
                      >
                        Reply
                      </a>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => act(() => markMessageRead(message.id, !message.read))}
                      >
                        Mark {message.read ? "unread" : "read"}
                      </button>
                      <ConfirmAction
                        label="Delete"
                        title="Delete this message?"
                        body="It is removed permanently."
                        onConfirm={() => {
                          act(() => deleteMessage(message.id));
                          setOpenId(null);
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
