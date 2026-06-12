# Sprint 0 Snapshot — Scaffold + Auth + RBAC + RLS

**Date:** 2026-06-12 · **Status:** ✅ Goal met (role isolation proven by test)

## Goal (from sprint-0.md)
> `pnpm dev` works. Postgres + pgvector running with RLS. User can sign up as
> family OR caregiver OR employer, log in, and **role isolation proven by test**.

## Task status
| Task | Status | Notes |
|---|---|---|
| S0-01 workspace | ✅ | pnpm workspace, biome, tsconfig, vitest |
| S0-02 web Next.js 15 | ✅ | App Router, TS strict, next-intl fr/ar/en, RTL |
| S0-03 core | ✅ | Money, Role, RBAC, Zod schemas |
| S0-04 Drizzle schema | ✅ | 15 tables; migration `0000_*` generated |
| S0-05 RLS helper | ✅ | withUserContext / withAdminContext (⚠ see findings) |
| S0-06 init SQL | ✅ | pgvector + pg_trgm + riaya_app role |
| S0-07 Auth.js v5 | ✅ | Credentials (Argon2id) + Google; session `{userId, role}` |
| S0-08 withRole() | ✅ | lib/session.ts — role resolved server-side only |
| S0-09 signup/login | ✅ | app/[locale]/auth/* + server actions; admin excluded |
| S0-10 layout/auth | ✅ | role-aware AppHeader wired into [locale] layout |
| S0-11 shadcn | ◑ | tokens in globals.css; forms built on plain Tailwind. shadcn install deferred (not DoD-blocking) |
| S0-12 app shell | ✅ | role badge + sign-out / sign-in-up nav |
| S0-13 Docker Compose | ✅ | postgres+pgvector (host 5439) + full profile (web/worker/caddy) |
| S0-14 pg-boss worker | ✅ | apps/worker — 4 queues + schedules (stub handlers) |
| S0-15 CI | ✅ | .github/workflows/ci.yml — pgvector service, lint/typecheck/migrate/test/build + gitleaks |
| S0-16 role isolation | ✅ | 6 RLS tests vs live DB as riaya_app — CIN + children data isolation proven |
| S0-17 snapshot | ✅ | this file |

## Verification (this session)
- `pnpm lint` (biome, 73 files) — clean
- `pnpm -r typecheck` (core, db, worker, web) — clean
- `pnpm test` — **17/17 passing** (rbac 7, password 4, RLS isolation 6)
- `docker compose up -d postgres` healthy; `db:generate` + `db:migrate` applied schema + RLS + grants

## ✅ Findings — RESOLVED (post-Sprint-0, 2026-06-12)
1. **App DB role → dual connection.** `packages/db/client.ts` now exports
   `db` (connects as non-superuser **`riaya_app`** → RLS enforced) and `authDb`
   (privileged, RLS-bypassed) for the narrow set of ops that run without a user
   context: Auth.js identity lookups + signup insert (auth.ts, auth/actions.ts
   now use `authDb`). Added **`users_insert`** RLS policy (`role <> 'admin' OR
   is_admin()`). `migrate.ts` now uses `DATABASE_URL_ADMIN`, ensures the
   `riaya_app` role exists, and grants — self-sufficient for CI. `.env` /
   `.env.example` / compose / ci.yml updated to the two-URL model.
2. **withUserContext() connection binding → fixed.** It now passes the scoped
   `tx` into `fn(tx)` and uses parameterized `set_config(..., is_local=>true)`,
   so handler queries run on the connection that holds the GUCs.
   Verified: `rls.test.ts` was rewritten to drive the REAL `db` + `withUserContext`
   (not raw set_config). The owner/admin ALLOW cases returning rows proves the
   GUC binds correctly; a new test confirms the app role cannot self-insert an
   admin user. 17/17 tests green with both DB URLs; suite skips cleanly without.

## Decisions locked this session
- Argon2id via `@node-rs/argon2` (prebuilt, Windows-safe) — not native `argon2`
- Auth.js TS2742 resolved via explicit `NextAuthResult` export annotations + `@auth/core` direct dep
- Google OAuth first-time users provisioned as `family` (no OAuth role-picker in v0.1)
- Schema files use extensionless relative imports (drizzle-kit loader compatibility)
- Local Postgres host port = **5439** (avoids collisions with other local DBs)
