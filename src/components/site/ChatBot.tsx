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
export function ChatBot({ name }: { name: string }) {
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
    if (!q || busy) return;
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
      <button
        type="button"
        className={`cb-launch ${open ? "is-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="cb-panel"
      >
        <span aria-hidden className="cb-dot" />
        {open ? "Close" : `Ask about ${name.split(" ")[0]}`}
      </button>

      {open ? (
        <section id="cb-panel" className="cb-panel" aria-label={`Ask about ${name}`}>
          <header className="cb-head">
            <p className="cb-title">Ask about {name}</p>
            <p className="cb-sub">Answers come from this portfolio. It can be wrong; check the source.</p>
          </header>

          <div ref={list} className="cb-list" aria-live="polite">
            {msgs.length === 0 ? (
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
              placeholder="Ask a question…"
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
