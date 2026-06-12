# sessions
<!-- append-only log — session start/end snapshots -->

## SESSION_START — PROJECT INITIALIZED
Sprint: 0 — Ready to start
Status: Fresh project. Framework scaffolded. All S0 tasks pending.
Goal: `pnpm dev` works, signup/login (email + Google OAuth) works,
Postgres+pgvector running with RLS, role isolation proven (family cannot access CIN docs).
Next: Begin S0-01 (pnpm workspace) → S0-06 (pgvector extension) → S0-07 (Auth.js 4 roles)

---

## SESSION_END — 2026-06-12 — SPRINT 0 COMPLETE ✅

Sprint: 0 — DONE (goal met; awaiting Sprint 1 approval)
Completed this session:
- S0-07 Auth.js v5: apps/web/src/auth.ts (JWT, Credentials w/ Argon2id via @node-rs/argon2, Google provider; first-time Google users → 'family', never admin; jwt+session callbacks resolve {userId,role} from DB only). lib/password.ts. types/next-auth.d.ts. TS2742 fixed via NextAuthResult export annotations + @auth/core@0.41.2.
- S0-08 withRole(): apps/web/src/lib/session.ts (getSessionUser/requireUser/requireRole/withRole — role server-side only)
- S0-09 signup/login: app/[locale]/auth/{login,signup}/page.tsx + actions.ts (signUp/signIn/googleSignIn/signOut). pages.signIn=/fr/auth/login
- S0-10 + S0-12: role-aware AppHeader (components/app-header.tsx) wired into [locale] layout; nav i18n keys added (fr/ar/en)
- S0-13 Docker Compose: docker-compose.yml (postgres+pgvector host:5439 + full profile web/worker/caddy) + Caddyfile + apps/{web,worker}/Dockerfile
- S0-14 pg-boss worker: apps/worker (4 queues: booking.reminders/escrow.sweep/email.digest/employer.invoice + cron schedules; stub handlers)
- S0-15 CI: .github/workflows/ci.yml (pgvector service; install/lint/typecheck/migrate/test/build + gitleaks)
- S0-16 role isolation: packages/db/src/rls.test.ts — 6 tests vs LIVE DB as riaya_app (CIN docs + children data isolation proven)
- S0-17 snapshot: .claude/.logs/sprint-0-snapshot.md
- DB live: docker postgres healthy; db:generate → drizzle/0000_*; db:migrate applied schema+RLS+grants. Schema imports made extensionless (drizzle-kit). migrate.ts grants tables to riaya_app.
- Tests authored: rbac.test.ts (7), password.test.ts (4), rls.test.ts (6) = 17/17 green. Lint clean (73 files). Typecheck clean (core/db/worker/web).

S0-11 (shadcn) DEFERRED — not DoD-blocking (tokens in globals.css; forms on plain Tailwind).

✅ SPRINT 0 SECURITY/DBA FINDINGS — RESOLVED this session (user chose "fix findings, then pause"):
1. Dual DB connection: db=riaya_app (RLS enforced) + authDb=superuser (auth/system only). users_insert policy added. migrate.ts self-sufficient (DATABASE_URL_ADMIN + creates riaya_app + grants). auth.ts/actions use authDb.
2. withUserContext() passes scoped tx into fn(tx) + parameterized set_config. rls.test.ts rewritten to drive REAL db+withUserContext. 17/17 green (skips cleanly w/o DB env).
ENV MODEL CHANGED: DATABASE_URL=riaya_app, DATABASE_URL_ADMIN=superuser (see .env.example).

