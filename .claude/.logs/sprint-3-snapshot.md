# Sprint 3 Snapshot — Availability Calendar + Booking State Machine + AI Matching

**Date:** 2026-06-15 · **Status:** ✅ Goal met (caregiver availability calendar, slot-aware booking, cancellation policy, pgvector AI matching, 1h reminder job)

## Goal (from sprint-3-4.md)
> Availability calendar (caregiver-set slots) + booking state machine integration + AI matching (pgvector). Extend `checkAvailability` to honor published slots.

## Task status
| Task | Status | Notes |
|---|---|---|
| S3-01 availability slot CRUD (weekly + date overrides) | ✅ | `packages/booking/src/slots.ts` (PURE: `slotsForDate`, `windowCovered`, `openRangesForDate`, `slotsOverlap`, time helpers). CRUD via `(caregiver)/caregiver/availability/actions.ts`. Date-specific override fully replaces weekly slots for that date (block a day / special hours). |
| S3-02 caregiver availability calendar editor | ✅ | `(caregiver)/caregiver/availability/` (page + `availability-editor.tsx`): weekly grid toggle + date overrides. New route built (`/caregiver/availability`). |
| S3-03 family-side availability picker | ✅ | Booking request form shows caregiver open ranges via `openRangesForDate` (imported from `@riaya/booking/slots` subpath — client-safe, no `@riaya/db`). |
| S3-04 `computeBookingAmount()` | ✅ | `packages/booking/src/pricing.ts` (from Sprint 2) — rates + duration + care type. |
| S3-05 cancellation policy enforcement | ✅ | `packages/booking/src/cancellation.ts` (`computeCancellationFee`, `DEFAULT_CANCELLATION_POLICY` = 24h free / 50% fee). Caregiver sets `cancellationFreeHours`/`cancellationFeePercent` in profile; family cancel action reads policy + computes fee (money movement deferred to Sprint 4 escrow). |
| S3-06 caregiver embeddings + `searchCaregivers()` | ✅ | `packages/matching/src/embedding.ts` (deterministic feature-hashing, 384-dim, FNV-1a, L2-normalized, FR+AR token-safe), `search.ts` (pgvector cosine `<=>`), `backfill.ts` (`db:embed`). |
| S3-07 match/relevance score in results | ✅ | `search.ts` returns `{id, score}` (1 - cosine distance); search page maps relevance, preserves order through `IN()` lookup. |
| S3-08 `booking.reminder` job (1h before) | ✅ | `apps/worker/src/reminders.ts` (`sendBookingReminders`) — confirmed bookings starting ≤1h, not yet reminded; inserts PII-free `booking_reminder` notification for family + caregiver; sets `reminder_sent_at` (idempotent). Worker schedules `*/5 * * * *`. |
| S3-09 FR/AR/EN content | ✅ | `availability` namespace + `cancellationPolicy`/`cancellationFreeHours`/`cancellationFeePercent`/`cancellationHint` in all 3 locales; top-level key parity verified. |
| S3-10 tests | ✅ | +35 tests — see below. |
| S3-11 snapshot | ✅ | this file. |

## Verification (this session)
- `pnpm lint` (biome, 118 files) — clean
- `pnpm -r typecheck` (9 projects) — clean
- `pnpm test` — **78/78 passing** (was 43 at S2): +slots 14, +embedding 10, +cancellation 8, +pricing 3
- `pnpm --filter @riaya/web build` (webpack) — passes; new route `/caregiver/availability`
- Fresh DB: `docker compose down -v` → migrate (**0000–0005**) + RLS + grants → seed (8/4/2) → `db:embed` (8 vectors). All 8 caregivers embedded; free-text search returns ranked results.

## Decisions locked this session
- **Embedding is deterministic feature-hashing, not a model.** Pure, dependency-free, no network — runs identically in CI / seed / query time, unit-testable for determinism. 384-dim to match `caregiver_profiles.skill_vector`. A real sentence-transformer is a v0.2 swap behind the same `embedCaregiver`/`embedQuery` interface. Care-type tokens weighted ×3.
- **Vector search is opt-in, not a regression.** Free-text `?q=` → pgvector relevance ranking; empty `q` → the Sprint 2 structured browse (verified + highest-rated, paginated). Structured filters (careType/city/rate/verification) AND into the vector query via `where`.
- **Embeddings require a backfill step.** Added root `db:embed` (`@riaya/matching db:embed`) + `db:setup` = `migrate && seed && embed`. `seed.ts` does NOT import `@riaya/matching` (would create a db↔matching package cycle); backfill is a separate post-seed script. **A fresh seed without `db:embed` leaves free-text search empty.**
- **Slot override semantics:** a date-specific override row set replaces the weekly recurring slots for that date (so a caregiver can block a day or set special hours); with no override, the weekday's recurring slots apply.
- **Reminder sweep uses `authDb`** (system task, no per-user RLS context) and writes notifications cross-user; bodies are PII-free (no child names, no cross-party identity) per non-negotiable #2. Idempotent via `reminder_sent_at`.
- **Cancellation fee is computed, not charged, in Sprint 3** — money movement (escrow capture/refund) lands in Sprint 4.

## Carry-forward / backlog
- **Reminder notification body is hardcoded French** (`reminders.ts`) — notification rows carry no per-user locale. Acceptable for v0.1 (reminders are the first notification surface); localize when notification rendering is locale-aware.
- **`db:embed` must follow `db:seed`** on every fresh DB (use `pnpm db:setup`). CI/deploy seed steps must include it or free-text search returns empty.
- Migration `0005_sprint3_availability.sql` is in the journal (idx 5) — adds `caregiver_profiles.cancellation_free_hours`/`cancellation_fee_percent` + `bookings.reminder_sent_at`.
- `0004` still has no drizzle snapshot (hand-written EXCLUDE) — a future `generate` may try to re-add 0004 columns. Unchanged from S2.
- `rls.sql` still non-idempotent — re-migrating a live DB fails at the RLS step (40 bare `CREATE POLICY`); use `docker compose down -v` for a clean cycle. Unchanged.
- Build + migrate/seed/embed/tests need `DATABASE_URL` + `DATABASE_URL_ADMIN` exported (no dotenv autoload).
- Cancellation fee + employer subsidy + escrow → Sprint 4.
