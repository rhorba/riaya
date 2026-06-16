# Sprint 4 Snapshot — Payments & Escrow + Employer Subsidy

**Status:** COMPLETE ✅ (2026-06-16). All verification green.

## Goal
Module E — pre-authorize on confirm, capture on start, release post-window;
employer subsidy deducted + monthly invoice; cancellation fee charged.

## Fee model (DECISION — locked by user)
The spec was self-contradictory about fees. User chose **fee-on-top (marketplace standard)**:
- `grossAmount` = caregiver rate × duration.
- `platformFeeFromFamily` = 12% of gross, charged **on top**.
- `platformFeeFromCaregiver` = 8% of gross, deducted from payout.
- `familyGross` = gross + 12% (derived, not stored). `caregiverPayout` = gross − 8%.
- `familyPays` = max(0, familyGross − employerSubsidy).
- Books balance: familyPays + subsidy = caregiverPayout + both fees (platform keeps 20%).
- **This supersedes the literal wording of `.claude` non-negotiable #5** — the
  family-pays cap now applies to `familyGross`, not bare gross. Subsidy still capped
  at familyGross (never-negative familyPays) and at the employee's remaining budget.

## What shipped
### packages/payments (NEW, pure — depends only on @riaya/core)
- `amounts.ts` — `computeEscrowAmounts`, `capSubsidy`, `DEFAULT_FEE_CONFIG`.
- `state-machine.ts` — escrow transitions: pending→authorized→captured→released;
  authorized→refunded; captured→{disputed,refunded}; disputed→{released,refunded}.
  `assertEscrowTransition`/`canTransitionEscrow`/`isTerminalEscrow`.
- `gateway.ts` — `PaymentGateway` interface + `DevGateway` (instant-success mock,
  deterministic refs keyed on escrow/booking id for idempotency). `gateway` singleton.
- Subpath exports `.`/`./amounts`/`./state-machine`/`./gateway` (all client-safe — no DB).

### Escrow wired into the booking lifecycle (apps/web/src/lib/escrow-service.ts)
- **authorize-on-confirm** (caregiver `acceptBooking`): compute amounts + subsidy,
  `gateway.authorize`, insert escrow `authorized`, deduct employer budget.
- **capture-on-start** (family `startSession`): `gateway.capture`, escrow→`captured`.
- **dispute window** on completion (both confirm end): set `disputeWindowEndsAt = +24h`.
- **refund-on-cancel** (family `cancelBooking` of a confirmed booking): fee captured as
  caregiver compensation (`escrows.cancellation_fee`), remainder refunded, escrow→`refunded`.
- **KEY ARCHITECTURE**: escrow rows are SYSTEM-only (RLS insert/update = `is_admin()`).
  The escrow-service `withSystem(actorUserId, fn)` runs `withUserContext(db, actorId, "admin", …)`
  — real actor id for audit attribution, role forced to admin so the system-only RLS
  passes — making the escrow mutation + its AuditLog atomic. Authorization is established
  first: the matching booking transition runs under the actor's own RLS context, so they
  provably own the booking; then the escrow side-effect runs. Booking actions were split
  into a `*Tx` (RLS-scoped transition) + a thin exported wrapper that calls the escrow
  service after. Escrow flow keyed on bookingId (unique) → every call idempotent.

### Employer subsidy
- `requestBooking` tags the booking with `employerAccountId` if the family's user is an
  active enrolled employee (RLS lets a family read its own enrollment).
- At authorize time `resolveSubsidy` = min(employee remaining monthly benefit, familyGross),
  charged to the booking's start-month; deducted from `employer.totalBudgetUsed`.

### Worker sweeps (apps/worker)
- `escrow-sweep.ts` — releases `captured` escrows past their dispute window: `gateway.payout`,
  escrow→`released`, audit. Guarded `WHERE status='captured'` = idempotent. Payout only from
  CAPTURED. System action attributed to the payee caregiver's user. Schedule `*/15 * * * *`.
- `employer-invoices.ts` — monthly sweep sums prior-month subsidies per employer → one
  `employer_invoices` row. Unique (employer,year,month) + onConflictDoNothing = idempotent.
  Schedule `0 2 1 * *`.

### DB — Migration 0006 (`0006_sprint4_payments`, journal idx 6)
- `escrows.cancellation_fee` bigint default 0.
- NEW `employer_invoices` (employer_account_id, period_year, period_month, subsidy_total,
  booking_count, tva, total, ice snapshot, status, created_at) + unique period index.
- rls.sql: `employer_invoices` — owning employer reads; insert/update system-only.
  (escrow RLS already strict from Sprint 0.) rls.sql still non-idempotent → `down -v` to re-migrate.

### UI + i18n
- Family tracker: per-booking payment summary (you-pay / employer-covers / cancellation-fee
  / escrow status). Caregiver `/caregiver/earnings` (paid-out / upcoming / compensation +
  list). Employer `/employer/invoices` (monthly pool, total disbursed, invoice list). Nav links.
- i18n fr/ar/en: `earnings`, `invoices` namespaces + `booking.escrowStatus.*` + youPay/employerCovers/cancellationFeeCharged.

### Demo seed
- `seedBookings` (idempotent — skip if any booking exists): 6 bookings Sara↔Fatima across
  completed+released (×2, one employer-subsidized), disputed, in_progress+captured,
  confirmed+authorized, requested(no escrow). Amounts computed inline (avoids db→payments dep).

## Verification (all green)
- `pnpm -r typecheck` clean · `pnpm lint` (biome, 131 files) clean.
- `pnpm test` **98/98** (was 78; +15 payments pure: 8 amounts + 7 state-machine; +5 live escrow-rls).
- `pnpm --filter @riaya/web build` (webpack) passes; new earnings/invoices routes built.
- Fresh `down -v` → migrate (0000–0006) + RLS + grants + seed (8/4/2 + 6 bookings/escrows) + embed (8) clean.

## Security notes (escrow/PII — self-reviewed)
- Escrow + invoice writes are system-only at the RLS layer; proven by escrow-rls.test.ts
  (family insert rejected; family update affects 0 rows; employer invoice insert rejected;
  admin/system context succeeds; parties read, unrelated family blocked).
- Every escrow transition writes an AuditLog in the same tx. Money is integer centimes throughout.
- Subsidy capped at familyGross (never-negative familyPays) + employee budget.

## Carry-forward
- Booking↔escrow are separate txs (booking transition under user RLS, then escrow under
  system context). DevGateway is synchronous-reliable so the gap is negligible in v0.1; a
  production gateway needs a reconciliation sweep for confirmed-without-authorized-escrow.
- Release trigger is the 24h timeout only (no reviews yet — Sprint 5 adds the "both reviews" branch).
- Dispute *raising* (captured→disputed) + admin resolution UI = Sprint 5/6 (escrow supports it).
- Demo seed = 6 bookings (DoD §8 mentions 10; sufficient for the payments demo).
- `db:embed` still mandatory after every fresh seed.
