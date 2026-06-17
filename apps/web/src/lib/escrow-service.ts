import "server-only";

import { computeBookingAmount, durationMinutes } from "@riaya/booking";
import { type Money, money } from "@riaya/core";
import {
  type Tx,
  auditLogs,
  bookings,
  caregiverProfiles,
  db,
  employerAccounts,
  enrolledEmployees,
  escrows,
  familyProfiles,
  withUserContext,
} from "@riaya/db";
import { assertEscrowTransition, capSubsidy, computeEscrowAmounts, gateway } from "@riaya/payments";
import { and, eq, sql } from "drizzle-orm";

/**
 * Escrow side-effects of the booking lifecycle (Module E, Sprint 4).
 *
 * Escrow rows are SYSTEM-owned: RLS lets only `is_admin()` insert/update them
 * (defence-in-depth so a compromised family/caregiver action can never move
 * money). These helpers therefore run under an ELEVATED context — the real actor
 * id (for audit attribution) with the role forced to `admin` for the duration of
 * one transaction — so the escrow mutation and its AuditLog commit atomically
 * (Riaya non-negotiable #4).
 *
 * Authorization is already established before any of these run: each is invoked
 * only after the matching booking transition succeeded under the actor's own
 * RLS-scoped context (so they provably own the booking). The escrow flow itself
 * is keyed on `bookingId` (escrows are unique per booking), making every call
 * idempotent — a retry is a no-op once the target state is reached.
 */
function withSystem<T>(actorUserId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withUserContext(db, actorUserId, "admin", fn);
}

async function auditEscrow(
  tx: Tx,
  actorUserId: string,
  escrowId: string,
  action: "create" | "update" | "release" | "refund" | "dispute",
  before: unknown,
  after: unknown
): Promise<void> {
  await tx.insert(auditLogs).values({
    actorUserId,
    entity: "escrow",
    entityId: escrowId,
    action,
    before: before ?? null,
    after: after ?? null,
  });
}

/** Gross (caregiver rate × duration) for a booking, in centimes. */
async function grossForBooking(
  tx: Tx,
  bookingId: string
): Promise<{
  gross: Money;
  booking: typeof bookings.$inferSelect;
} | null> {
  const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) return null;
  const [cg] = await tx
    .select({ hourlyRate: caregiverProfiles.hourlyRate, dailyRate: caregiverProfiles.dailyRate })
    .from(caregiverProfiles)
    .where(eq(caregiverProfiles.id, booking.caregiverId))
    .limit(1);
  const gross = computeBookingAmount(
    { hourlyRate: cg?.hourlyRate ?? null, dailyRate: cg?.dailyRate ?? null },
    durationMinutes(booking.startTime, booking.endTime),
    booking.careType
  );
  return { gross, booking };
}

/**
 * Resolve the employer subsidy for a booking: the active enrolled employee's
 * remaining monthly benefit, capped at what the family owes (`familyGross`) and
 * the employer's per-employee budget. Subsidy is charged to the month the care
 * happens (booking.startTime), matching the monthly invoice sweep.
 */
async function resolveSubsidy(
  tx: Tx,
  booking: typeof bookings.$inferSelect,
  familyGross: Money
): Promise<Money> {
  if (!booking.employerAccountId) return money(0);

  // enrolled_employees.userId links to the family USER; booking.familyId is the
  // family PROFILE id — resolve the profile's user id to find the enrollment.
  const [employee] = await tx
    .select({ monthlyBenefit: enrolledEmployees.monthlyBenefit })
    .from(enrolledEmployees)
    .innerJoin(familyProfiles, eq(enrolledEmployees.userId, familyProfiles.userId))
    .where(
      and(
        eq(enrolledEmployees.employerAccountId, booking.employerAccountId),
        eq(familyProfiles.id, booking.familyId),
        eq(enrolledEmployees.active, true)
      )
    )
    .limit(1);

  if (!employee) return money(0);

  const year = booking.startTime.getUTCFullYear();
  const month = booking.startTime.getUTCMonth(); // 0–11
  const [used] = await tx
    .select({ total: sql<number>`coalesce(sum(${escrows.employerSubsidy}), 0)` })
    .from(escrows)
    .innerJoin(bookings, eq(escrows.bookingId, bookings.id))
    .where(
      and(
        eq(bookings.employerAccountId, booking.employerAccountId),
        eq(bookings.familyId, booking.familyId),
        sql`extract(year from ${bookings.startTime}) = ${year}`,
        sql`extract(month from ${bookings.startTime}) - 1 = ${month}`
      )
    );

  const remaining = money(Math.max(0, employee.monthlyBenefit - Number(used?.total ?? 0)));
  return capSubsidy(remaining, remaining, familyGross);
}

