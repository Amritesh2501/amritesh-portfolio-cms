import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RESOURCES } from "@/lib/resources";
import { Sidebar, type SidebarGroup } from "@/components/admin/Sidebar";
import { ToastProvider } from "@/components/admin/Toast";

export const metadata: Metadata = {
  title: "CMS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The real authorization boundary. Middleware only checks that a cookie
  // exists; this verifies the signed session before any admin data is read.
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const unread = await prisma.contactMessage.count({ where: { read: false } });

  const content = RESOURCES.filter((r) => r.group === "content");
  const site = RESOURCES.filter((r) => r.group === "site");

  const groups: SidebarGroup[] = [
    { title: "Overview", links: [{ href: "/admin", label: "Dashboard" }] },
    {
      title: "Content",
      links: content.map((r) => ({ href: `/admin/${r.key}`, label: r.label })),
    },
    {
      title: "Site",
      links: [
        ...site.map((r) => ({ href: `/admin/${r.key}`, label: r.label })),
        { href: "/admin/settings", label: "Site settings" },
        { href: "/admin/theme", label: "Theme" },
        { href: "/admin/seo", label: "SEO" },
      ],
    },
    {
      title: "System",
      links: [
        { href: "/admin/media", label: "Media" },
        { href: "/admin/messages", label: "Messages", badge: unread || undefined },
      ],
    },
  ];

  return (
    <ToastProvider>
      <div className="flex min-h-[100dvh] flex-col lg:flex-row">
        <Sidebar
          groups={groups}
          user={{
            name: session.user.name ?? "Admin",
            email: session.user.email ?? "",
          }}
        />
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </div>
    </ToastProvider>
  );
}
