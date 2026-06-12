"use server";

import { signIn, signOut } from "@/auth";
import { hashPassword } from "@/lib/password";
import { SignInSchema, SignUpSchema } from "@riaya/core";
import { authDb, users } from "@riaya/db";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";

export type AuthState = { error: string } | null;

/**
 * Create a family/caregiver/employer account (admin is excluded by SignUpSchema)
 * with an Argon2id password hash, then sign the user in.
 */
export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = SignUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: "invalidCredentials" };

  const { email, password, name, role } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const [existing] = await authDb
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);
  if (existing) return { error: "emailTaken" };

  const passwordHash = await hashPassword(password);
  await authDb.insert(users).values({
    email: normalizedEmail,
    name,
    role, // never 'admin' — enforced by SignUpSchema
    passwordHash,
  });

  // signIn throws NEXT_REDIRECT on success (which must propagate).
  try {
    await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "invalidCredentials" };
    throw error;
  }
  return null;
}

/** Email + password sign-in. */
export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalidCredentials" };

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "invalidCredentials" };
    throw error;
  }
  return null;
}

/** Google OAuth sign-in (first-time users are provisioned as 'family'). */
export async function googleSignInAction(): Promise<void> {
  await signIn("google", { redirectTo: "/" });
}

/** Sign the current user out and return to the home page. */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
