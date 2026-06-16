"use server";

import { type ActionResult, fail, ok } from "@/lib/action-result";
import { auditBooking, confirmSessionEnd } from "@/lib/booking-shared";
import { withRoleTx } from "@/lib/db";
import {
  captureEscrowForBooking,
  openDisputeWindowForBooking,
  refundEscrowForBooking,
} from "@/lib/escrow-service";
import {
  assertTransition,
  checkAvailability,
  computeBookingAmount,
  computeCancellationFee,
  durationMinutes,
  hoursUntil,
} from "@riaya/booking";
import { BookingRequestSchema, money } from "@riaya/core";
import { bookings, caregiverProfiles, enrolledEmployees, escrows, familyProfiles } from "@riaya/db";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/** A booking row enriched with the caregiver's name + this booking's escrow. */
export type FamilyBooking = typeof bookings.$inferSelect & {
  caregiverName: string;
  /** Payment summary from the escrow (null until the caregiver confirms). */
  escrow: {
    status: (typeof escrows.$inferSelect)["status"];
    familyPays: number;
    employerSubsidy: number;
    cancellationFee: number;
  } | null;
};

/** List the signed-in family's bookings (newest first) with caregiver + escrow. */
export const getMyBookings = withRoleTx(["family"], async (tx, user): Promise<FamilyBooking[]> => {
  const [profile] = await tx
    .select({ id: familyProfiles.id })
    .from(familyProfiles)
    .where(eq(familyProfiles.userId, user.id))
    .limit(1);
  if (!profile) return [];

  const rows = await tx
    .select({
      booking: bookings,
      caregiverName: caregiverProfiles.displayName,
      escrowStatus: escrows.status,
      familyPays: escrows.familyPays,
      employerSubsidy: escrows.employerSubsidy,
      cancellationFee: escrows.cancellationFee,
    })
    .from(bookings)
    .innerJoin(caregiverProfiles, eq(bookings.caregiverId, caregiverProfiles.id))
    .leftJoin(escrows, eq(escrows.bookingId, bookings.id))
    .where(eq(bookings.familyId, profile.id))
    .orderBy(desc(bookings.createdAt));

  return rows.map((r) => ({
    ...r.booking,
    caregiverName: r.caregiverName,
    escrow:
      r.escrowStatus == null
        ? null
        : {
            status: r.escrowStatus,
            familyPays: r.familyPays ?? 0,
            employerSubsidy: r.employerSubsidy ?? 0,
            cancellationFee: r.cancellationFee ?? 0,
          },
  }));
});

/**
 * Family requests a booking. Validates the caregiver offers the care type, can
 * take this many children, and is free for the window (app-level check; the
 * `bookings_no_overlap` constraint is the hard guarantee at confirm time).
 */
export const requestBooking = withRoleTx(
  ["family"],
  async (tx, user, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = BookingRequestSchema.safeParse(input);
    if (!parsed.success) return fail("invalidInput");
    const data = parsed.data;

    const [profile] = await tx
      .select({ id: familyProfiles.id })
      .from(familyProfiles)
      .where(eq(familyProfiles.userId, user.id))
      .limit(1);
    if (!profile) return fail("profileNotFound");

    const [caregiver] = await tx
      .select({
        id: caregiverProfiles.id,
        careTypes: caregiverProfiles.careTypes,
        maxChildren: caregiverProfiles.maxChildren,
      })
      .from(caregiverProfiles)
      .where(eq(caregiverProfiles.id, data.caregiverId))
      .limit(1);
    if (!caregiver) return fail("caregiverNotFound");
    if (!caregiver.careTypes.includes(data.careType)) return fail("careTypeNotOffered");
    if (data.childrenCount > caregiver.maxChildren) return fail("tooManyChildren");

    const availability = await checkAvailability(tx, caregiver.id, data.startTime, data.endTime);
    if (!availability.available) {
      return fail(availability.reason === "in_past" ? "startInPast" : "slotUnavailable");
    }

    // If this family's user is an active enrolled employee, tag the booking with
    // their employer so the escrow can apply the subsidy at confirm time. RLS lets
    // a family read their own enrollment row (enrolled.user_id = app_user()).
    const [enrollment] = await tx
      .select({ employerAccountId: enrolledEmployees.employerAccountId })
      .from(enrolledEmployees)
      .where(and(eq(enrolledEmployees.userId, user.id), eq(enrolledEmployees.active, true)))
      .limit(1);

    const [created] = await tx
      .insert(bookings)
      .values({
        caregiverId: caregiver.id,
        familyId: profile.id,
        employerAccountId: enrollment?.employerAccountId ?? null,
        careType: data.careType,
        startTime: data.startTime,
        endTime: data.endTime,
        locationNote: data.locationNote,
        childrenCount: data.childrenCount,
        familyNotes: data.familyNotes,
        urgent: data.urgent,
        status: "requested",
      })
      .returning({ id: bookings.id });
    if (!created) return fail("createFailed");

    await auditBooking(tx, user.id, created.id, "create", null, { status: "requested" });

    revalidatePath("/family/bookings");
    return ok({ id: created.id });
  }
);

