"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { contactSchema } from "@/lib/resources";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type ContactResult = {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function submitContact(
  values: Record<string, unknown>,
): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(values);

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (typeof path === "string") (fieldErrors[path] ??= []).push(issue.message);
    }
    // The honeypot failing is a bot. Return the generic success shape so it
    // learns nothing, but write nothing to the database.
    if (fieldErrors.website) {
      return { ok: true, message: "Message received." };
    }
    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }

  const h = await headers();
  const ip = clientIp(h);
  const limit = Number(process.env.CONTACT_RATE_LIMIT ?? 5);
  const windowSeconds = Number(process.env.CONTACT_RATE_WINDOW_SECONDS ?? 3600);

  try {
    const gate = await rateLimit(`contact:${ip}`, limit, windowSeconds);
    if (!gate.ok) {
      const minutes = Math.ceil(gate.retryAfterSeconds / 60);
      return {
        ok: false,
        error: `Too many messages from this address. Try again in ${minutes} minute${
          minutes === 1 ? "" : "s"
        }.`,
      };
    }

    await prisma.contactMessage.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        subject: parsed.data.subject,
        message: parsed.data.message,
        ip,
        userAgent: h.get("user-agent")?.slice(0, 500) ?? null,
      },
    });

    revalidatePath("/admin/messages");
    revalidatePath("/admin");

    return {
      ok: true,
      message: "Message received. I read everything and reply to what I can.",
    };
  } catch {
    return {
      ok: false,
      error: "Could not save the message right now. Try again shortly.",
    };
  }
}
