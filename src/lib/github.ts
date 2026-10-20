import "server-only";
import { parseContributions } from "./calendar";

/**
 * Live GitHub activity: the contribution calendar, and a pulse per repo.
 *
 * The calendar has two sources, because the good one is not free of charge in
 * credentials:
 *
 *  - With GITHUB_TOKEN set, the GraphQL API returns the real contribution
 *    calendar for every year the account has, the same squares as the profile
 *    page. There is no REST endpoint for it, and the image services that claim
 *    to offer one are someone else's uptime.
 *  - Without a token, the public events feed still gives a usable picture of
 *    the last ninety days. It is NOT the contribution graph, and the UI says so:
 *    it counts public events on public repositories, at most ninety days back.
 *
 *
 * Everything fails soft. A portfolio does not go down because GitHub is having
 * an afternoon: every error returns null or an empty list and the section stops
 * rendering.
 */

export type ContributionDay = { date: string; count: number };

/** One tab of the calendar: a calendar year, or the rolling last year. */
export type ContributionYear = { label: string; total: number; days: ContributionDay[] };

export type GitHubActivity = {
  user: string;
  /** Newest first. The first entry is the rolling last year when exact. */
  years: ContributionYear[];
  /** True when the days are the real contribution calendar. */
  exact: boolean;
  recent: { id: string; kind: string; repo: string; at: string }[];
};

const FALLBACK_DAYS = 91;
// GitHub rejects unidentified clients, and asks that the caller say who it is.
const HEADERS: Record<string, string> = { "User-Agent": "portfolio-site", Accept: "application/vnd.github+json" };
// Long enough that a reload does not spend the hourly budget, short enough to
// still read as live.
const REVALIDATE = 1800;
/** How many past calendar years to offer, besides the rolling one. */
const MAX_YEARS = 5;

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function authed(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return token ? { ...HEADERS, Authorization: `Bearer ${token}` } : HEADERS;
}

async function getJson<T>(url: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: authed(), next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------------------
   Calendar
   ------------------------------------------------------------------------- */

const EVENT_LABEL: Record<string, string> = {
  PushEvent: "Pushed to",
  PullRequestEvent: "Opened a pull request in",
  IssuesEvent: "Opened an issue in",
  CreateEvent: "Created",
  ReleaseEvent: "Released",
  WatchEvent: "Starred",
  ForkEvent: "Forked",
  IssueCommentEvent: "Commented in",
};

type GitHubEvent = {
  id: string;
  type: string;
  created_at: string;
  repo?: { name?: string };
  payload?: { commits?: unknown[] };
};

export async function getGitHubActivity(user: string): Promise<GitHubActivity | null> {
  if (!user) return null;

  const [years, events] = await Promise.all([
    // The API with a token; otherwise the public contributions page, which is
    // what the profile itself draws from and is not under the API rate limit.
    fetchYears(user).then((y) => y ?? scrapeYears(user)),
    getJson<GitHubEvent[]>(
      `https://api.github.com/users/${encodeURIComponent(user)}/events/public?per_page=100`,
      REVALIDATE,
    ),
  ]);

  if (!years && !events) return null;

  const recent = (events ?? [])
    .filter((e) => EVENT_LABEL[e.type])
    .slice(0, 6)
    .map((e) => ({
      id: e.id,
      kind: EVENT_LABEL[e.type],
      repo: e.repo?.name ?? "a repository",
      at: e.created_at,
    }));

  if (years?.length) return { user, years, recent, exact: true };

  // Fall back to counting the events themselves. A push carries its commits,
  // so it counts for as many as it moved rather than as one.
  const byDay = new Map<string, number>();
  const today = new Date();
  for (let i = FALLBACK_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    byDay.set(dayKey(d), 0);
  }
  let total = 0;
  for (const e of events ?? []) {
    const key = e.created_at.slice(0, 10);
    if (!byDay.has(key)) continue;
    const weight = e.type === "PushEvent" ? Math.max(1, e.payload?.commits?.length ?? 1) : 1;
    byDay.set(key, (byDay.get(key) ?? 0) + weight);
    total += weight;
  }

  return {
    user,
    years: [{ label: "Last 90 days", total, days: [...byDay].map(([date, count]) => ({ date, count })) }],
    exact: false,
    recent,
  };
}

type Calendar = {
  totalContributions?: number;
  weeks?: { contributionDays?: { date: string; contributionCount: number }[] }[];
};

type Collection = { contributionYears?: number[]; contributionCalendar?: Calendar };

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  if (!process.env.GITHUB_TOKEN) return null;
  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { ...authed(), "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    return ((await res.json()) as { data?: T }).data ?? null;
  } catch {
    return null;
  }
}

const flatten = (cal?: Calendar): ContributionDay[] =>
  cal?.weeks?.flatMap((w) => w.contributionDays ?? []).map((d) => ({ date: d.date, count: d.contributionCount })) ?? [];

/**
 * The rolling last year (what the profile page opens on), then each earlier
 * calendar year the account has contributions in. Two requests: one for the
 * year list and the rolling calendar, one aliased query for every past year.
 */