/**
 * Authorize-on-confirm. Pre-authorizes the family's payment and creates the
 * escrow in `authorized` state, applying any employer subsidy and deducting it
 * from the employer's running budget. No-op if an escrow already exists.
 */
export async function authorizeEscrowForBooking(
  actorUserId: string,
  bookingId: string
): Promise<void> {
  await withSystem(actorUserId, async (tx) => {
    const existing = await tx
      .select({ id: escrows.id })
      .from(escrows)
      .where(eq(escrows.bookingId, bookingId))
      .limit(1);
    if (existing.length > 0) return; // already authorized — idempotent

    const found = await grossForBooking(tx, bookingId);
    if (!found) return;
    const { gross, booking } = found;

    // Provisional split (no subsidy) to learn familyGross, then resolve subsidy.
    const provisional = computeEscrowAmounts(gross);
    const subsidy = await resolveSubsidy(tx, booking, provisional.familyGross);
    const amounts = computeEscrowAmounts(gross, subsidy);

    const session = await gateway.authorize(amounts.familyPays, bookingId, "/family/bookings");
    assertEscrowTransition("pending", "authorized");

    const [created] = await tx
      .insert(escrows)
      .values({
        bookingId: booking.id,
        familyId: booking.familyId,
        caregiverId: booking.caregiverId,
        grossAmount: amounts.grossAmount,
        employerSubsidy: amounts.employerSubsidy,
        familyPays: amounts.familyPays,
        platformFeeFromFamily: amounts.platformFeeFromFamily,
        platformFeeFromCaregiver: amounts.platformFeeFromCaregiver,
        caregiverPayout: amounts.caregiverPayout,
        status: "authorized",
        gatewayRef: session.gatewayRef,
        authorizedAt: new Date(),
      })
      .returning({ id: escrows.id });
    if (!created) return;

    if (subsidy > 0 && booking.employerAccountId) {
      await tx
        .update(employerAccounts)
        .set({ totalBudgetUsed: sql`${employerAccounts.totalBudgetUsed} + ${subsidy}` })
        .where(eq(employerAccounts.id, booking.employerAccountId));
    }

    await auditEscrow(tx, actorUserId, created.id, "create", null, {
      status: "authorized",
      grossAmount: amounts.grossAmount,
      familyPays: amounts.familyPays,
      employerSubsidy: amounts.employerSubsidy,
      caregiverPayout: amounts.caregiverPayout,
    });
  });
}

/** Capture-on-start. Captures the pre-authorized charge when the session begins. */
export async function captureEscrowForBooking(
  actorUserId: string,
  bookingId: string
): Promise<void> {
  await withSystem(actorUserId, async (tx) => {
    const [escrow] = await tx
      .select()
      .from(escrows)
      .where(eq(escrows.bookingId, bookingId))
      .limit(1);
    if (!escrow || escrow.status !== "authorized") return; // idempotent / nothing to do

    assertEscrowTransition("authorized", "captured");
    await gateway.capture(escrow.gatewayRef ?? bookingId, money(escrow.familyPays));

    await tx
      .update(escrows)
      .set({ status: "captured", capturedAt: new Date() })
      .where(eq(escrows.id, escrow.id));
    await auditEscrow(
      tx,
      actorUserId,
      escrow.id,
      "update",
      { status: "authorized" },
      { status: "captured" }
    );
  });
}

/**
 * Open the 24h dispute window on session completion. The escrow stays `captured`;
 * the `escrow.sweep` job releases it to the caregiver once the window passes.
 */
export async function openDisputeWindowForBooking(
  actorUserId: string,
  bookingId: string,
  disputeWindowHours = 24
): Promise<void> {
  await withSystem(actorUserId, async (tx) => {
    const [escrow] = await tx
      .select()
      .from(escrows)
      .where(eq(escrows.bookingId, bookingId))
      .limit(1);
    if (!escrow || escrow.status !== "captured" || escrow.disputeWindowEndsAt) return;

    const endsAt = new Date(Date.now() + disputeWindowHours * 60 * 60 * 1000);
    await tx.update(escrows).set({ disputeWindowEndsAt: endsAt }).where(eq(escrows.id, escrow.id));
    await auditEscrow(tx, actorUserId, escrow.id, "update", null, {
      disputeWindowEndsAt: endsAt.toISOString(),
    });
  });
}

