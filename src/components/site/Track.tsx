"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Sends one beacon per page view to /api/track. No cookie, no id, nothing
 * stored in the browser. Honours Do Not Track and Global Privacy Control:
 * a visitor who asked not to be counted is not.
 */
export function Track() {
  const path = usePathname();
  const first = useRef(true);

  useEffect(() => {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl || path.startsWith("/admin")) return;
    // The referrer only means something on the first page of a visit; after
    // that it is this site.
    const ref = first.current ? document.referrer : "";
    first.current = false;
    const body = JSON.stringify({ path, ref });
    if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(
        () => {},
      );
    }
  }, [path]);

  return null;
}
