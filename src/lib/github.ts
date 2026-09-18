import "server-only";

/**
 * Live GitHub activity.
 *
 * Two sources, because the good one is not free of charge in credentials:
 *
 *  - With GITHUB_TOKEN set, the GraphQL API returns the real contribution
 *    calendar: the actual green squares, private contributions included if the
 *    token is allowed to see them. This is the only way to get it; there is no
 *    REST endpoint for the calendar and the image services that claim to offer
 *    one are someone else's uptime.
 *  - Without a token, the public events REST endpoint still gives a usable
 *    picture of the last ninety days. It is NOT the contribution graph, and
 *    the UI says so rather than passing it off as one: it counts public events
 *    on public repositories, it goes back ninety days at most, and GitHub caps
 *    the feed at 300 events.
 *
 * Both paths fail soft. A portfolio does not go down because GitHub is having
 * an afternoon, so every error returns null and the section stops rendering.
 */

export type ContributionDay = { date: string; count: number };

export type GitHubActivity = {
  user: string;
  days: ContributionDay[];
  total: number;
  /** True when the days are the real contribution calendar. */
  exact: boolean;
  recent: { id: string; kind: string; repo: string; at: string }[];
};

const DAYS = 91;
// GitHub rejects unidentified clients, and asks that the caller say who it is.
const HEADERS = { "User-Agent": "portfolio-site", Accept: "application/vnd.github+json" };
// Long enough that a reload does not spend the hourly budget, short enough to
// still read as live.
const REVALIDATE = 1800;

/** YYYY-MM-DD in UTC, which is the bucket GitHub itself counts by. */
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function emptyDays(): ContributionDay[] {
  const out: ContributionDay[] = [];
  const today = new Date();
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    out.push({ date: dayKey(d), count: 0 });
  }
  return out;
}

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

  const [calendar, events] = await Promise.all([
    fetchCalendar(user),
    fetchEvents(user),
  ]);

  // The events feed is what fills the recent list either way, and it is also
  // the fallback calendar. If both are gone there is nothing to draw.
  if (!calendar && !events) return null;

  const recent = (events ?? [])
    .filter((e) => EVENT_LABEL[e.type])
    .slice(0, 6)
    .map((e) => ({
      id: e.id,
      kind: EVENT_LABEL[e.type],
      repo: e.repo?.name ?? "a repository",
      at: e.created_at,
    }));

  if (calendar) {
    return { user, ...calendar, recent, exact: true };
  }

  // Fall back to counting the events themselves. A push carries its commits,
  // so it counts for as many as it moved rather than as one.
  const byDay = new Map(emptyDays().map((d) => [d.date, 0]));
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
    days: [...byDay].map(([date, count]) => ({ date, count })),
    total,
    exact: false,
    recent,
  };
}

async function fetchEvents(user: string): Promise<GitHubEvent[] | null> {
  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(user)}/events/public?per_page=100`,
      { headers: HEADERS, next: { revalidate: REVALIDATE } },
    );
    if (!res.ok) return null;
    return (await res.json()) as GitHubEvent[];
  } catch {
    return null;
  }
}

type CalendarResponse = {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          totalContributions?: number;
          weeks?: { contributionDays?: { date: string; contributionCount: number }[] }[];
        };
      };
    };
  };
};

async function fetchCalendar(
  user: string,
): Promise<{ days: ContributionDay[]; total: number } | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;

  const from = new Date();
  from.setUTCDate(from.getUTCDate() - (DAYS - 1));

  const query = `query($user:String!,$from:DateTime!){
    user(login:$user){
      contributionsCollection(from:$from){
        contributionCalendar{
          totalContributions
          weeks{ contributionDays{ date contributionCount } }
        }
      }
    }
  }`;

  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        ...HEADERS,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: { user, from: from.toISOString() } }),
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;

    const json = (await res.json()) as CalendarResponse;
    const cal = json.data?.user?.contributionsCollection?.contributionCalendar;
    const days =
      cal?.weeks
        ?.flatMap((w) => w.contributionDays ?? [])
        .map((d) => ({ date: d.date, count: d.contributionCount })) ?? [];

    if (!days.length) return null;
    return { days, total: cal?.totalContributions ?? 0 };
  } catch {
    return null;
  }
}
