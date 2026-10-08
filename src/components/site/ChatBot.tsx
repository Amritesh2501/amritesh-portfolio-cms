"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What do they work on now?",
  "Which project should I look at first?",
  "What is their tech stack?",
  "Are they open to work?",
];

/**
 * Ask the portfolio. A launcher in the corner, a small panel, answers streamed
 * as they are written. Only mounted when the server has an API key, so a site
 * without one never shows a button that cannot work.
 *
 * Nothing is kept: the conversation lives in this component and goes when the
 * tab does.
 */
export function ChatBot({
  name,
  enabled = true,
  email = "",
}: {
  name: string;
  /** False when the server has no API key: the tab still shows, and says so. */
  enabled?: boolean;
  email?: string;
}) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [msgs]);

  useEffect(() => {
    if (open) input.current?.focus();
    else abort.current?.abort();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy || !enabled) return;
    const history: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs([...history, { role: "assistant", content: "" }]);
    setDraft("");
    setBusy(true);

    const ctrl = new AbortController();
    abort.current = ctrl;
    const write = (chunk: string) =>
      setMsgs((m) => {
        const next = [...m];
        next[next.length - 1] = { role: "assistant", content: next[next.length - 1].content + chunk };
        return next;
      });

    try {
      // Only the last few turns go up: enough for follow-ups, bounded in cost.
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-10) }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        write(await res.text().catch(() => "Something went wrong."));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        write(decoder.decode(value, { stream: true }));
      }
    } catch {
      if (!ctrl.signal.aborted) write("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };


  // The command palette passes a question here; open and ask it.
  const askRef = useRef(ask);
  askRef.current = ask;
  useEffect(() => {
    const onAsk = (e: Event) => {
      const q = (e as CustomEvent<string>).detail;
      setOpen(true);
      if (q) void askRef.current(q);
    };
    window.addEventListener("chatbot:ask", onAsk);
    return () => window.removeEventListener("chatbot:ask", onAsk);
  }, []);

  return (
    <>
      {/* A tab on the right edge: just the icon until hovered or focused,
          then it slides out to say what it is. */}
      <button
        type="button"
        className={`cb-launch ${open ? "is-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="cb-panel"
        aria-label={open ? "Close the assistant" : `Ask AI about ${name}`}
      >
        <svg aria-hidden className="cb-icon" viewBox="0 0 24 24" width="20" height="20">
          <path
            d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M9 9.5h.01M12 9.5h.01M15 9.5h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span className="cb-label">{open ? "Close" : `Ask AI about ${name.split(" ")[0]}`}</span>
      </button>

      {open ? (
        <section id="cb-panel" className="cb-panel" aria-label={`Ask about ${name}`}>
          <header className="cb-head">
            <button type="button" className="cb-close" onClick={() => setOpen(false)} aria-label="Close">
              ×
            </button>
            <p className="cb-title">Ask about {name}</p>
            <p className="cb-sub">Answers come from this portfolio. It can be wrong; check the source.</p>
          </header>

          <div ref={list} className="cb-list" aria-live="polite">
            {!enabled ? (
              <p className="cb-msg is-assistant">
                The assistant is offline right now.
                {email ? (
                  <>
                    {" "}
                    Ask {name.split(" ")[0]} directly at <a href={`mailto:${email}`}>{email}</a>.
                  </>
                ) : null}
              </p>
            ) : msgs.length === 0 ? (
              <div className="cb-start">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="cb-chip" onClick={() => ask(s)}>
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              msgs.map((m, i) => (
                <p key={i} className={`cb-msg is-${m.role}`}>
                  {m.content || (busy && i === msgs.length - 1 ? <span className="cb-typing">Thinking…</span> : null)}
                </p>
              ))
            )}
          </div>

          <form
            className="cb-form"
            onSubmit={(e) => {
              e.preventDefault();
              ask(draft);
            }}
          >
            <textarea
              ref={input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(draft);
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={enabled ? "Ask a question…" : "Offline"}
              disabled={!enabled}
              aria-label="Your question"
            />
            <button type="submit" className="btn btn-accent btn-sm" disabled={busy || !draft.trim()}>
              Send
            </button>
          </form>
        </section>
      ) : null}
    </>
  );
}
