/**
 * What a page-view beacon is allowed to count. Pure; see
 * scripts/check-analytics.ts.
 *
 * Everything here is about not storing what we do not need: a path with no
 * query string (queries carry search terms and tokens), and a referrer reduced
 * to its host. No IP, no cookie, no visitor id ever reaches the database.
 */

/** A clean path to count, or null for things that are not page views. */
export function countablePath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return null;
  const path = raw.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (path.length > 200) return null;
  if (/^\/(admin|api|_next)(\/|$)/.test(path)) return null;
  // Asset requests and probes, not pages.
  if (/\.[a-z0-9]{2,5}$/i.test(path)) return null;
  return path.toLowerCase();
}

/** The referring site's host, or null when it is us, empty, or not a URL. */
export function referrerHost(raw: unknown, ownHost: string | null): string | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
    if (!host || host === ownHost?.replace(/^www\./, "").toLowerCase()) return null;
    return host.slice(0, 100);
  } catch {
    return null;
  }
}

const BOT = /bot|crawl|spider|slurp|preview|lighthouse|headless|curl|wget|python|facebookexternalhit|embedly/i;

export const isBot = (ua: string | null) => !ua || BOT.test(ua);

/** Today in UTC, as the DATE the counters are keyed on. */
export const today = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
