import { prisma } from "@/lib/db";
import { today } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const DAYS = 30;

/**
 * Visitor counts, from the cookieless counters /api/track keeps: views per
 * day, the most visited pages, and where visitors came from. Thirty days, all
 * computed in the database.
 */
export default async function AnalyticsPage() {
  const end = today();
  const from = new Date(end);
  from.setUTCDate(from.getUTCDate() - (DAYS - 1));
  const range = { day: { gte: from } };

  const [daily, pages, refs] = await Promise.all([
    prisma.pageStat.groupBy({ by: ["day"], where: range, _sum: { views: true } }),
    prisma.pageStat.groupBy({
      by: ["path"],
      where: range,
      _sum: { views: true },
      orderBy: { _sum: { views: "desc" } },
      take: 15,
    }),
    prisma.refStat.groupBy({
      by: ["host"],
      where: range,
      _sum: { views: true },
      orderBy: { _sum: { views: "desc" } },
      take: 10,
    }),
  ]);

  const byDay = new Map(daily.map((d) => [d.day.toISOString().slice(0, 10), d._sum.views ?? 0]));
  const series = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(from);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { key, views: byDay.get(key) ?? 0 };
  });
  const total = series.reduce((n, d) => n + d.views, 0);
  const peak = Math.max(1, ...series.map((d) => d.views));
  const week = series.slice(-7).reduce((n, d) => n + d.views, 0);

  return (
    <div>
      <header className="border-b border-[var(--line)] pb-5">
        <p className="t-meta">System</p>
        <h1 className="t-display mt-3 text-[clamp(1.75rem,5vw,2.75rem)]">Analytics</h1>
        <p className="mt-3 max-w-[62ch] text-[0.8125rem] leading-relaxed text-[var(--muted)]">
          Page views over the last {DAYS} days. Counted without cookies or IP addresses; visitors with Do Not
          Track or Global Privacy Control on, and known bots, are not counted.
        </p>
      </header>

      <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { k: `Views, ${DAYS} days`, v: total },
          { k: "Views, 7 days", v: week },
          { k: "Pages viewed", v: pages.length },
        ].map((s) => (
          <div key={s.k} className="rounded-[var(--r-md)] border border-[var(--line)] p-4">
            <dt className="t-meta">{s.k}</dt>
            <dd className="t-display mt-2 text-[1.75rem]">{s.v.toLocaleString()}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-10">
        <h2 className="t-meta">Views per day</h2>
        <div className="an-bars mt-4" role="img" aria-label={`Views per day, peak ${peak}`}>
          {series.map((d) => (
            <span
              key={d.key}
              className="an-bar"
              style={{ height: `${Math.max(2, (d.views / peak) * 100)}%` }}
              title={`${d.views} on ${d.key}`}
            />
          ))}
        </div>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <Table title="Top pages" rows={pages.map((p) => [p.path, p._sum.views ?? 0])} empty="No views yet." />
        <Table
          title="Referrers"
          rows={refs.map((r) => [r.host, r._sum.views ?? 0])}
          empty="No visits from other sites yet."
        />
      </div>
    </div>
  );
}

function Table({ title, rows, empty }: { title: string; rows: [string, number][]; empty: string }) {
  return (
    <section>
      <h2 className="t-meta">{title}</h2>
      {rows.length ? (
        <table className="mt-4 w-full text-[0.875rem]">
          <tbody>
            {rows.map(([name, n]) => (
              <tr key={name} className="border-b border-[var(--line)]">
                <td className="py-2.5 pr-4 break-all">{name}</td>
                <td className="py-2.5 text-right tabular-nums text-[var(--muted)]">{n.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-4 text-[0.875rem] text-[var(--muted)]">{empty}</p>
      )}
    </section>
  );
}