/** Family marks a confirmed session as started → in_progress; captures the escrow. */
const startSessionTx = withRoleTx(
  ["family"],
  async (tx, user, bookingId: string): Promise<ActionResult<{ actorId: string }>> => {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking) return fail("bookingNotFound");
    if (booking.status !== "confirmed") return fail("invalidState");
    assertTransition("confirmed", "in_progress");

    await tx
      .update(bookings)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));
    await auditBooking(
      tx,
      user.id,
      bookingId,
      "update",
      { status: "confirmed" },
      { status: "in_progress" }
    );

    return ok({ actorId: user.id });
  }
);

export async function startSession(bookingId: string): Promise<ActionResult> {
  const res = await startSessionTx(bookingId);
  if (!res.ok) return res;
  await captureEscrowForBooking(res.data.actorId, bookingId);
  revalidatePath("/family/bookings");
  return ok(undefined);
}

/** Family confirms the session ended (completes when the caregiver also confirms). */
const familyConfirmEndTx = withRoleTx(
  ["family"],
  async (
    tx,
    user,
    bookingId: string
  ): Promise<ActionResult<{ completed: boolean; actorId: string }>> => {
    const result = await confirmSessionEnd(tx, user, bookingId, "family");
    if (!result.ok) return result;
    return ok({ completed: result.data.completed, actorId: user.id });
  }
);

export async function familyConfirmEnd(bookingId: string): Promise<ActionResult> {
  const res = await familyConfirmEndTx(bookingId);
  if (!res.ok) return res;
  if (res.data.completed) await openDisputeWindowForBooking(res.data.actorId, bookingId);
  revalidatePath("/family/bookings");
  return ok(undefined);
}

/**
 * Family cancels a requested or confirmed booking. Cancelling a still-`requested`
 * booking is always free. Cancelling a `confirmed` booking applies the caregiver's
 * cancellation policy: free if outside the policy window, otherwise a fee (% of
 * the estimated gross). The fee is computed here; the escrow is then unwound
 * (fee captured as caregiver compensation, remainder refunded to the family).
 */
const cancelBookingTx = withRoleTx(
  ["family"],
  async (
    tx,
    user,
    bookingId: string,
    reason: string
  ): Promise<ActionResult<{ fee: number; wasConfirmed: boolean; actorId: string }>> => {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking) return fail("bookingNotFound");
    if (booking.status !== "requested" && booking.status !== "confirmed") {
      return fail("invalidState");
    }
    assertTransition(booking.status, "cancelled");
    const wasConfirmed = booking.status === "confirmed";

    let fee = 0;
    if (booking.status === "confirmed") {
      const [caregiver] = await tx
        .select({
          hourlyRate: caregiverProfiles.hourlyRate,
          dailyRate: caregiverProfiles.dailyRate,
          freeHours: caregiverProfiles.cancellationFreeHours,
          feePercent: caregiverProfiles.cancellationFeePercent,
        })
        .from(caregiverProfiles)
        .where(eq(caregiverProfiles.id, booking.caregiverId))
        .limit(1);
      if (caregiver) {
        const gross = computeBookingAmount(
          { hourlyRate: caregiver.hourlyRate, dailyRate: caregiver.dailyRate },
          durationMinutes(booking.startTime, booking.endTime),
          booking.careType
        );
        fee = computeCancellationFee(
          { freeHours: caregiver.freeHours, feePercent: caregiver.feePercent },
          gross,
          hoursUntil(booking.startTime)
        );
      }
    }

    await tx
      .update(bookings)
      .set({
        status: "cancelled",
        cancelReason: reason.slice(0, 500) || "cancelled_by_family",
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));
    await auditBooking(
      tx,
      user.id,
      bookingId,
      "cancel",
      { status: booking.status },
      { status: "cancelled", cancellationFee: fee }
    );

    return ok({ fee, wasConfirmed, actorId: user.id });
  }
);

export async function cancelBooking(
  bookingId: string,
  reason: string
): Promise<ActionResult<{ fee: number }>> {
  const res = await cancelBookingTx(bookingId, reason);
  if (!res.ok) return res;
  // Only a confirmed booking has an authorized escrow to unwind; a still-requested
  // cancel is free and escrow-less.
  if (res.data.wasConfirmed) {
    await refundEscrowForBooking(res.data.actorId, bookingId, money(res.data.fee));
  }
  revalidatePath("/family/bookings");
  return ok({ fee: res.data.fee });
}