async function fetchYears(user: string): Promise<ContributionYear[] | null> {
  const first = await graphql<{ user?: { contributionsCollection?: Collection } }>(
    `query($user:String!){ user(login:$user){ contributionsCollection{
      contributionYears
      contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount } } }
    } } }`,
    { user },
  );
  const col = first?.user?.contributionsCollection;
  const rolling = flatten(col?.contributionCalendar);
  if (!rolling.length) return null;

  const out: ContributionYear[] = [
    { label: "Last year", total: col?.contributionCalendar?.totalContributions ?? 0, days: rolling },
  ];

  const past = (col?.contributionYears ?? []).filter((y) => y < new Date().getUTCFullYear()).slice(0, MAX_YEARS);
  if (!past.length) return out;

  const fields = past
    .map(
      (y) => `y${y}: contributionsCollection(from:"${y}-01-01T00:00:00Z", to:"${y}-12-31T23:59:59Z"){
        contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount } } }
      }`,
    )
    .join("\n");
  const rest = await graphql<{ user?: Record<string, Collection> }>(
    `query($user:String!){ user(login:$user){ ${fields} } }`,
    { user },
  );
  for (const y of past) {
    const cal = rest?.user?.[`y${y}`]?.contributionCalendar;
    const days = flatten(cal);
    if (days.length) out.push({ label: String(y), total: cal?.totalContributions ?? 0, days });
  }
  return out;
}

/* ---------------------------------------------------------------------------
   Calendar without a token: the public contributions page
   ------------------------------------------------------------------------- */

/**
 * github.com/users/:user/contributions is the fragment the profile page loads
 * its calendar from. It needs no token and is not counted against the REST
 * API's 60-an-hour limit, which a shared host IP (Railway, Vercel) can run
 * out of on someone else's traffic. Parsing HTML is the price: if GitHub
 * changes the markup this returns null and the token path is the fix.
 */
async function scrapeYears(user: string): Promise<ContributionYear[] | null> {
  const page = async (query = "") => {
    try {
      const res = await fetch(`https://github.com/users/${encodeURIComponent(user)}/contributions${query}`, {
        headers: { "User-Agent": HEADERS["User-Agent"] },
        next: { revalidate: REVALIDATE },
      });
      return res.ok ? parseContributions(await res.text()) : null;
    } catch {
      return null;
    }
  };

  const rolling = await page();
  if (!rolling) return null;
  const out: ContributionYear[] = [{ label: "Last year", ...rolling }];

  // Which years exist: the account's age from the (rarely changing, cached a
  // day) user record; three years back if that call is unavailable.
  const now = new Date().getUTCFullYear();
  const profile = await getJson<{ created_at?: string }>(
    `https://api.github.com/users/${encodeURIComponent(user)}`,
    86400,
  );
  const first = profile?.created_at ? new Date(profile.created_at).getUTCFullYear() : now - 3;
  const years = Array.from({ length: Math.min(MAX_YEARS, now - first) }, (_, i) => now - 1 - i);

  const pages = await Promise.all(years.map((y) => page(`?from=${y}-01-01&to=${y}-12-31`)));
  years.forEach((y, i) => {
    const p = pages[i];
    if (p) out.push({ label: String(y), total: p.total, days: p.days.filter((d) => d.date.startsWith(String(y))) });
  });
  return out;
}

/* ---------------------------------------------------------------------------
   A repository's pulse, for "Currently working on"
   ------------------------------------------------------------------------- */

export type RepoPulse = {
  /** When the newest commit was made. */
  at: string;
  message: string;
  url: string;
  /** Commits in the last seven days (capped at 100). */
  week: number;
};

type Commit = { html_url: string; commit: { message: string; author?: { date?: string } } };

/** owner/name from a github.com repository link, or null for anything else. */
export function repoOf(url: string | null | undefined): string | null {
  const m = /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9-]+\/[A-Za-z0-9._-]+?)(?:\.git)?\/?$/.exec(url?.trim() ?? "");
  return m ? m[1] : null;
}

/**
 * The newest commit and the last week's count, so an in-progress project can
 * show that it is actually moving. Null for non-GitHub links, private repos
 * or an unreachable API; the card simply leaves the line out.
 */
export async function getRepoPulse(url: string | null | undefined): Promise<RepoPulse | null> {
  const repo = repoOf(url);
  if (!repo) return null;
  // Rounded to the day so the URL (and so the cache entry) is stable for 24h.
  const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const recent = await getJson<Commit[]>(
    `https://api.github.com/repos/${repo}/commits?since=${since}T00:00:00Z&per_page=100`,
    900,
  );
  const latest = recent?.length ? recent : await getJson<Commit[]>(`https://api.github.com/repos/${repo}/commits?per_page=1`, 900);
  const c = latest?.[0];
  if (!c?.commit.author?.date) return null;
  return {
    at: c.commit.author.date,
    message: c.commit.message.split("\n")[0].trim(),
    url: c.html_url,
    week: recent?.length ?? 0,
  };
}
