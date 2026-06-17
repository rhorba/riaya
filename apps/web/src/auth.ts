import { type Role, SignInSchema } from "@riaya/core";
import { authDb, users } from "@riaya/db";
import { eq } from "drizzle-orm";
import NextAuth, { type NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { verifyPassword } from "./lib/password.js";
import { clearLoginFailures, isRateLimited, recordLoginFailure } from "./lib/rate-limit.js";

/**
 * Auth.js v5 — Riaya.
 *
 * Session strategy is JWT (required by the Credentials provider). The session
 * always carries `{ userId, role }`. **Role is resolved server-side from the
 * users table on every sign-in — never read from client input.**
 *
 * Two sign-in paths:
 *  - Credentials: email + Argon2id password, role chosen at signup.
 *  - Google OAuth: first sign-in provisions a `family` user (the most common
 *    audience). Admin is NEVER provisioned here — admins exist via seed/DB only.
 */
const nextAuth = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    // Locale-prefixed (next-intl localePrefix: "always"); defaultLocale is fr.
    signIn: "/fr/auth/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = SignInSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const key = email.toLowerCase();

        // Reject immediately if this email is locked out (5 failures / 15 min).
        // We return null (same as wrong password) to avoid confirming the email exists.
        if (isRateLimited(key)) return null;

        const [user] = await authDb.select().from(users).where(eq(users.email, key)).limit(1);

        // No user, OAuth-only account (no password), or deactivated → deny + count.
        if (!user || !user.passwordHash || !user.isActive) {
          recordLoginFailure(key);
          return null;
        }

        const ok = await verifyPassword(user.passwordHash, password);
        if (!ok) {
          recordLoginFailure(key);
          return null;
        }

        // Success — clear failure counter.
        clearLoginFailures(key);

        // Role is attached for completeness; jwt callback re-reads from DB.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    Google({
      // Same person may sign in with Google after a credentials signup.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Provision a Riaya user row for first-time Google sign-ins.
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase();
        if (!email) return false;

        const [existing] = await authDb
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!existing) {
          await authDb.insert(users).values({
            email,
            name: user.name ?? email.split("@")[0] ?? email,
            role: "family", // default; never 'admin'
            emailVerified: true,
            emailVerifiedAt: new Date(),
            avatarUrl: user.image ?? null,
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // On sign-in `user` is present; resolve canonical id + role from DB.
      const email = user?.email ?? token.email;
      if (email) {
        const [dbUser] = await authDb
          .select({ id: users.id, role: users.role, active: users.isActive })
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);
        if (dbUser?.active) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.userId === "string") session.user.id = token.userId;
      if (token.role) session.user.role = token.role as Role;
      return session;
    },
  },
});

// Explicit type annotations work around TS2742 ("inferred type cannot be named")
// under pnpm — the documented Auth.js v5 workaround.
export const handlers: NextAuthResult["handlers"] = nextAuth.handlers;
export const auth: NextAuthResult["auth"] = nextAuth.auth;
export const signIn: NextAuthResult["signIn"] = nextAuth.signIn;
export const signOut: NextAuthResult["signOut"] = nextAuth.signOut;
