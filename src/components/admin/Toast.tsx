"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type Toast = { id: number; tone: "ok" | "error"; text: string };

const ToastContext = createContext<{
  push: (tone: "ok" | "error", text: string) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>.");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const reduce = useReducedMotion();

  const push = useCallback((tone: "ok" | "error", text: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, tone, text }]);
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    const timer = window.setTimeout(() => {
      setToasts((current) => current.slice(1));
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[var(--z-toast)] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.output
              key={toast.id}
              initial={reduce ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: 16 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto block rounded-[var(--r-sm)] border bg-[var(--surface)] px-4 py-3 text-[0.8125rem] leading-relaxed shadow-[var(--shadow-lg)]"
              style={{
                borderColor:
                  toast.tone === "error" ? "var(--accent)" : "var(--line-strong)",
                color: toast.tone === "error" ? "var(--accent)" : "var(--fg)",
              }}
            >
              <span aria-hidden className="mr-2 opacity-60">
                {toast.tone === "error" ? "!!" : ">>"}
              </span>
              {toast.text}
            </motion.output>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
