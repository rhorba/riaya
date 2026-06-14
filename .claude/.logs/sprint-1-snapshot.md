# Sprint 1 Snapshot — Data Model + Profiles + Demo Seed

**Date:** 2026-06-14 · **Status:** ✅ Goal met (full schema + RLS, 3 profile types, idempotent demo seed)

## Goal (from sprint-1.md)
> Full schema with RLS. Caregiver, family, employer profiles (create/edit/view).
> Idempotent demo seed. Verification badge for all 5 levels. FR + AR. Build/test/lint green.

## Task status
| Task | Status | Notes |
|---|---|---|
| S1-01 full schema + RLS | ✅ | Sprint-0 schema already covered most tables; added `notifications` (+ `notification_type` enum) with recipient/admin-only RLS. Migrations `0001`–`0003`. |
| S1-02 pgvector + indexes | ✅ | `skill_vector` column existed; added HNSW index (`vector_cosine_ops`) for matching. |
| S1-03 RLS review (CIN strict) | ✅ | verification_documents = owner + admin only (unchanged, re-verified by tests). notifications + new columns reviewed. |
| S1-04 caregiver actions | ✅ | (caregiver)/caregiver/profile/actions.ts — get/create/update via `withRoleTx` |
| S1-05 family actions | ✅ | (family)/family/profile/actions.ts — profile + add/update/removeChild (children get server-gen UUIDs) |
| S1-06 employer actions | ✅ | (employer)/employer/account/actions.ts — create/setBudget/enroll/setEmployeeActive |
| S1-07 caregiver UI | ✅ | profile create/edit form: care types, cities, languages, rates (MAD↔centimes), age range |
| S1-08 family UI | ✅ | profile + children management (special-needs confidentiality hint) |
| S1-09 employer UI | ✅ | account create + budget + employee enrollment/toggle |
| S1-10 public caregiver SSR | ✅ | /[locale]/caregivers/[id] — SSR + generateMetadata (SEO) + VerificationBadge |
| S1-11 demo seed | ✅ | idempotent: 8 caregivers / 4 families / 2 employers / 3 enrolled. Logins demo1234. |
| S1-12 FR/AR content | ✅ | care types, verification levels (+descriptions), all profile fields — fr/ar/en |
| S1-13 isolation tests | ✅ | +4 tests: family≠edit caregiver, family≠create caregiver-for-other, notification cross-user isolation |
| S1-14 snapshot | ✅ | this file |

## Verification (this session)
- `pnpm lint` (biome, 87 files) — clean
- `pnpm -r typecheck` (core, db, worker, web) — clean
- `pnpm test` — **21/21 passing** (rbac 7, password 4, RLS isolation 10)
- `pnpm --filter @riaya/web build` (webpack) — passes; routes: /caregiver/profile, /family/profile, /employer/account, /caregivers/[id]
- Fresh DB: `docker compose down -v` → migrate (0000–0003) + RLS + grants clean → seed; re-run seed idempotent (counts stable: 14 users / 8 / 4 / 2 / 3)

## Decisions locked this session
- **Public display denormalization:** added `display_name` + `photo_url` to `caregiver_profiles` so the public SSR profile never reads the RLS-locked `users` table (strengthens isolation; set from user.name at create + in seed).
- **Route groups need real segments:** role groups `(caregiver)/(family)/(employer)` don't add URL path → both "profile" pages collided. Fixed by nesting a real segment: `(caregiver)/caregiver/profile` → `/caregiver/profile` (matches `revalidatePath`).
- **withRoleTx()** (apps/web/src/lib/db.ts) = RBAC + `withUserContext` tx, the standard factory for all feature data access (never `authDb`).
- Fixed `@riaya/core` ID validators `cuid2()` → `uuid()` (IDs are UUIDs).
- ChildRecord type uses `specialNeeds?: string | undefined` (exactOptionalPropertyTypes is ON).
- Seed uses `authDb` (system op, RLS-bypass) — the only sanctioned non-auth use.

## Carry-forward / backlog
- Caregiver photo upload (R2 public bucket) not wired — `photo_url` shows placeholder initial. (Sprint 5 verification/uploads.)
- `updateChild` action exists but no UI yet (remove + re-add covers v0.1).
- Employer↔family `enrolled_employees.userId` linking deferred (cross-user lookup needs admin context). 
- rls.sql still non-idempotent (CREATE POLICY) — fresh DB needed to re-migrate.
