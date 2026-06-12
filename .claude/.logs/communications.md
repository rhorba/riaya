# communications
<!-- append-only log — specialist handoffs -->

HANDOFF: DBA → Security Engineer
Task: S0-07 Auth.js v5 setup
Context: Full Drizzle schema written (users, caregivers, families, employers, bookings, escrows, reviews, audit, access_audit). RLS policies in sql/rls.sql. withUserContext() helper in packages/db/src/rls.ts sets app.current_user + app.current_role per session.
Need: Implement Auth.js v5 with email+password (Argon2id) + Google OAuth. withRole() server action factory. Signup enforces role selection (family/caregiver/employer only — admin via seed). Email verification flow.
Constraints: Role stored server-side only (never from client). Session = { userId, role }. Admin accounts only via seed/DB — no self-promotion endpoint. CIN/docs access gated by admin role + document owner.

HANDOFF: Security Engineer + Backend Dev → Tester / DevOps
Task: S0-07/08/09 DONE — Auth.js v5 + withRole() + signup/login pages
Context: auth.ts (JWT strategy, Credentials w/ Argon2id via @node-rs/argon2, Google provider; signIn callback provisions first-time Google users as 'family', never admin; jwt+session callbacks resolve {userId, role} from DB only). lib/password.ts (Argon2id OWASP params). lib/session.ts (getSessionUser/requireUser/requireRole/withRole factory — session resolved server-side, role never from client). app/[locale]/auth/{login,signup}/page.tsx + actions.ts (signUp/signIn/googleSignIn server actions, SignUpSchema excludes admin). types/next-auth.d.ts augments Session/JWT with role. Notes resolved: TS2742 via explicit NextAuthResult export annotations + @auth/core@0.41.2 direct dep; pages.signIn = /fr/auth/login.
Verified: pnpm --filter @riaya/web typecheck CLEAN; biome check CLEAN (16 files); pnpm test 11/11 PASS (rbac.test.ts 7, password.test.ts 4).
Need: (DevOps) S0-13 Docker Compose to bring up Postgres+pgvector so DB-dependent flows (signup insert, login verify, RLS) can run end-to-end. (Tester) S0-16 role-isolation test requires that DB. S0-10/11/12 frontend nav/app-shell + shadcn still pending.
Constraints: Argon2id binding is @node-rs/argon2 (prebuilt, Windows-safe — do NOT swap for native `argon2`). Google new-user default role 'family' is a v0.1 limitation (no role-picker for OAuth yet). No .env present yet — runtime needs DATABASE_URL + AUTH_SECRET.

HANDOFF: DevOps + Tester → Project Monitor (SPRINT 0 COMPLETE)
Task: S0-13/14/15/16/17 DONE — Docker, worker, CI, role-isolation test, snapshot
Context: docker-compose.yml (postgres+pgvector on host 5439 + full profile web/worker/caddy), Caddyfile, apps/worker (pg-boss, 4 queues+schedules, stub handlers) + Dockerfiles, .github/workflows/ci.yml (pgvector service, lint/typecheck/migrate/test/build + gitleaks). DB brought up live: db:generate produced drizzle/0000_*, db:migrate applied schema+RLS+grants. Fixed: schema files now use extensionless imports (drizzle-kit loader); .env + .env.example use port 5439; migrate.ts grants tables to riaya_app.
Verified: pnpm lint CLEAN (73 files); pnpm -r typecheck CLEAN; pnpm test 17/17 PASS incl. 6 live RLS isolation tests (packages/db/src/rls.test.ts) — family blocked from CIN docs + other families' children data; caregiver-owner + admin allowed; anonymous denied.
Need (Sprint 1, Security/DBA — see sprint-0-snapshot.md §Findings): (1) add users_insert RLS policy + switch app DATABASE_URL to riaya_app so RLS actually enforces in-app (currently app would run as superuser = RLS bypassed); (2) fix withUserContext() to pass the scoped tx into fn() (SET LOCAL may not bind to the query connection). S0-11 shadcn install still deferred (tokens done, forms on plain Tailwind).
Constraints: RLS verified at DB level only; in-app enforcement depends on finding (1)+(2). Booking/escrow/verification modules still unbuilt (Sprint 2+).

HANDOFF: Security Engineer + DBA → (paused) — SPRINT 0 FINDINGS RESOLVED
Task: Fixed both carried RLS findings (user chose "fix findings, then pause")
Context: (1) Dual connection in packages/db/client.ts — `db`=riaya_app (RLS enforced, default for feature code), `authDb`=superuser (RLS bypass) for Auth.js identity lookups + signup insert ONLY. auth.ts + auth/actions.ts switched to authDb. Added users_insert RLS policy (role <> 'admin' OR is_admin()). migrate.ts now uses DATABASE_URL_ADMIN, ensures riaya_app role + GRANTs (self-sufficient for CI). .env/.env.example/docker-compose/ci.yml updated to two-URL model (DATABASE_URL=riaya_app, DATABASE_URL_ADMIN=superuser). (2) withUserContext() now passes scoped tx into fn(tx) with parameterized set_config(is_local) — GUC binds to the query connection.
Verified: fresh DB (docker compose down -v → up → db:migrate clean). pnpm lint CLEAN (73), pnpm -r typecheck CLEAN, pnpm test 17/17 with both URLs (rls.test.ts rewritten to drive REAL db+withUserContext + a test proving app role cannot self-insert admin), and skips cleanly (6 skipped) without DB env.
Need: (next session) Sprint 1 approval — data model + caregiver/family/employer profiles + demo seed. All feature data access must go through `db` + withUserContext (never authDb). authDb is auth/system-only.
Constraints: rls.sql is NOT idempotent (CREATE POLICY) — re-migrate needs a fresh DB; idempotency is backlog. PII/escrow/booking still unbuilt.
