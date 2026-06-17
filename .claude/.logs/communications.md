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

HANDOFF: DBA + Backend Dev → Frontend Dev + Content Editor + Tester (Sprint 1)
Task: S1-01..06 + S1-11 DONE — schema gap closed + profile actions + demo seed
Context: Added notifications table (+ notification_type enum) with recipient/admin-only RLS; added HNSW pgvector index on caregiver_profiles.skill_vector (vector_cosine_ops). Migrations 0001/0002 generated + applied to live DB. Fixed core schemas.ts ID validators cuid2→uuid (IDs are UUIDs). New server-action factory withRoleTx() (apps/web/src/lib/db.ts) = RBAC + withUserContext tx; ActionResult helper. Profile actions: (caregiver)/profile/actions.ts, (family)/profile/actions.ts (incl. add/update/removeChild, children get server-gen UUIDs), (employer)/account/actions.ts (create/setBudget/enroll/setEmployeeActive). Idempotent demo seed (packages/db/src/seed.ts, uses authDb): 8 caregivers/4 families/2 employers/3 enrolled — re-run stable. Logins all demo1234.
Verified: pnpm -r typecheck CLEAN; pnpm test 17/17; fresh DB migrate clean; seed idempotent (counts stable).
Need: (Frontend) S1-07..10 profile UI + public caregiver SSR page + verification badge. (Content) S1-12 FR/AR for care types + verification levels + profile fields. (Tester) S1-13 role-isolation: family≠edit caregiver, CIN doc 403, notifications isolation.
Constraints: family children data = most sensitive; never list-render outside owner. Money is centimes — format on display only. exactOptionalPropertyTypes is ON (use `?: T | undefined` in shared types).

HANDOFF: Frontend + Content + Tester → Project Monitor (SPRINT 1 COMPLETE)
Task: S1-07..14 DONE — profile UIs + public SSR + verification badge + FR/AR + isolation tests + snapshot
Context: VerificationBadge component (5 levels, color-coded, hero trust signal). Public caregiver SSR page /[locale]/caregivers/[id] reads `db` with NO user context (caregiver_read USING(true)); display_name/photo_url denormalized onto caregiver_profiles so the RLS-locked users table is never read publicly. Profile forms (caregiver/family/employer) on plain Tailwind + server actions via withRoleTx. Route groups required real path segments (collision fix). fr/ar/en expanded (careTypes, verificationDesc, all field labels). +4 RLS tests (21/21).
Verified: lint clean (87), typecheck clean, test 21/21, webpack build passes, fresh-DB migrate+seed clean+idempotent.
Need: (next session) commit+push Sprint 1; Sprint 2 = caregiver search (public SSR, filterable by type/city/price/verification) + booking system (request→confirm→complete). CaregiverSearchSchema + BookingRequestSchema already in @riaya/core.
Constraints: all feature reads through `db`+withUserContext (or `db` w/o context only for public USING(true) tables); booking state machine lives in @riaya/booking (Sprint 2/3); money stays centimes.

HANDOFF: Frontend Dev → Tester
Task: S6-01..S6-04 Admin dashboard (KPIs, verification queue, dispute queue, escrow health)
Context: Admin area built at apps/web/src/app/[locale]/(admin)/admin/. All 4 pages + shared actions.ts + layout.tsx. Admin is role-gated (redirect to / if not admin). pnpm lint clean, pnpm build passes.
Need: (1) Admin role guard test: non-admin user GET /admin → redirect to /. (2) KPI aggregates: admin context sees all data (RLS bypass). (3) resolveDispute action: disputed→released correctly transitions escrow+booking atomically, audit log written.
Constraints: All admin queries run under withUserContext(db, userId, "admin") — admin role bypasses RLS. Document signed URL access is mandatory audit-logged (already enforced by verification-service). resolveDispute is irreversible.
