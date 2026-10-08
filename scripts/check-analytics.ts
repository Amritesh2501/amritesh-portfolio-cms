/**
 * What the page-view beacon counts, and what it refuses to store.
 *
 *   npx tsx scripts/check-analytics.ts
 */
import assert from "node:assert/strict";
import { countablePath, isBot, referrerHost, today } from "../src/lib/analytics";

// Paths: query strings and fragments are dropped, case and trailing slashes folded.
assert.equal(countablePath("/"), "/");
assert.equal(countablePath("/projects/Foo/?utm_source=x#top"), "/projects/foo");
assert.equal(countablePath("/now?q=secret"), "/now");
// Not page views.
for (const bad of ["/admin", "/admin/projects", "/api/chat", "/_next/static/x.js", "/favicon.ico", "//evil.com", "https://x.com/", "", 42, null, "/" + "a".repeat(300)]) {
  assert.equal(countablePath(bad), null, String(bad));
}

// Referrers: host only, never ourselves.
assert.equal(referrerHost("https://www.linkedin.com/feed/?token=abc", "example.com"), "linkedin.com");
assert.equal(referrerHost("https://example.com/projects", "example.com"), null);
assert.equal(referrerHost("https://www.example.com/", "example.com"), null);
assert.equal(referrerHost("not a url", "example.com"), null);
assert.equal(referrerHost("", "example.com"), null);

// Bots.
assert(isBot(null));
assert(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)"));
assert(isBot("Chrome-Lighthouse"));
assert(!isBot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"));

// Days are UTC midnights.
assert.equal(today(new Date("2026-10-08T23:59:00Z")).toISOString(), "2026-10-08T00:00:00.000Z");

console.log("check-analytics: OK — paths cleaned, referrers reduced to hosts, bots skipped.");
