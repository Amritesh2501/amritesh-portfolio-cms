import Link from "next/link";
import { prisma } from "@/lib/db";
import { relativeTime, timestamp } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const [
    projectsTotal,
    projectsPublished,
    projectsFeatured,
    projectsDraft,
    experienceCount,
    skillCount,
    certCount,
    educationCount,
    achievementCount,
    socialCount,
    mediaCount,
    messagesTotal,
    messagesUnread,
    lastProject,
    recentMessages,
    drafts,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { status: "PUBLISHED" } }),
    prisma.project.count({ where: { featured: true, status: "PUBLISHED" } }),
    prisma.project.count({ where: { status: "DRAFT" } }),
    prisma.experience.count(),
    prisma.skill.count(),
    prisma.certification.count(),
    prisma.education.count(),
    prisma.achievement.count(),
    prisma.socialLink.count(),
    prisma.media.count(),
    prisma.contactMessage.count(),
    prisma.contactMessage.count({ where: { read: false } }),
    prisma.project.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { title: true, updatedAt: true, slug: true },
    }),
    prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.project.findMany({
      where: { status: "DRAFT" },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, updatedAt: true },
    }),
  ]);

  const stats = [
    { label: "Projects", value: projectsTotal, href: "/admin/projects" },
    { label: "Published", value: projectsPublished, href: "/admin/projects" },
    { label: "Featured", value: projectsFeatured, href: "/admin/projects" },
    { label: "Drafts", value: projectsDraft, href: "/admin/projects" },
    { label: "Experience", value: experienceCount, href: "/admin/experience" },
    { label: "Skills", value: skillCount, href: "/admin/skills" },
    { label: "Certifications", value: certCount, href: "/admin/certifications" },
    { label: "Education", value: educationCount, href: "/admin/education" },
    { label: "Achievements", value: achievementCount, href: "/admin/achievements" },
    { label: "Social links", value: socialCount, href: "/admin/social-links" },
    { label: "Media", value: mediaCount, href: "/admin/media" },
    { label: "Messages", value: messagesTotal, href: "/admin/messages" },
  ];

  return (
    <div>
      <header className="border-b border-[var(--line)] pb-5">
        <p className="t-meta">Overview</p>
        <h1 className="t-display mt-3 text-[clamp(1.75rem,5vw,3rem)]">Dashboard</h1>
        <p className="mt-3 t-meta text-[0.625rem]">
          Last content change: {lastProject ? timestamp(lastProject.updatedAt) : "never"}
        </p>
      </header>

      <dl className="grid-hairline mt-8 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="block px-4 py-5 transition-colors hover:bg-[var(--surface)]">
            <dd className="t-display text-[clamp(1.5rem,4vw,2.25rem)] tabular-nums text-[var(--fg)]">
              {stat.value}
            </dd>
            <dt className="t-meta mt-1.5 text-[0.5625rem]">{stat.label}</dt>
          </Link>
        ))}
      </dl>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
            <h2 className="t-meta text-[var(--fg)]">Recent messages</h2>
            <Link href="/admin/messages" className="t-meta hover:text-[var(--fg)]">
              {messagesUnread} unread
            </Link>
          </div>

          {recentMessages.length === 0 ? (
            <p className="mt-6 t-meta">No messages yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--line)]">
              {recentMessages.map((message) => (
                <li key={message.id} className="py-3">
                  <Link href="/admin/messages" className="block group">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate font-mono text-[0.8125rem] text-[var(--fg)] group-hover:underline">
                        {message.subject}
                      </span>
                      {!message.read ? (
                        <span className="t-meta shrink-0 text-[var(--accent)]">new</span>
                      ) : null}
                    </div>
                    <p className="t-meta mt-1 truncate text-[0.5625rem]">
                      {message.name} / {message.email} / {relativeTime(message.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
            <h2 className="t-meta text-[var(--fg)]">Waiting to publish</h2>
            <Link href="/admin/projects" className="t-meta hover:text-[var(--fg)]">
              All projects
            </Link>
          </div>

          {drafts.length === 0 ? (
            <p className="mt-6 t-meta">No project drafts.</p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--line)]">
              {drafts.map((draft) => (
                <li key={draft.id} className="py-3">
                  <Link
                    href={`/admin/projects/${draft.id}`}
                    className="flex items-baseline justify-between gap-3 hover:underline"
                  >
                    <span className="truncate font-mono text-[0.8125rem] text-[var(--fg)]">
                      {draft.title}
                    </span>
                    <span className="t-meta shrink-0 text-[0.5625rem]">
                      {relativeTime(draft.updatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