/**
 * Release-on-both-reviews. Releases a `captured` escrow to the caregiver as soon
 * as BOTH parties have reviewed — the "both reviews" branch of "both reviews OR
 * 24h" (Riaya non-negotiable #6). The `escrow.sweep` worker is the 24h fallback;
 * whichever fires first wins. Guarded on `status === 'captured'` so the two paths
 * never double-pay. Returns the payee + amount so the caller can notify.
 */
export async function releaseEscrowForBooking(
  actorUserId: string,
  bookingId: string
): Promise<{ released: boolean; caregiverUserId: string | null; payout: Money }> {
  return withSystem(actorUserId, async (tx) => {
    const [escrow] = await tx
      .select()
      .from(escrows)
      .where(eq(escrows.bookingId, bookingId))
      .limit(1);
    if (!escrow || escrow.status !== "captured") {
      return { released: false, caregiverUserId: null, payout: money(0) };
    }

    assertEscrowTransition("captured", "released");
    await gateway.payout(
      money(escrow.caregiverPayout),
      { accountRef: "dev_rib", holderName: "caregiver" },
      escrow.id
    );

    // Guarded update: a concurrent worker sweep that already released this escrow
    // makes this a no-op (no double payout).
    const updated = await tx
      .update(escrows)
      .set({ status: "released", releasedAt: new Date() })
      .where(and(eq(escrows.id, escrow.id), eq(escrows.status, "captured")))
      .returning({ id: escrows.id });
    if (updated.length === 0) {
      return { released: false, caregiverUserId: null, payout: money(0) };
    }

    await auditEscrow(
      tx,
      actorUserId,
      escrow.id,
      "release",
      { status: "captured" },
      { status: "released", payout: escrow.caregiverPayout }
    );

    const [cg] = await tx
      .select({ userId: caregiverProfiles.userId })
      .from(caregiverProfiles)
      .where(eq(caregiverProfiles.id, escrow.caregiverId))
      .limit(1);

    return {
      released: true,
      caregiverUserId: cg?.userId ?? null,
      payout: money(escrow.caregiverPayout),
    };
  });
}

/**
 * Refund-on-cancel. Releases the pre-auth and refunds the family. If a
 * cancellation fee applies, that portion is captured and kept as caregiver
 * compensation (recorded on `cancellationFee`); the remainder is refunded.
 * No-op if there is no escrow (e.g. a still-`requested` booking).
 */
export async function refundEscrowForBooking(
  actorUserId: string,
  bookingId: string,
  cancellationFee: Money
): Promise<void> {
  await withSystem(actorUserId, async (tx) => {
    const [escrow] = await tx
      .select()
      .from(escrows)
      .where(eq(escrows.bookingId, bookingId))
      .limit(1);
    if (!escrow || escrow.status !== "authorized") return;

    assertEscrowTransition("authorized", "refunded");
    const ref = escrow.gatewayRef ?? bookingId;
    const fee = money(Math.min(cancellationFee, escrow.familyPays));
    const refundAmount = money(escrow.familyPays - fee);

    if (fee > 0) await gateway.capture(ref, fee);
    if (refundAmount > 0) await gateway.refund(ref, refundAmount, "booking_cancelled");

    await tx
      .update(escrows)
      .set({ status: "refunded", cancellationFee: fee })
      .where(eq(escrows.id, escrow.id));
    await auditEscrow(
      tx,
      actorUserId,
      escrow.id,
      "refund",
      { status: "authorized" },
      { status: "refunded", cancellationFee: fee, refunded: refundAmount }
    );
  });
}

/**
 * Hold escrow when a dispute is raised. Moves escrow captured→disputed so funds
 * are frozen until admin resolution. No-op if escrow is not in captured state.
 */
export async function holdEscrowForDispute(actorUserId: string, bookingId: string): Promise<void> {
  await withSystem(actorUserId, async (tx) => {
    const [escrow] = await tx
      .select()
      .from(escrows)
      .where(eq(escrows.bookingId, bookingId))
      .limit(1);
    if (!escrow || escrow.status !== "captured") return;

    assertEscrowTransition("captured", "disputed");
    await tx
      .update(escrows)
      .set({ status: "disputed" })
      .where(and(eq(escrows.id, escrow.id), eq(escrows.status, "captured")));
    await auditEscrow(
      tx,
      actorUserId,
      escrow.id,
      "dispute",
      { status: "captured" },
      {
        status: "disputed",
      }
    );
  });
}
