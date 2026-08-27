import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  // JWT sessions: no DB round-trip per request, and no adapter tables to keep
  // in sync. The password itself is always verified server-side against the
  // hash in Postgres.
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  pages: { signIn: "/admin/login", error: "/admin/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });

        // Compare against a dummy hash when the user is missing so that a
        // wrong email and a wrong password take the same amount of time.
        const hash =
          user?.passwordHash ??
          "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
        const ok = await bcrypt.compare(parsed.data.password, hash);
        if (!user || !ok) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role ?? "ADMIN";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});

/// Every mutating server action calls this first. Throws instead of returning
/// so a forgotten `if` can never silently allow an anonymous write.
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return session.user;
}

export async function currentUser() {
  const session = await auth();
  return session?.user ?? null;
}
