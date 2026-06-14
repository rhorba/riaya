# Sprint 2 Snapshot — Caregiver Search + Booking System

**Date:** 2026-06-14 · **Status:** ✅ Goal met (public SSR search + full booking lifecycle request→confirm→in_progress→completed, DB-enforced no-double-booking)

## Goal (from sprint-2.md)
> Public caregiver search (SSR, filterable). Booking request → confirm → complete loop.

## Task status
| Task | Status | Notes |
|---|---|---|
| S2-01 UX (search + card + booking flow) | ✅ | Implemented directly: mobile-first card (safety badge dominant), no-JS GET filter form, request form, inbox, tracker. |
| S2-02 public search (SSR, filterable) | ✅ | `/[locale]/(public)/search` — filter by careType / city (ILIKE on neighborhoods) / max hourly rate / min verification (ordered "at least"); pagination; `generateMetadata`. Public read via `caregiver_read` RLS `USING(true)` — no auth. |
| S2-03 booking request action | ✅ | `requestBooking` (family): validates care type offered, child count ≤ maxChildren, availability; inserts `requested` + audit. |
| S2-04 booking engine (`checkAvailability` + state machine) | ✅ | `packages/booking`: `state-machine.ts` (transition table + `canTransition`/`assertTransition`/`actorCanTransition`), `availability.ts` (overlap check vs confirmed/in_progress), `pricing.ts` (estimate). |
| S2-05 accept / decline | ✅ | `acceptBooking` / `declineBooking` (caregiver): re-checks availability, transitions, audit. |
| S2-06 session start / end (both parties) | ✅ | `startSession` (family → in_progress); `confirmSessionEnd` shared helper — completes only when BOTH `family_ended_at` + `caregiver_ended_at` set. |
| S2-07 booking request form | ✅ | date + start/end time + children + location + notes + urgent; live price estimate via `@riaya/booking/pricing`. |
| S2-08 caregiver inbox | ✅ | accept / decline-with-reason / confirm-end; shows count, type, time, notes (NO family identity / children PII). |
| S2-09 family tracker | ✅ | status badge + start session / confirm end / cancel. |
| S2-10 FR/AR/EN content | ✅ | `search`, `booking`, `bookingStatus`, `bookingErrors` namespaces + nav links (fr/ar/en). |
| S2-11 RBAC + state machine + concurrency tests | ✅ | see below. |
| S2-12 snapshot | ✅ | this file. |

## Verification (this session)
- `pnpm lint` (biome, 106 files) — clean
- `pnpm -r typecheck` (core, db, booking, worker, web) — clean
- `pnpm test` — **43/43 passing** (rbac 7, password 4, RLS 10, state-machine 8, pricing 6, booking-RLS 5, availability 3)
- `pnpm --filter @riaya/web build` (webpack) — passes; new routes `/search`, `/family/book/[caregiverId]`, `/family/bookings`, `/caregiver/bookings`
- Fresh DB: `docker compose down -v` → migrate (**0000–0004**) + RLS + grants clean → seed (8/4/2/3)

## Decisions locked this session
- **No-double-booking is DB-enforced.** Migration `0004` adds a GiST `EXCLUDE` constraint `bookings_no_overlap` (`caregiver_id WITH =, tstzrange(start,end) WITH &&) WHERE status IN ('confirmed','in_progress')` + `btree_gist` extension. `requested` bookings may overlap (many families request one slot); only one can be confirmed. App-level `checkAvailability` is the friendly pre-check; the constraint is the hard race backstop. Tested.
- **Session end needs both parties.** Added `family_ended_at` / `caregiver_ended_at` columns (migration 0004); `in_progress → completed` fires on the 2nd confirmation. Strict state machine (`assertTransition`) on every transition; AuditLog written in the same tx (non-negotiable #4).
- **Booking-engine barrel split.** `@riaya/booking` index re-exports `availability` (which imports `@riaya/db` → `postgres`, Node-only). Client components must import pure helpers from the `@riaya/booking/pricing` subpath, never the barrel, or the webpack client bundle breaks on `tls`/`fs`. Subpath exports added.
- **Availability visibility is role-scoped (privacy by design).** Under family context `checkAvailability` only sees the family's own conflicts (RLS hides other families' bookings) → families don't learn a caregiver's other clients; the authoritative check runs under caregiver context at accept time + the exclusion constraint. Availability test runs under caregiver context.
- **Caregiver inbox never exposes family identity / children PII** — only booking facts (count/type/time/notes). RLS `family_select` already blocks the join.
- In-app notification **rows** (Module H) intentionally NOT created here (Sprint 5) — keeps every booking mutation inside the actor's own RLS-scoped tx (no cross-user insert / no `authDb`). Inbox + tracker are the Sprint 2 surfaces.

## Carry-forward / backlog
- Availability **calendar** (caregiver-set slots) is Sprint 3 — `checkAvailability` currently only enforces no-overlap, not published slots. `availability_slots` table + RLS already exist, unused.
- Cancellation **policy/fee** (booking-engine SKILL) not applied on cancel — Sprint 4 (payments).
- AI matching (pgvector) — Sprint 3.
- `drizzle-kit generate` has no `0004` snapshot (0004 is hand-written: EXCLUDE constraint isn't expressible in Drizzle). A future `generate` may try to re-add the two columns — regenerate against a 0004 snapshot or keep migrations hand-authored.
- `rls.sql` still non-idempotent — fresh DB needed to re-migrate (unchanged from S1).
- Build + migrate/seed/tests need `DATABASE_URL` exported in the shell (no dotenv autoload); Next build loads `.env` only if present in `apps/web`.
