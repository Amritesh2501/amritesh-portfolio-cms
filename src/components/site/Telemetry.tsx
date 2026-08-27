"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

export type TelemetryReadout = { key: string; value: string };

/**
 * The hero's interactive element: a live status panel, not a mock screenshot.
 *
 * Every row is real. The counts come from the database on the server, the clock
 * is the visitor's own clock, and the log lines describe the request that
 * produced this page.
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
  const [uptime, setUptime] = useState("00:00");
  const startedAt = useRef(Date.now());

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
    }, 320);
    return () => window.clearInterval(timer);
  }, [bootLines.length, reduce]);

  useEffect(() => {
    // Client-only so the server and client clocks cannot mismatch on hydration.
    const tick = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      setClock(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
      const elapsed = Math.floor((Date.now() - startedAt.current) / 1000);
      setUptime(`${pad(Math.floor(elapsed / 60))}:${pad(elapsed % 60)}`);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(
    () => [
      ...readouts,
      { key: "session", value: uptime },
      { key: "local time", value: clock ?? "--:--:--" },
    ],
    [readouts, uptime, clock],
  );

  return (
    <div className="card overflow-hidden shadow-[var(--shadow-lg)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3.5">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-[var(--r-full)] bg-[#30d158]"
          />
          <span className="t-meta text-[var(--fg)]">runtime</span>
        </span>
        <span className="t-meta text-[0.625rem]">live</span>
      </div>

      <div className="px-5 py-4">
        <ol className="grid gap-2">
          {bootLines.slice(0, visibleLines).map((line) => (
            <motion.li
              key={line}
              initial={reduce ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex gap-2.5 font-mono text-[0.6875rem] leading-relaxed"
            >
              <span className="shrink-0 text-[var(--accent)]">{">"}</span>
              <span className="text-[var(--muted)]">{line}</span>
            </motion.li>
          ))}
        </ol>
        {visibleLines >= bootLines.length ? (
          <p className="mt-2 flex gap-2.5 font-mono text-[0.6875rem]">
            <span className="text-[var(--accent)]">{">"}</span>
            <span className="cursor-blink inline-block h-3 w-1.5 translate-y-0.5 bg-[var(--fg)]" />
          </p>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-px border-t border-[var(--line)] bg-[var(--line)]">
        {rows.map((row) => (
          <div key={row.key} className="bg-[var(--surface)] px-5 py-4">
            <dt className="t-meta text-[0.5625rem]">{row.key}</dt>
            <dd className="mt-1.5 font-mono text-lg font-medium tabular-nums tracking-tight text-[var(--fg)]">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
