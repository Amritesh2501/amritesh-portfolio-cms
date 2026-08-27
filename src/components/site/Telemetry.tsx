"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

export type TelemetryReadout = { key: string; value: string };

/**
 * The hero's interactive element: a live status panel, not a mock screenshot.
 *
 * Every row is real. The counts come from the database on the server, the clock
 * is the visitor's actual clock, and the log lines describe the request that
 * produced this page. Motivated by the design read: the interface should behave
 * like an instrument, and an instrument reads real values.
 */
export function Telemetry({
  readouts,
  bootLines,
}: {
  readouts: TelemetryReadout[];
  bootLines: string[];
}) {
  const reduce = useReducedMotion();
  const [visibleLines, setVisibleLines] = useState(reduce ? bootLines.length : 0);
  const [clock, setClock] = useState<string | null>(null);
  const startedAt = useRef(Date.now());
  const [uptime, setUptime] = useState("00:00");

  useEffect(() => {
    if (reduce) {
      setVisibleLines(bootLines.length);
      return;
    }
    setVisibleLines(0);
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setVisibleLines(i);
      if (i >= bootLines.length) window.clearInterval(timer);
    }, 260);
    return () => window.clearInterval(timer);
  }, [bootLines.length, reduce]);

  useEffect(() => {
    // Rendered client-side only so the server/client clocks cannot mismatch.
    const tick = () => {
      const now = new Date();
      setClock(
        `${String(now.getHours()).padStart(2, "0")}:${String(
          now.getMinutes(),
        ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`,
      );
      const elapsed = Math.floor((Date.now() - startedAt.current) / 1000);
      setUptime(
        `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(
          elapsed % 60,
        ).padStart(2, "0")}`,
      );
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(
    () => [
      ...readouts,
      { key: "session", value: uptime },
      { key: "local_time", value: clock ?? "--:--:--" },
    ],
    [readouts, uptime, clock],
  );

  return (
    <div className="border border-[var(--line-strong)] bg-[var(--surface)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line-strong)] px-3 py-2">
        <span className="t-meta text-[var(--fg)]">runtime</span>
        <span className="t-meta">
          <span className="text-[#4af626]">stable</span>
        </span>
      </div>

      <div className="px-3 py-3" aria-live="off">
        <ol className="grid gap-1.5">
          {bootLines.slice(0, visibleLines).map((line) => (
            <li key={line} className="flex gap-2 font-mono text-[0.6875rem] leading-relaxed">
              <span className="shrink-0 text-[var(--accent)]">{">"}</span>
              <span className="text-[var(--muted)]">{line}</span>
            </li>
          ))}
        </ol>
        {visibleLines >= bootLines.length ? (
          <p className="mt-1.5 flex gap-2 font-mono text-[0.6875rem]">
            <span className="text-[var(--accent)]">{">"}</span>
            <span className="cursor-blink inline-block h-3 w-1.5 translate-y-0.5 bg-[var(--fg)]" />
          </p>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-px border-t border-[var(--line-strong)] bg-[var(--line)]">
        {rows.map((row) => (
          <div key={row.key} className="bg-[var(--surface)] px-3 py-2.5">
            <dt className="t-meta text-[0.625rem]">{row.key}</dt>
            <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-[var(--fg)]">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