RESUME INSTRUCTIONS:
1. Invoke orchestrator. SPRINT BOUNDARY — Sprint 0 done + findings fixed. Get Sprint 1 approval.
2. Sprint 1 = Data model + profiles (caregiver/family/employer) + demo seed. ALL feature data access goes through `db` + withUserContext (NEVER authDb — that's auth/system only).
3. To run locally: `docker compose up -d postgres` (port 5439); set BOTH DATABASE_URL (riaya_app) + DATABASE_URL_ADMIN (superuser); `pnpm --filter @riaya/db db:migrate`; `pnpm dev`. rls.sql not idempotent → reset with `docker compose down -v` before re-migrating a dirty DB.

---

## SESSION_END — 2026-06-04

Sprint: 0 — In progress
Completed this session:
- S0-01 DONE: root package.json, pnpm-workspace.yaml, .npmrc, biome.json, tsconfig.base.json, tsconfig.json, .env.example, vitest.config.ts, .gitignore
- S0-03 DONE: packages/core — money.ts, types.ts, rbac.ts, schemas.ts, index.ts
- Package stubs DONE: db, booking, payments, matching, verification, notifications (each has package.json + tsconfig.json + src/index.ts)
- S0-02 DONE: apps/web — next.config.ts, tsconfig.json, package.json, postcss.config.mjs, globals.css (Tailwind v4 + terracotta/sage tokens), next-intl routing, middleware, [locale] layout (dir=rtl for ar), messages/fr.json + ar.json + en.json, src/lib/utils.ts
- S0-04 DONE: Drizzle schema — enums, users, caregivers, families, employers, bookings (with escrows + reviews), audit logs, access_audit_logs, availability_slots
- S0-05 DONE: withUserContext() + withAdminContext() in packages/db/src/rls.ts; DB client in client.ts
- S0-06 DONE: sql/init.sql (pgvector, pg_trgm extensions, riaya_app role), sql/rls.sql (full RLS for all tables), drizzle.config.ts, migrate.ts (runs migrations then applies RLS)
- pnpm install: SUCCESS (157 packages, builds approved for biome/esbuild/sharp)

Remaining S0 tasks:
- S0-07: Security Engineer → Auth.js v5 (email+Argon2id + Google OAuth)
- S0-08: Backend Dev → withRole() server action factory
- S0-09: Backend Dev → signup/login pages
- S0-10: Frontend Dev → next-intl [locale] layout + dir switch (PARTIALLY DONE — layout exists, needs auth integration)
- S0-11: UI Designer → Tailwind v4 terracotta/sage tokens + shadcn/ui (PARTIALLY DONE — tokens in globals.css, shadcn install pending)
- S0-12: Frontend Dev → role-aware nav + app shell
- S0-13: DevOps → Docker Compose
- S0-14: DevOps → pg-boss worker
- S0-15: DevOps → GitHub Actions CI
- S0-16: Tester → role isolation test
- S0-17: Project Monitor → sprint snapshot

RESUME INSTRUCTIONS:
1. Invoke orchestrator skill
2. First task: S0-07 — Security Engineer → Auth.js v5 setup
3. Need: install next-auth@^5.0.0-beta, @auth/drizzle-adapter, argon2; write auth.ts config (Credentials + Google providers); write authSession type extending JWT with role; Auth adapter wired to @riaya/db schema
4. Then S0-08: withRole() factory in apps/web/src/lib/auth.ts
5. Then S0-09: signup/login pages at app/[locale]/(auth)/

Key files written this session:
- packages/core/src/{money,types,rbac,schemas,index}.ts
- packages/db/src/{client,rls,migrate}.ts + schema/{enums,users,caregivers,families,employers,bookings,audit,index}.ts + sql/{init,rls}.sql + drizzle.config.ts
- apps/web/src/{middleware.ts,i18n/routing.ts,i18n/request.ts,app/globals.css,app/[locale]/layout.tsx,app/[locale]/page.tsx,app/page.tsx,lib/utils.ts}
- apps/web/messages/{fr,ar,en}.json

## SESSION_END — 2026-06-03
Sprint: 0 — In progress
Completed this session:
- Audited project state: confirmed 100% clean start (no package.json, no pnpm workspace, no Next.js)
- Environment confirmed: Node v22.22.0, pnpm 10.28.1, Git 2.45.1
- Removed malformed `packages/{core,...}` directory (from failed Windows shell brace expansion)
- Loaded all sprint backlogs, confirmed S0-01 through S0-17 all pending
- Tech Lead + Orchestrator skills loaded, plan ready
- Tech stack confirmed: Next.js 15, TypeScript strict, Tailwind v4, Auth.js v5, Drizzle ORM, pgvector, next-intl

Status of S0 tasks at session end:
- S0-01 (pnpm workspace): NOT STARTED — ready to write
- S0-02 (apps/web Next.js 15): NOT STARTED — ready to write
- S0-03 (packages/core Money/Role/RBAC/Zod): NOT STARTED — ready to write
- S0-04 through S0-17: NOT STARTED

RESUME INSTRUCTIONS:
1. Run: Skill → orchestrator → will read this log → auto-resume at S0-01
2. First task: write root package.json + pnpm-workspace.yaml + .npmrc + biome.json + tsconfig.base.json + .env.example + vitest.config.ts
3. Then: packages/core full implementation (money.ts, types.ts, rbac.ts, schemas.ts, index.ts)
4. Then: apps/web Next.js 15 scaffold (next.config.ts, Tailwind v4, next-intl fr/ar/en, [locale] layout)
5. Then: stub package.json + tsconfig + index.ts for db/booking/payments/matching/verification/notifications
6. Then handoff to DBA for S0-04 (Drizzle users table) → Security Engineer S0-07 (Auth.js v5)

Key decisions locked in:
- Packages export TypeScript source directly (no build step); Next.js uses transpilePackages
- All package names: @riaya/core, @riaya/db, @riaya/booking, @riaya/payments, @riaya/matching, @riaya/verification, @riaya/notifications, @riaya/web
- Money = branded integer centimes type
- next-intl v3 with [locale] App Router layout, dir=rtl for ar
- Tailwind v4 with @tailwindcss/postcss, tokens in CSS @theme block
- Auth.js v5 (next-auth@^5.0.0)
