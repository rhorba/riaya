import type { Role } from "@riaya/core";
import { sql } from "drizzle-orm";
import type { Database } from "./client.js";

/**
 * The transaction handle drizzle hands to a `db.transaction` callback.
 * Handlers MUST query through this `tx` so they run on the same connection
 * that holds the `SET LOCAL` GUCs — otherwise RLS sees no user context.
 */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Set app.current_user / app.current_role on the connection for the duration of
 * a transaction, then run `fn` against that same connection. RLS policies read
 * these GUCs (via app_user() / app_role()).
 *
 * The handler receives the transaction `tx` so all of its queries run on the
 * connection that holds the settings. Values are parameterized via set_config
 * (no string interpolation → injection-safe).
 */
export function withUserContext<T>(
  db: Database,
  userId: string,
  role: Role,
  fn: (tx: Tx) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user', ${userId}, true)`);
    await tx.execute(sql`select set_config('app.current_role', ${role}, true)`);
    return fn(tx);
  });
}

/**
 * Context for admin operations (admins bypass user-scoped filtering via is_admin()).
 * Only call after assertRole(session, ['admin']).
 */
export function withAdminContext<T>(
  db: Database,
  adminUserId: string,
  fn: (tx: Tx) => Promise<T>
): Promise<T> {
  return withUserContext(db, adminUserId, "admin", fn);
}
