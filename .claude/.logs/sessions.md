# sessions
<!-- append-only log — session start/end snapshots -->

## SESSION_END — 2026-06-16 (b) — SPRINT 5 COMPLETE ✅

Sprint: 5 — DONE (Verification system + Reviews + Notifications + Email). Awaiting Sprint 6 approval. **NOT yet committed/pushed at time of writing — commit + push to `main` next.**

**Key finding: NO migration needed.** Schema (`verification_documents`/`reviews`/`notifications`/`access_audit_logs`) + RLS + enums were already in place from S0–1; `ReviewCreateSchema`/`DocumentTypeSchema` already in core. Sprint 5 = packages + services + actions + UI + adapters only. Full detail in `.claude/.logs/sprint-5-snapshot.md`.

Completed this session (S5-01..S5-11):
- **@riaya/verification** made PURE (dropped `@riaya/db` dep): `levels.ts` (`computeVerificationLevel` progressive ladder + `levelRank`), `files.ts` (`validateDocumentFile` JPEG/PNG/PDF + 5MB + stable codes), `storage.ts` (`DocumentStorage`/`DevStorage`/`buildDocumentKey`/`SIGNED_URL_TTL_SECONDS=900`). Subpaths all client-safe.
- **@riaya/notifications**: `email.ts` (`EmailProvider`/`DevEmailProvider`/`ResendEmailProvider` lazy import/`createEmailProvider` env-select), `templates.ts` (PURE FR welcome/bookingConfirmation/payoutReceipt/reviewRequest, no children PII).
- **verification-service.ts**: upload (consent→validate→storage.put PRIVATE→insert key-only+audit+recompute level), `getDocumentSignedUrl` (owner/admin via RLS visibility, **mandatory access_audit on every mint**), `reviewDocument` (admin approve/reject→recompute+notify). **notification-service.ts** (cross-user inserts via admin context, `notif` FR copy builders), **email-service.ts** (best-effort), **review-service.ts** (post-completion only, manual authz under system ctx, recompute avgRating, both-reviewed→release escrow early), **booking-events.ts** (notify+email side-effects after commit).
- **escrow-service** `releaseEscrowForBooking` (guarded captured→released early release; worker `escrow.sweep` = 24h fallback, now also notifies + emails payout). "both reviews OR 24h" branch fully implemented (was 24h-only).
- Lifecycle wired: request/accept/decline/complete/release/doc-review/signup → in-app + email. `requestBooking`/`declineBooking` split into `*Tx`+wrapper.
- **UI**: `/caregiver/verification` (badge+per-doc status+upload w/ consent gate), `/notifications` (list+mark-all-read+nav unread badge), `ReviewForm` (shared, action-injected) on completed bookings (family+caregiver). `reviewed` flag in both bookings queries.
- **i18n** fr/ar/en: nav (verification/notifications), documentTypes, documentStatus, verificationDash, verificationErrors, reviews(+errors), notifications.
- **Tests +18**: verification `levels.test.ts` (14 pure), `verification-rls.test.ts` (4 live: family 403 on CIN, docs_update admin-only, access-audit append/admin-read, review reviewer_id RBAC).
- **Seed** (idempotent): 13 verification docs (consistent w/ each caregiver's level), 4 reviews on completed bookings, demo notification.

VERIFIED: `pnpm lint` (149 files) clean; `pnpm -r typecheck` (9) clean; `pnpm test` **116/116** (was 98); `pnpm --filter @riaya/web build` (webpack) passes (new `/caregiver/verification` + `/notifications`); fresh `down -v`→migrate(0000–0006)+RLS+seed(8/4/2 + 6 bookings + 13 docs + 4 reviews)+embed(8) clean.

RESUME INSTRUCTIONS:
1. Invoke orchestrator. SPRINT BOUNDARY — Sprint 5 done, LOCAL ONLY → commit + push to `main` (single-branch). Get Sprint 6 approval.
2. Sprint 6 = Admin dashboard (KPIs, **verification queue** — `reviewDocument` service already built+tested, just needs admin pages + signed-URL view route, **dispute queue**, escrow health) + i18n/RTL/a11y sweep. Dispute raising (captured→disputed) + admin resolution also land here.
3. Local run: `docker compose up -d postgres` (5439); export `DATABASE_URL`(riaya_app)+`DATABASE_URL_ADMIN`(riaya:riaya); `pnpm db:setup` (migrate→seed→embed); `pnpm dev`. rls.sql non-idempotent → `down -v` to re-migrate a dirty DB.
4. Carry-forward: notification rows + email copy FR-only; DevStorage/DevEmailProvider in-memory/log (R2+Resend = v0.2 swap behind same interfaces, no dev creds); admin verification/dispute UI = Sprint 6; early-release recompute overrides seed's hardcoded illustrative avgRating once a demo review is left via the app.

## SESSION_END — 2026-06-16 — SPRINT 4 COMPLETE ✅

Sprint: 4 — DONE (Payments & Escrow + Employer subsidy). COMMITTED + PUSHED → `origin/main` @ `a8a3b91`. Awaiting Sprint 5 approval.

Built Module E end-to-end. Full detail in `.claude/.logs/sprint-4-snapshot.md`.

**DECISION (user-chosen): fee model = fee-on-top (marketplace standard).** Family pays gross + 12%; caregiver receives gross − 8%; platform keeps 20%; books balance. Supersedes the literal reading of `.claude` non-negotiable #5 (the family cap now applies to `familyGross`, not bare gross). The spec was self-contradictory; asked the user, who picked fee-on-top.

Completed this session (S4):
- **@riaya/payments** (NEW, pure, @riaya/core only): `amounts.ts` (`computeEscrowAmounts`/`capSubsidy`), `state-machine.ts` (escrow transitions), `gateway.ts` (`PaymentGateway` + `DevGateway`). Subpaths `.`/`./amounts`/`./state-machine`/`./gateway` (all client-safe — no DB dep).
- **Escrow lifecycle** (`apps/web/src/lib/escrow-service.ts`): authorize-on-confirm, capture-on-start, 24h dispute window on completion, refund-on-cancel (fee captured as caregiver compensation). Runs under `withSystem` = `withUserContext(db, actorId, "admin", …)` so system-only escrow RLS passes while audit attributes to the real actor; escrow mutation + AuditLog atomic. Booking actions split into `*Tx` (RLS-scoped transition) + thin wrapper calling the escrow service after. Idempotent (keyed on bookingId).
- **Employer subsidy**: `requestBooking` tags `employerAccountId` for active enrolled employees; `resolveSubsidy` = min(remaining monthly benefit, familyGross); deducts `employer.totalBudgetUsed`.
- **Worker**: `escrow-sweep.ts` (release captured past window → payout, idempotent guarded update) `*/15`; `employer-invoices.ts` (monthly prior-month subsidy invoice, idempotent unique period) `0 2 1 * *`.
- **Migration 0006** (`0006_sprint4_payments`, journal idx 6): `escrows.cancellation_fee` + new `employer_invoices` table + unique period index. rls.sql: employer_invoices (owner read, system write).
- **UI**: family tracker payment summary; `/caregiver/earnings`; `/employer/invoices`; nav links. **i18n** fr/ar/en (`earnings`, `invoices`, `booking.escrowStatus.*`).
- **Seed**: `seedBookings` (idempotent) — 6 bookings Sara↔Fatima across statuses incl. employer-subsidized + disputed + escrows.
- Snapshot: `.claude/.logs/sprint-4-snapshot.md`.

VERIFIED: `pnpm lint` (131 files) clean; `pnpm -r typecheck` clean; `pnpm test` **98/98** (was 78; +15 payments pure, +5 live escrow-rls); `pnpm --filter @riaya/web build` (webpack) passes (new earnings/invoices routes); fresh `down -v` → migrate (0000–0006) + RLS + seed (8/4/2 + 6 bookings/escrows) + `db:embed` (8) clean.

RESUME INSTRUCTIONS:
1. Invoke orchestrator. SPRINT BOUNDARY — Sprint 4 done, local only. Commit + push to `main` (single-branch). Get Sprint 5 approval.
2. Sprint 5 = Verification system (doc upload + admin queue) + Reviews + Notifications + Email (Resend). Reviews feed the escrow release "both reviews OR 24h" branch (currently 24h-only); dispute raising (captured→disputed, escrow already supports it) + admin resolution land here/Sprint 6.
3. Local run: `docker compose up -d postgres` (5439); export `DATABASE_URL`(riaya_app)+`DATABASE_URL_ADMIN`(riaya:riaya); `pnpm db:setup` (migrate→seed→embed); `pnpm dev`. rls.sql non-idempotent → `down -v` to re-migrate a dirty DB. Build/test/seed need both env vars exported.
4. Carry-forward: booking↔escrow are separate txs (DevGateway reliable; prod needs reconciliation sweep); release is 24h-timeout-only until reviews exist; demo seed = 6 bookings (DoD §8 says 10); `db:embed` mandatory after seed.

## SESSION_END — 2026-06-15 — SPRINT 3 COMPLETE ✅

Sprint: 3 — DONE (availability calendar + slot-aware booking + cancellation policy + pgvector AI matching + 1h reminder job). Awaiting Sprint 4 approval.

**Found Sprint 3 work uncommitted + unlogged in the working tree** (prior session ended at "Sprint 2 complete"). Assessed, fixed, verified, and committed it this session.

Completed / verified this session (S3-01..S3-11):
- **@riaya/booking**: `slots.ts` (PURE slot logic — `slotsForDate`/`windowCovered`/`openRangesForDate`/`slotsOverlap`), `cancellation.ts` (`computeCancellationFee`, 24h/50% default). Barrel + `./slots`/`./pricing` subpaths.
- **@riaya/matching**: `embedding.ts` (deterministic 384-dim feature-hashing, FNV-1a, FR+AR token-safe), `search.ts` (pgvector cosine `searchCaregivers` → `{id,score}`), `backfill.ts` (`db:embed`).
- **Caregiver availability route** `/caregiver/availability` (weekly grid + date-override editor + actions). Family booking form shows open ranges via `@riaya/booking/slots`.
- **Search page**: free-text `?q=` → pgvector relevance ranking; empty `q` → Sprint 2 structured browse (no regression). Structured filters AND into the vector query.
- **Cancellation policy** wired: caregiver sets `cancellationFreeHours`/`cancellationFeePercent` in profile; family cancel computes fee (charge deferred to Sprint 4).
- **Reminder job** `apps/worker/src/reminders.ts` (`sendBookingReminders`, authDb, PII-free, idempotent via `reminder_sent_at`); worker schedules `*/5 * * * *`.
- **Migration 0005** (`0005_sprint3_availability`): `caregiver_profiles.cancellation_free_hours`/`cancellation_fee_percent` + `bookings.reminder_sent_at`. Journal idx 5.
- **i18n** fr/ar/en: `availability` namespace + cancellation keys; top-level parity verified.
- Snapshot: `.claude/.logs/sprint-3-snapshot.md`.

FIXES this session (the in-tree work was ~95% done):
- Fixed 3 biome errors in `embedding.ts` (regex literals + justified `noMisleadingCharacterClass` ignore — the original `new RegExp` workaround did NOT satisfy biome).
- Added root `db:embed` + `db:setup` (`migrate && seed && embed`) — fresh seed without embed left free-text search empty (DoD gap closed).

VERIFIED: `pnpm lint` (118 files) clean; `pnpm -r typecheck` (9 projects) clean; `pnpm test` **78/78** (was 43); `pnpm --filter @riaya/web build` (webpack) passes; fresh `down -v` → migrate (0000–0005) + RLS + seed (8/4/2) + `db:embed` (8 vectors) clean.

KEY DECISIONS: see snapshot. Headlines: embeddings are deterministic feature-hashing (real model = v0.2 behind same interface); vector search opt-in via `?q=`; `db:embed` is a mandatory post-seed step (no db↔matching package cycle); reminder body is FR-only (notification rows carry no locale — v0.1 accepted).

RESUME INSTRUCTIONS:
1. Invoke orchestrator. SPRINT BOUNDARY — Sprint 3 done + committed. Get Sprint 4 approval.
2. Sprint 4 = Payments & Escrow + Employer subsidy (`packages/payments`): `computeEscrowAmounts`, escrow state machine, `PaymentGateway`/`DevGateway`, authorize-on-confirm / capture-on-start / release-after-reviews-or-24h / refund-on-cancel, employer subsidy deduction + monthly invoice sweep, caregiver earnings + employer invoice pages. Cancellation fee (computed in S3) gets charged here.
3. Local run: `docker compose up -d postgres` (5439); export `DATABASE_URL`(riaya_app)+`DATABASE_URL_ADMIN`(riaya:riaya); `pnpm db:setup` (migrate→seed→embed); `pnpm dev`. `rls.sql` non-idempotent → `down -v` to re-migrate a dirty DB.
4. Carry-forward: reminder body FR-only; `db:embed` mandatory after seed; no 0004/0005 drizzle snapshot quirks; cancellation fee not yet charged.

## SESSION_END — 2026-06-14 (c) — SPRINT 2 COMPLETE ✅

Sprint: 2 — DONE (public caregiver search + full booking lifecycle). Built on the `sprint-1` branch per user decision ("just push sprint 1 and go for sprint 2"). Awaiting Sprint 3 approval.

Completed this session (S2-01..S2-12):
- **@riaya/booking** package built: `state-machine.ts` (strict transition table + `canTransition`/`assertTransition`/`actorCanTransition`), `availability.ts` (`checkAvailability` overlap vs confirmed/in_progress), `pricing.ts` (`computeBookingAmount`/`durationMinutes`). Barrel `.` + subpath exports `./pricing`, `./state-machine`.
- **Migration 0004** (`0004_busy_silver_fox`): `btree_gist` + GiST `EXCLUDE` constraint `bookings_no_overlap` (no two confirmed/in_progress overlap per caregiver) + `family_ended_at`/`caregiver_ended_at` columns. Journal + schema updated; `init.sql`/`migrate.ts` ensure `btree_gist`.
- **Backend actions**: family `requestBooking`/`startSession`/`familyConfirmEnd`/`cancelBooking`/`getMyBookings`; caregiver `acceptBooking`/`declineBooking`/`caregiverConfirmEnd`/`getCaregiverBookings`. Shared `lib/booking-shared.ts` (`auditBooking`, `confirmSessionEnd`). All via `withRoleTx`; AuditLog atomic with each mutation.
- **Public search** `/[locale]/(public)/search` (SSR, no-JS GET filter form): careType / city (ILIKE on neighborhoods) / max hourly rate / min verification (ordered "at least") + pagination + SEO. `CaregiverCard` component.
- **Booking UI**: family request form (date/time/children/notes/urgent + live estimate), caregiver inbox (accept/decline-with-reason/confirm-end), family tracker (start/confirm-end/cancel), `BookingStatusBadge`. "Request a booking" CTA on public profile; role-aware nav links.
- **i18n** fr/ar/en: `search`, `booking`, `bookingStatus`, `bookingErrors` + nav.
- **Tests**: state-machine (8) + pricing (6) pure; booking-RLS (5: caregiver-can't-book, family-can't-book-for-other, scoped read, **exclusion-constraint double-booking blocked**, requested-doesn't-block) + availability (3) live-DB. Total **43/43**.
- Snapshot: `.claude/.logs/sprint-2-snapshot.md`.

KEY DECISIONS:
- No-double-booking = DB exclusion constraint (hard) + app `checkAvailability` (friendly). `requested` overlaps allowed; only one confirms.
- `@riaya/booking` barrel pulls in `@riaya/db` (postgres/Node) → client components import pure helpers from `@riaya/booking/pricing` only (fixed webpack `tls`/`fs` client-bundle error).
- `checkAvailability` is role-scoped: authoritative under caregiver context (sees all own bookings); best-effort under family context (privacy — families don't see a caregiver's other clients). Constraint is the backstop.
- Caregiver inbox shows NO family identity / children PII.
- In-app notification rows deferred to Sprint 5 (avoids cross-user insert / authDb); inbox+tracker are the surfaces.

VERIFIED: `pnpm lint` (biome 106 files) clean; `pnpm -r typecheck` clean; `pnpm test` 43/43; `pnpm --filter @riaya/web build` (webpack) passes; fresh-DB migrate (0000–0004)+RLS+seed clean. Build + migrate/seed/tests need `DATABASE_URL`+`DATABASE_URL_ADMIN` exported (no dotenv autoload).

RESUME INSTRUCTIONS:
1. Invoke orchestrator. SPRINT BOUNDARY — Sprint 2 done on `sprint-1` branch. Get Sprint 3 approval.
2. Sprint 3 = Availability calendar (caregiver-set `availability_slots`, already in schema) + booking state machine integration + AI matching (pgvector). Extend `checkAvailability` to honor published slots.
3. Local run: `docker compose up -d postgres` (5439); export `DATABASE_URL`(riaya_app)+`DATABASE_URL_ADMIN`(riaya:riaya); `db:migrate` → `db:seed`; `pnpm dev`. rls.sql non-idempotent → `docker compose down -v` to re-migrate a dirty DB.
4. Carry-forward: no 0004 drizzle snapshot (hand-written EXCLUDE) — future `generate` may re-add columns; cancellation fee not applied; availability calendar unused.

## SESSION_END — 2026-06-14 (b) — SPRINT 1 COMMITTED + PUSHED ✅

Sprint: 1 — DONE and now on remote. Still holding at sprint boundary (Sprint 2 NOT started — user chose "not yet").

This (short) session:
- Orchestrator resumed; confirmed Sprint 1 complete (21/21 green, build clean), local-only.
- User chose: commit + push sprint-1; do NOT start Sprint 2 yet.
- Committed all Sprint 1 work as `10d8181` ("Sprint 1: data model + profiles ... + demo seed", 37 files, +9570).
- Pushed `sprint-1` → `origin/sprint-1` (upstream now tracked). PR not opened.
- Note: a stale `.git/index.lock` blocked the first commit; removed it (`rm -f .git/index.lock`) and retried — succeeded. Git emitted LF→CRLF normalization warnings (cosmetic only).

GIT STATE NOW:
- `origin/sprint-1` @ `10d8181` (Sprint 1). `main` still @ `c5b94f5` (Sprint 0). No PR open yet.

RESUME INSTRUCTIONS:
1. Invoke orchestrator. SPRINT BOUNDARY — Sprint 1 done + pushed.
2. Open decisions: (a) open PR sprint-1 → main now, or keep stacking sprints on the branch? (b) Sprint 2 kickoff approval.
3. Sprint 2 = Caregiver search (public SSR, filterable type/city/price/verification) + booking system (request→confirm→complete). CaregiverSearchSchema + BookingRequestSchema already in @riaya/core.
4. Local run unchanged: `docker compose up -d postgres` (5439); export DATABASE_URL + DATABASE_URL_ADMIN; `db:migrate` → `db:seed`; `pnpm dev`.

## SESSION_START — PROJECT INITIALIZED
Sprint: 0 — Ready to start
Status: Fresh project. Framework scaffolded. All S0 tasks pending.
Goal: `pnpm dev` works, signup/login (email + Google OAuth) works,
Postgres+pgvector running with RLS, role isolation proven (family cannot access CIN docs).
Next: Begin S0-01 (pnpm workspace) → S0-06 (pgvector extension) → S0-07 (Auth.js 4 roles)

---

## SESSION_END — 2026-06-14 — SPRINT 1 COMPLETE ✅

Sprint: 1 — DONE (goal met; awaiting Sprint 2 approval)
Completed this session (S1-01..S1-14):
- S1-01 schema: added `notifications` table + `notification_type` enum (recipient/admin-only RLS). Sprint-0 schema already covered the rest. Migrations 0001 (notifications), 0002 (HNSW vector idx), 0003 (caregiver display_name/photo_url).
- S1-02: HNSW index on caregiver_profiles.skill_vector (vector_cosine_ops).
- S1-03: re-verified CIN docs strict RLS (owner+admin); notifications + new cols reviewed.
- S1-04/05/06 backend actions via new `withRoleTx()` (apps/web/src/lib/db.ts = RBAC + withUserContext tx): caregiver (get/create/update), family (profile + add/update/removeChild, children get server UUIDs), employer (create/setBudget/enroll/setEmployeeActive). ActionResult helper (lib/action-result.ts).
- S1-07/08/09/10 frontend: caregiver profile form, family profile + children mgmt, employer account + enrollment, public caregiver SSR page (/[locale]/caregivers/[id] + generateMetadata SEO + VerificationBadge component). Rates handled MAD↔centimes.
- S1-11 idempotent demo seed (packages/db/src/seed.ts, uses authDb): 8 caregivers/4 families/2 employers/3 enrolled; logins demo1234 (sara@/fatima@/drh@demo-corp). Re-run stable.
- S1-12 content: fr/ar/en — care types, verification levels (+descriptions), all profile/employer/public fields.
- S1-13 tests: +4 RLS isolation (family≠edit caregiver, family≠create caregiver-for-other, notification cross-user). Total 21/21.
- S1-14 snapshot: .claude/.logs/sprint-1-snapshot.md.

KEY DECISIONS:
- Denormalized `display_name`+`photo_url` onto caregiver_profiles so public SSR profile never reads the RLS-locked users table (strengthens isolation).
- Route groups don't add URL segments → /profile collision. Fixed by nesting real segment: (caregiver)/caregiver/profile → /caregiver/profile (matches revalidatePath).
- Fixed core schemas ID validators cuid2→uuid.
- ChildRecord type uses `specialNeeds?: string | undefined` (exactOptionalPropertyTypes ON).

VERIFIED: pnpm lint (biome 87 files) clean; pnpm -r typecheck clean; pnpm test 21/21; pnpm --filter @riaya/web build (webpack) passes; fresh-DB migrate(0000-0003)+RLS+seed clean + idempotent.

NOT YET COMMITTED/PUSHED this session — Sprint 1 work is local only. (Sprint 0 was at commit a4c59ae / GREEN CI.)

RESUME INSTRUCTIONS:
1. Invoke orchestrator. SPRINT BOUNDARY — Sprint 1 done. Consider committing+pushing Sprint 1, then get Sprint 2 approval.
2. Sprint 2 = Caregiver search (public SSR, filterable) + booking system (request→confirm→complete). CaregiverSearchSchema + BookingRequestSchema already exist in @riaya/core.
3. Local run: `docker compose up -d postgres` (5439); set DATABASE_URL + DATABASE_URL_ADMIN (migrate/seed/tests don't auto-load .env — export them in shell first); `pnpm --filter @riaya/db db:migrate` then `db:seed`; `pnpm dev`.
4. Carry-forward: caregiver photo upload (R2) not wired (placeholder); updateChild has no UI; enrolled_employees.userId linking deferred; rls.sql non-idempotent (fresh DB to re-migrate).

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

GIT + CI (end of session):
- Repo initialized and pushed to https://github.com/rhorba/riaya (branch main). gh auth = account `rhorba`. git identity: rhorba / mohamedd.rhorba@gmail.com.
- .env is gitignored (verified no secrets committed). .gitignore fixed: COMMIT drizzle/meta (journal needed by migrator in CI); ignore next-env.d.ts + *.stackdump.
- CI is GREEN (run 27427042202). Fixes required to get there (all committed):
  1. ci.yml: removed `version: 10` from pnpm/action-setup (conflicted with packageManager in package.json) — read version from package.json.
  2. migrate.ts: now CREATE EXTENSION IF NOT EXISTS uuid-ossp/vector/pg_trgm (CI postgres service doesn't run sql/init.sql → "type vector does not exist").
  3. Production (webpack) build fixes the dev --turbopack server HID:
     - Deleted apps/web/src/app/page.tsx (root `/` redirect; broke build w/ no root layout; next-intl middleware already redirects / → /fr).
     - next.config.ts: added webpack `extensionAlias` { ".js": [".ts",".tsx",".js"], ".mjs": [...] } so NodeNext .js specifiers resolve under webpack (not just Turbopack).
     - next.config.ts: disabled typedRoutes (incompatible with next-intl locale-less hrefs like "/auth/signup").
- NOTE: `next build` reformats apps/web/tsconfig.json + adds incremental:true, and biome reformats it back — harmless loop; in CI lint runs before build so it stays clean. Latest commit a4c59ae.

RESUME INSTRUCTIONS:
1. Invoke orchestrator. SPRINT BOUNDARY — Sprint 0 done + findings fixed + on GitHub w/ green CI. Get Sprint 1 approval.
2. Sprint 1 = Data model + profiles (caregiver/family/employer) + demo seed. ALL feature data access goes through `db` + withUserContext (NEVER authDb — that's auth/system only).
3. To run locally: `docker compose up -d postgres` (port 5439); set BOTH DATABASE_URL (riaya_app) + DATABASE_URL_ADMIN (superuser); `pnpm --filter @riaya/db db:migrate`; `pnpm dev`. rls.sql not idempotent → reset with `docker compose down -v` before re-migrating a dirty DB.
4. Lesson for Sprint 1+: verify with `pnpm build` (webpack), not just dev/turbopack — prod build catches .js-resolution + layout issues the dev server hides.

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
