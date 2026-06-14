import type { Role } from "@riaya/core";
import { type Tx, db, withUserContext } from "@riaya/db";
import { type SessionUser, requireRole } from "./session.js";

/**
 * Server-action factory enforcing RBAC **and** running the handler inside a
 * Postgres transaction with the RLS user context set (app.current_user /
 * app.current_role). All feature data access must go through here — never the
 * privileged `authDb`, which bypasses RLS.
 *
 * The handler receives the scoped `tx` (use it for every query so RLS applies)
 * and the verified `SessionUser` (id/role are trusted, never from the client).
 *
 * @example
 *   export const updateMyProfile = withRoleTx(
 *     ["caregiver"],
 *     async (tx, user, input) => { ... }
 *   );
 */
export function withRoleTx<TArgs extends unknown[], TResult>(
  allowed: Role[],
  handler: (tx: Tx, user: SessionUser, ...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    const user = await requireRole(allowed);
    return withUserContext(db, user.id, user.role, (tx) => handler(tx, user, ...args));
  };
}
