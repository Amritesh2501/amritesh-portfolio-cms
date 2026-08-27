import { prisma } from "@/lib/db";
import { MessageList } from "@/components/admin/MessageList";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const messages = await prisma.contactMessage.findMany({
    orderBy: [{ read: "asc" }, { createdAt: "desc" }],
    take: 300,
  });

  const unread = messages.filter((m) => !m.read).length;

  return (
    <div>
      <header className="border-b border-[var(--line)] pb-5">
        <p className="t-meta">System</p>
        <h1 className="t-display mt-3 text-[clamp(1.75rem,5vw,2.75rem)]">Messages</h1>
        <p className="mt-3 max-w-[62ch] text-[0.8125rem] leading-relaxed text-[var(--muted)]">
          Submissions from the public contact form. Rate limited per IP and
          protected by a honeypot field.
        </p>
      </header>

      <div className="mt-8">
        <MessageList
          messages={messages.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            subject: m.subject,
            message: m.message,
            read: m.read,
            ip: m.ip,
            createdAt: m.createdAt.toISOString(),
          }))}
          unread={unread}
        />
      </div>
    </div>
  );
}
