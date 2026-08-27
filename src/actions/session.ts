"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";

export type LoginResult = { ok: boolean; error?: string };

export async function login(
  email: string,
  password: string,
  callbackUrl?: string,
): Promise<LoginResult> {
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: "Wrong email or password." };
    }
    throw e;
  }
  // Signal only. The client navigates, so the middleware sees the fresh cookie.
  return { ok: true, error: callbackUrl };
}

export async function logout() {
  await signOut({ redirectTo: "/admin/login" });
}
