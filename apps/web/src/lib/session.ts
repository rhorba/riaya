import { type Role, assertRole } from "@riaya/core";
import { auth } from "../auth.js";

/** Thrown when no authenticated session is present. */
export class AuthenticationError extends Error {
  constructor() {
    super("Authentication required.");
    this.name = "AuthenticationError";
  }
}

export type SessionUser = {
  id: string;
  role: Role;
  email: string;
  name: string;
};

/**
 * Resolve the current session user, or null if unauthenticated.
 * Role and id come from the server-side session ONLY — never client input.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u.role) return null;
  return {
    id: u.id,
    role: u.role,
    email: u.email ?? "",
    name: u.name ?? "",
  };
}

/** Require any authenticated user; throws AuthenticationError otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthenticationError();
  return user;
}

/** Require an authenticated user with one of the allowed roles. */
export async function requireRole(allowed: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  assertRole(user.role, allowed); // throws AuthorizationError if not permitted
  return user;
}

/**
 * Server-action / handler factory enforcing RBAC.
 *
 * The session is resolved internally so `role` and `userId` can NEVER be
 * supplied by the client. The wrapped handler receives the verified
 * `SessionUser` as its first argument.
 *
 * @example
 *   export const createBooking = withRole(["family"], async (user, input) => {
 *     // user.id / user.role are trusted
 *   });
 */
export function withRole<TArgs extends unknown[], TResult>(
  allowed: Role[],
  handler: (user: SessionUser, ...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    const user = await requireRole(allowed);
    return handler(user, ...args);
  };
}
