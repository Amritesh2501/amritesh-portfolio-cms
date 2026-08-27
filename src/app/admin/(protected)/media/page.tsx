import { prisma } from "@/lib/db";
import { MediaManager } from "@/components/admin/MediaManager";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const media = await prisma.media.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      key: true,
      filename: true,
      mimeType: true,
      size: true,
      alt: true,
      createdAt: true,
    },
  });

  const driver = process.env.STORAGE_DRIVER === "s3" ? "s3" : "local disk";

  return (
    <div>
      <header className="border-b border-[var(--line)] pb-5">
        <p className="t-meta">System</p>
        <h1 className="t-display mt-3 text-[clamp(1.75rem,5vw,2.75rem)]">Media</h1>
        <p className="mt-3 max-w-[62ch] text-[0.8125rem] leading-relaxed text-[var(--muted)]">
          Upload, replace, describe and delete files. Storage driver:{" "}
          <span className="text-[var(--fg)]">{driver}</span>. Switch with
          STORAGE_DRIVER in .env, no code change.
        </p>
      </header>

      <div className="mt-8">
        <MediaManager
          items={media.map((m) => ({
            ...m,
            createdAt: m.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
