import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

const appUrl = process.env.DATABASE_URL;
if (!appUrl) throw new Error("DATABASE_URL is not set");

/**
 * Application pool — connects as the non-superuser `riaya_app` role, so RLS is
 * ENFORCED. Use this for all user-facing data access, always wrapped in
 * `withUserContext()` so the row-level policies have a user context.
 */
export const pool = postgres(appUrl, { max: 10 });
export const db = drizzle(pool, { schema });

/**
 * Privileged pool — connects as the DB owner/superuser, so RLS is BYPASSED.
 * Restricted to operations that legitimately run without a user context:
 *   - Auth.js identity lookups (find user by email pre-login) + signup insert
 *   - system writes (escrow/audit) performed under withAdminContext elsewhere
 * Never expose this to feature code paths. Defaults to the app URL if a
 * dedicated admin URL is not configured (e.g. single-role local setups).
 */
const adminUrl = process.env.DATABASE_URL_ADMIN ?? appUrl;
export const adminPool = postgres(adminUrl, { max: 5 });
export const authDb = drizzle(adminPool, { schema });

export type Database = typeof db;
