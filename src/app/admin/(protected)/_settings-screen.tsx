import { prisma } from "@/lib/db";
import { SettingsForm } from "@/components/admin/SettingsForm";

/** Shared body for the three SiteSetting screens. Adding a fourth group is a
 *  four-line page file plus seed rows. No new form code. */
export async function SettingsScreen({
  group,
  title,
  description,
}: {
  group: string;
  title: string;
  description: string;
}) {
  const settings = await prisma.siteSetting.findMany({
    where: { group },
    orderBy: { displayOrder: "asc" },
    select: {
      key: true,
      value: true,
      label: true,
      description: true,
      type: true,
      options: true,
    },
  });

  return (
    <div>
      <header className="border-b border-[var(--line)] pb-5">
        <p className="t-meta">Site</p>
        <h1 className="t-display mt-3 text-[clamp(1.75rem,5vw,2.75rem)]">{title}</h1>
        <p className="mt-3 max-w-[62ch] text-[0.8125rem] leading-relaxed text-[var(--muted)]">
          {description}
        </p>
      </header>

      <div className="mt-8">
        {settings.length === 0 ? (
          <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--line-strong)] px-6 py-12 text-center">
            <p className="t-meta">
              No settings in this group. Run the seed to create them.
            </p>
          </div>
        ) : (
          <SettingsForm group={group} settings={settings} />
        )}
      </div>
    </div>
  );
}
