"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getStorage, UploadError } from "@/lib/storage";

export type MediaResult = {
  ok: boolean;
  error?: string;
  message?: string;
  media?: { id: string; url: string; filename: string; mimeType: string };
};

export async function uploadMedia(formData: FormData): Promise<MediaResult> {
  try {
    const user = await requireAdmin();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { ok: false, error: "No file received." };
    }

    const storage = getStorage();
    const stored = await storage.put(file);

    const record = await prisma.media.create({
      data: {
        filename: stored.filename,
        url: stored.url,
        key: stored.key,
        mimeType: stored.mimeType,
        size: stored.size,
        alt: (formData.get("alt") as string | null)?.slice(0, 300) || null,
        uploadedById: user.id,
      },
    });

    revalidatePath("/admin/media");
    return {
      ok: true,
      message: `Uploaded ${record.filename}.`,
      media: {
        id: record.id,
        url: record.url,
        filename: record.filename,
        mimeType: record.mimeType,
      },
    };
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, error: e.message };
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return { ok: false, error: "Your session expired. Sign in again." };
    }
    return { ok: false, error: "Upload failed." };
  }
}

/** Replaces the bytes behind an existing media row, keeping its id and usages. */
export async function replaceMedia(
  id: string,
  formData: FormData,
): Promise<MediaResult> {
  try {
    await requireAdmin();
    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, error: "No file received." };

    const existing = await prisma.media.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "That file no longer exists." };

    const storage = getStorage();
    const stored = await storage.put(file);
    await storage.delete(existing.key).catch(() => {});

    const record = await prisma.media.update({
      where: { id },
      data: {
        filename: stored.filename,
        url: stored.url,
        key: stored.key,
        mimeType: stored.mimeType,
        size: stored.size,
      },
    });

    revalidatePath("/", "layout");
    return {
      ok: true,
      message: "File replaced.",
      media: {
        id: record.id,
        url: record.url,
        filename: record.filename,
        mimeType: record.mimeType,
      },
    };
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, error: e.message };
    return { ok: false, error: "Replace failed." };
  }
}

export async function updateMediaAlt(
  id: string,
  alt: string,
): Promise<MediaResult> {
  try {
    await requireAdmin();
    await prisma.media.update({
      where: { id },
      data: { alt: alt.trim().slice(0, 300) || null },
    });
    revalidatePath("/admin/media");
    return { ok: true, message: "Alt text saved." };
  } catch {
    return { ok: false, error: "Could not save alt text." };
  }
}

export async function deleteMedia(id: string): Promise<MediaResult> {
  try {
    await requireAdmin();
    const existing = await prisma.media.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "That file no longer exists." };

    await getStorage().delete(existing.key).catch(() => {});
    await prisma.media.delete({ where: { id } });

    revalidatePath("/admin/media");
    return { ok: true, message: `Deleted ${existing.filename}.` };
  } catch {
    return { ok: false, error: "Delete failed." };
  }
}
