import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DDL requires the owner/superuser; prefer the admin URL, fall back to the app URL.
const connectionString = process.env.DATABASE_URL_ADMIN ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL_ADMIN or DATABASE_URL is not set");

const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

// Ensure extensions + the non-superuser app role exist (idempotent) — so this
// works in CI where sql/init.sql is not mounted into the Postgres service.
console.log("Ensuring extensions + app role...");
await sql.unsafe(`
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS vector;
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE EXTENSION IF NOT EXISTS btree_gist;
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'riaya_app') THEN
      CREATE ROLE riaya_app LOGIN PASSWORD 'change-me-in-production';
    END IF;
  END
  $$;
  GRANT USAGE ON SCHEMA public TO riaya_app;
`);

console.log("Running migrations...");
await migrate(db, {
  migrationsFolder: path.join(__dirname, "../drizzle"),
});
console.log("Migrations complete.");

console.log("Applying RLS policies...");
const rlsSql = readFileSync(path.join(__dirname, "../sql/rls.sql"), "utf-8");
await sql.unsafe(rlsSql);
console.log("RLS policies applied.");

// Tables are created by the migration superuser; grant the non-superuser app
// role access so it can operate under RLS (RLS only enforces for non-superusers).
console.log("Granting app role privileges...");
await sql.unsafe(`
  GRANT ALL ON ALL TABLES IN SCHEMA public TO riaya_app;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO riaya_app;
`);
console.log("Grants applied.");

await sql.end();
